import { useEffect, useState } from "react";
import { useEditorStore } from "../editor/editor-store";
import { useEditorRuntime } from "../editor/EditorRuntimeContext";
import {
  creationTasks,
  evaluateCreationTask,
  getAssignedTaskId,
} from "./task-catalog";

export function CurrentTaskCard({ onOpen }: { onOpen: () => void }) {
  const project = useEditorStore((state) => state.project);
  const { lastRunReport } = useEditorRuntime();
  const [, refresh] = useState(0);
  useEffect(() => {
    const onChange = () => refresh((value) => value + 1);
    window.addEventListener("kids-code:task-change", onChange);
    return () => window.removeEventListener("kids-code:task-change", onChange);
  }, []);
  const task = creationTasks.find(
    (item) => item.taskId === getAssignedTaskId(project.projectId),
  );
  const report = lastRunReport?.taskId === task?.taskId ? lastRunReport : null;
  const evaluation = task ? evaluateCreationTask(project, task, report) : null;
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
      data-mode={task ? "task" : "free"}
      aria-label="当前挑战"
    >
      <div>
        <span>
          {task
            ? `挑战 ${creationTasks.indexOf(task) + 1} / ${creationTasks.length}`
            : "自由创作"}
        </span>
        <button onClick={onOpen}>{task ? "查看提示" : "选择挑战"} →</button>
      </div>
      <strong>{task?.title ?? "让你的想法动起来"}</strong>
      <p>
        {task?.description ??
          "给选中的角色连接积木，点击运行观察结果。停止后可以继续摆放角色。"}
      </p>
      {evaluation ? (
        <>
          {pathProgress ? (
            <p className="current-task-path-progress" role="status">
              {pathProgress}
            </p>
          ) : null}
          <ul>
            {evaluation.rules.map((rule) => (
              <li key={rule.id} data-complete={rule.complete}>
                <span aria-hidden="true">{rule.complete ? "✓" : "○"}</span>
                {rule.label}
              </li>
            ))}
          </ul>
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
