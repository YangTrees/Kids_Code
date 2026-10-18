import { useState } from "react";
import { useEditorStore } from "../editor/editor-store";
import { useEditorRuntime } from "../editor/EditorRuntimeContext";
import { getTaskSetupProblem, restoreTaskSetup } from "./task-contract";

/** Layout integrity only. The unreleased product has no legacy-course upgrade flow. */
export function TaskCompatibilityNotice() {
  const project = useEditorStore((state) => state.project);
  const apply = useEditorStore((state) => state.applyProjectUpdate);
  const { stop } = useEditorRuntime();
  const [error, setError] = useState("");
  const problem = getTaskSetupProblem(project);
  if (!project.course || !problem) return null;
  return (
    <section className="task-compatibility" aria-label="任务版本与布局">
      <strong>本关布局需要恢复</strong>
      <p role="status">{problem}</p>
      <p>
        恢复起点、角色和道路，已经搭好的积木会保留。想改布局，可展开完整工具并复制为自由作品。
      </p>
      <button
        onClick={() => {
          try {
            stop();
            apply(restoreTaskSetup(project));
            setError("");
          } catch {
            setError("布局没有恢复成功，请先保存作品再重试。");
          }
        }}
      >
        恢复任务布局
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
