import { useEffect, useState } from "react";
import { useEditorStore } from "../editor/editor-store";
import { useEditorRuntime } from "../editor/EditorRuntimeContext";
import {
  creationTasks,
  evaluateCreationTask,
  getAssignedCreationTask,
  getAssignedTaskId,
} from "./task-catalog";
import { useDataPlayProgress } from "./data-play";
import { TaskCompatibilityNotice } from "./TaskCompatibilityNotice";
import { assetUrl } from "../../shared/base-url";
import { LessonGuide } from "./LessonGuide";

/** Keep the lesson goal in view before the stage, not below a large canvas. */
export function CurrentTaskObjective() {
  const project = useEditorStore((state) => state.project);
  const task = getAssignedCreationTask(project);
  if (!task) return null;
  return (
    <div
      className="stage-task-objective"
      data-story={task.visualSetId ? "true" : undefined}
      aria-label="本关目标"
    >
      <span>本关目标</span>
      <strong>{task.runtimeGoal.label}</strong>
      {task.visualSetId && (
        <img
          className="task-mentor-avatar"
          src={assetUrl("ui/story-ip/diandian-hint-v2.webp")}
          alt="点点陪你完成挑战"
        />
      )}
    </div>
  );
}

export function CurrentTaskCard({ onOpen }: { onOpen: () => void }) {
  const project = useEditorStore((state) => state.project);
  const { lastRunReport, runId } = useEditorRuntime();
  const interaction = useDataPlayProgress(project.projectId);
  const [, refresh] = useState(0);
  useEffect(() => {
    const onChange = () => refresh((value) => value + 1);
    window.addEventListener("kids-code:task-change", onChange);
    return () => window.removeEventListener("kids-code:task-change", onChange);
  }, []);
  const task = getAssignedCreationTask(project);
  const assigned = getAssignedTaskId(project) ?? project.course?.taskId;
  const report = lastRunReport?.taskId === task?.taskId ? lastRunReport : null;
  const evaluation = task
    ? evaluateCreationTask(project, task, report, {
        progress: interaction,
        runId,
      })
    : null;
  const nextGoal = evaluation?.rules.find((rule) => !rule.complete);
  const map = project.pathMap;
  const pathProgress =
    map &&
    report &&
    (map.checkpoints?.length || map.collectibles?.length || map.maxSteps)
      ? [
          map.checkpoints?.length
            ? `路标 ${report.pathCheckpointCount ?? 0}/${map.checkpoints.length}`
            : null,
          map.collectibles?.length
            ? `星石 ${report.pathCollectiblesCount ?? 0}/${map.collectibles.length}`
            : null,
          map.maxSteps ? `步数 ${report.pathSteps ?? 0}/${map.maxSteps}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;
  const pathFeedback =
    map && report?.status === "COMPLETED"
      ? report.pathViolation
        ? "刚才走出了浅色道路。检查拐角处的方向和步数，再运行一次。"
        : (report.pathCheckpointCount ?? 0) < (map.checkpoints?.length ?? 0)
          ? "还没按顺序经过所有紫色路标，看看地图上的数字。"
          : (report.pathCollectiblesCount ?? 0) <
              (map.collectibles?.length ?? 0)
            ? "还有金色星石没有收集，试试地图上的岔路。"
            : map.maxSteps && (report.pathSteps ?? 0) > map.maxSteps
              ? `用了 ${report.pathSteps} 步，目标是不超过 ${map.maxSteps} 步。试试更短的路线。`
              : map.noRevisit &&
                  new Set(report.pathTrace ?? []).size !==
                    (report.pathTrace?.length ?? 0)
                ? "这次走了回头路，试试每个格子只经过一次。"
                : null
      : null;
  return (
    <section
      className="current-task-card"
      data-mode={assigned ? "task" : "free"}
      aria-label="当前挑战"
    >
      <div>
        <span>
          {task
            ? `第 ${creationTasks.findIndex((item) => item.taskId === task.taskId) + 1} 课 / 共 ${creationTasks.length} 课 · ${task.chapter}`
            : assigned
              ? "任务版本待更新"
              : "自由创作"}
        </span>
        <button onClick={onOpen}>{task ? "查看提示" : "选择挑战"} →</button>
      </div>
      <strong>
        {task?.title ??
          (assigned ? "当前课程版本暂不支持" : "让你的想法动起来")}
      </strong>
      {!task ? (
        <p className="current-task-objective">
          {assigned
            ? "新建当前版本，或复制已有作品继续自由创作。"
            : "给选中的角色连接积木，点击运行观察结果。停止后可以继续摆放角色。"}
        </p>
      ) : null}
      <TaskCompatibilityNotice />
      {task && <p className="lesson-description">{task.description}</p>}
      {evaluation ? (
        <>
          {pathProgress ? (
            <p className="current-task-path-progress" role="status">
              {pathProgress}
            </p>
          ) : null}
          <p className="current-task-next" role="status">
            {nextGoal
              ? `下一步：${nextGoal.label}`
              : "本关目标已经完成，可以继续改编或进入下一任务。"}
          </p>
          <details className="current-task-checks">
            <summary>
              查看全部检查项（
              {evaluation.rules.filter((rule) => rule.complete).length}/
              {evaluation.rules.length}）
            </summary>
            <ul>
              {evaluation.rules.map((rule) => (
                <li key={rule.id} data-complete={rule.complete}>
                  <span aria-hidden="true">{rule.complete ? "✓" : "○"}</span>
                  {rule.label}
                </li>
              ))}
            </ul>
            {task?.description ? <p>{task.description}</p> : null}
            {project.course?.setup ? (
              <p>
                本关保留地图与角色起点，运行积木可以改变角色。想重新设计地图，可复制到自由创作。
              </p>
            ) : null}
          </details>
          {task?.visualSetId && <LessonGuide key={project.projectId} />}
          {report?.status === "COMPLETED" && nextGoal ? (
            <p className="current-task-feedback" role="status">
              {pathFeedback ??
                `这次还差一步：${nextGoal.label}。可以打开提示，再试一次。`}
            </p>
          ) : null}
        </>
      ) : (
        <div className="creation-steps">
          <span>选角色</span>
          <span aria-hidden="true">→</span>
          <span>连积木</span>
          <span aria-hidden="true">→</span>
          <span>运行</span>
        </div>
      )}
    </section>
  );
}
