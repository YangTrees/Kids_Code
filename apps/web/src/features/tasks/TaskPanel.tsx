import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { IndexedDbProjectRepository } from "@kids-code/persistence";
import { useEditorStore } from "../editor/editor-store";
import { useEditorRuntime } from "../editor/EditorRuntimeContext";
import { useProjectPersistence } from "../editor/ProjectPersistenceContext";
import { createTaskProject } from "./task-project";
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
  operator: "运算",
} as const;

const repository = new IndexedDbProjectRepository();

export function TaskPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const project = useEditorStore((state) => state.project);
  const { lastRunReport } = useEditorRuntime();
  const { saveNow } = useProjectPersistence();
  const [taskId, setTaskId] = useState<TaskId>(() => {
    const assigned = getAssignedTaskId(project.projectId);
    return assigned && isTaskUnlocked(assigned) ? assigned : "speak";
  });
  const [hintLevel, setHintLevel] = useState(() =>
    getTaskHintLevel(project.projectId, taskId),
  );
  const [completedIds, setCompletedIds] = useState(getCompletedTaskIds);
  const [progress, setProgress] = useState(getTaskProgress);
  const [openingTaskId, setOpeningTaskId] = useState<TaskId | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
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
    const refresh = () => {
      setCompletedIds(getCompletedTaskIds());
      setProgress(getTaskProgress());
    };
    window.addEventListener("kids-code:task-change", refresh);
    return () => window.removeEventListener("kids-code:task-change", refresh);
  }, []);

  const selectTask = async (nextTaskId: TaskId) => {
    if (openingTaskId) return;
    if (getAssignedTaskId(project.projectId) === nextTaskId) {
      setTaskId(nextTaskId);
      return;
    }
    setOpeningTaskId(nextTaskId);
    setOpenError(null);
    try {
      await saveNow();
      const existing = (await repository.list())
        .filter((item) => getAssignedTaskId(item.projectId) === nextTaskId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      if (existing) {
        navigate("/editor/" + existing.projectId);
        return;
      }
      const nextTask = creationTasks.find(
        (item) => item.taskId === nextTaskId,
      )!;
      const starter = createTaskProject(nextTask);
      await repository.save(starter, Date.now());
      setAssignedTaskId(starter.projectId, nextTaskId);
      navigate("/editor/" + starter.projectId);
    } catch {
      setOpenError("关卡暂时无法打开，请稍后重试。当前作品仍保存在这里。");
      setOpeningTaskId(null);
    }
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
                      disabled={!unlocked || Boolean(openingTaskId)}
                      onClick={() => void selectTask(item.taskId)}
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
            {openError ? <p role="alert">{openError}</p> : null}
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
