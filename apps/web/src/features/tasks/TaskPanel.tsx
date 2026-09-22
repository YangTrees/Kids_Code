import { useEffect, useMemo, useState } from "react";
import { useEditorStore } from "../editor/editor-store";
import { useEditorRuntime } from "../editor/EditorRuntimeContext";
import {
  creationTasks,
  evaluateCreationTask,
  getAssignedTaskId,
  getCompletedTaskIds,
  getTaskHintLevel,
  getTaskProgress,
  isTaskUnlocked,
  setAssignedTaskId,
  setTaskHintLevel,
  type TaskId,
} from "./task-catalog";

const categoryLabels = {
  event: "事件",
  motion: "动作",
  looks: "外观",
  sound: "声音",
  control: "控制",
  game: "游戏",
  variable: "变量",
  condition: "条件",
} as const;

export function TaskPanel({ onClose }: { onClose: () => void }) {
  const project = useEditorStore((state) => state.project);
  const { lastRunReport } = useEditorRuntime();
  const [taskId, setTaskId] = useState<TaskId>(() => {
    const assigned = getAssignedTaskId(project.projectId);
    return assigned && isTaskUnlocked(assigned) ? assigned : "speak";
  });
  const [hintLevel, setHintLevel] = useState(() =>
    getTaskHintLevel(project.projectId, taskId),
  );
  const [completedIds, setCompletedIds] = useState(getCompletedTaskIds);
  const [progress, setProgress] = useState(getTaskProgress);
  const task = creationTasks.find((item) => item.taskId === taskId)!;
  const taskIndex = creationTasks.indexOf(task);
  const chapterGroups = useMemo(
    () =>
      Array.from(new Set(creationTasks.map((item) => item.chapter))).map(
        (chapter) => ({
          chapter,
          tasks: creationTasks.filter((item) => item.chapter === chapter),
        }),
      ),
    [],
  );
  const evaluation = useMemo(
    () =>
      evaluateCreationTask(
        project,
        task,
        lastRunReport?.taskId === taskId ? lastRunReport : null,
      ),
    [lastRunReport, project, task, taskId],
  );

  useEffect(() => {
    if (!getAssignedTaskId(project.projectId))
      setAssignedTaskId(project.projectId, taskId);
  }, [project.projectId, taskId]);

  useEffect(() => {
    const refresh = () => {
      setCompletedIds(getCompletedTaskIds());
      setProgress(getTaskProgress());
    };
    window.addEventListener("kids-code:task-change", refresh);
    return () => window.removeEventListener("kids-code:task-change", refresh);
  }, []);

  const selectTask = (nextTaskId: TaskId) => {
    setTaskId(nextTaskId);
    setAssignedTaskId(project.projectId, nextTaskId);
    setHintLevel(getTaskHintLevel(project.projectId, nextTaskId));
  };

  return (
    <div className="manager-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="task-panel"
        role="dialog"
        aria-modal="true"
        aria-label="创作任务"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <strong>创作任务</strong>
            <span>
              已完成 {completedIds.length} / {creationTasks.length} ·
              循序渐进学会编程
            </span>
          </div>
          <button aria-label="关闭任务" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="task-panel-body">
          <nav aria-label="任务列表">
            {chapterGroups.map(({ chapter, tasks }) => (
              <section className="task-chapter" key={chapter}>
                <h3>
                  {chapter}
                  <span>{tasks.length} 关</span>
                </h3>
                {tasks.map((item) => {
                  const unlocked = isTaskUnlocked(item.taskId, completedIds);
                  const record = progress.find(
                    (entry) => entry.taskId === item.taskId,
                  );
                  return (
                    <button
                      key={item.taskId}
                      data-active={item.taskId === taskId}
                      data-locked={!unlocked}
                      disabled={!unlocked}
                      onClick={() => selectTask(item.taskId)}
                    >
                      <span className="task-number">
                        {String(creationTasks.indexOf(item) + 1).padStart(
                          2,
                          "0",
                        )}
                      </span>
                      <span className="task-nav-copy">
                        <strong>{item.title}</strong>
                        <small>
                          {record
                            ? `已完成 · ${record.stars} 星`
                            : unlocked
                              ? "可以挑战"
                              : "完成上一关后解锁"}
                        </small>
                      </span>
                      <span
                        className="task-state-dot"
                        data-state={
                          record ? "complete" : unlocked ? "open" : "locked"
                        }
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </section>
            ))}
          </nav>
          <article className="task-detail">
            <div className="task-heading">
              <span>{String(taskIndex + 1).padStart(2, "0")}</span>
              <div>
                <small>{task.chapter}</small>
                <h2>{task.title}</h2>
                <p>{task.description}</p>
              </div>
            </div>
            <section className="task-checklist">
              <h3>任务目标</h3>
              {evaluation.rules.map((rule) => (
                <div key={rule.id} data-complete={rule.complete}>
                  <span>{rule.complete ? "✓" : "○"}</span>
                  {rule.label}
                </div>
              ))}
            </section>
            <section className="task-block-guide">
              <header>
                <h3>积木搭法参考</h3>
                <span>颜色与工作区分类一致</span>
              </header>
              <div
                className="task-block-sequence"
                role="img"
                aria-label={`参考积木顺序：${task.blockGuide.map((block) => block.label).join("，")}`}
              >
                {task.blockGuide.map((block, index) => (
                  <div
                    className="task-block-step"
                    key={`${block.label}-${index}`}
                  >
                    {index > 0 ? <span className="block-connector" /> : null}
                    <div
                      className="task-block-sample"
                      data-category={block.category}
                      data-shape={block.shape ?? "stack"}
                    >
                      <strong>{block.label}</strong>
                      <small>{categoryLabels[block.category]}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            {evaluation.complete ? (
              <div className="task-success" role="status">
                <span>完成评价 · {Math.max(1, 3 - hintLevel)} 星</span>
                <strong>任务完成！</strong>
                <p>太棒了，你已经掌握了这些积木。</p>
                <small>
                  {progress.find((record) => record.taskId === taskId)
                    ?.completedAt
                    ? `完成记录：${new Date(progress.find((record) => record.taskId === taskId)!.completedAt).toLocaleDateString("zh-CN")}`
                    : "完成记录已保存"}
                </small>
              </div>
            ) : (
              <section className="task-hints">
                <h3>需要提示吗？</h3>
                {task.hints.slice(0, hintLevel).map((hint, index) => (
                  <p key={hint}>
                    <span>{index + 1}</span>
                    {hint}
                  </p>
                ))}
                <button
                  disabled={hintLevel >= task.hints.length}
                  onClick={() => {
                    const nextLevel = Math.min(3, hintLevel + 1);
                    setHintLevel(nextLevel);
                    setTaskHintLevel(project.projectId, taskId, nextLevel);
                  }}
                >
                  {hintLevel === 0
                    ? "给我一个提示"
                    : hintLevel < task.hints.length
                      ? "再提示一点"
                      : "提示已全部显示"}
                </button>
              </section>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
