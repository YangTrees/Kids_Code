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
        <ul>
          {evaluation.rules.map((rule) => (
            <li key={rule.id} data-complete={rule.complete}>
              <span aria-hidden="true">{rule.complete ? "✓" : "○"}</span>
              {rule.label}
            </li>
          ))}
        </ul>
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
