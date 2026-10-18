import { useEffect, useMemo, useRef, useState } from "react";
import { mountBlockPreview } from "@kids-code/block-adapter";
import { assetUrl } from "../../shared/base-url";
import { useEditorStore } from "../editor/editor-store";
import { useEditorRuntime } from "../editor/EditorRuntimeContext";
import { getAssignedCreationTask } from "./task-catalog";
import { getLessonConfig } from "./lesson-config";
import { lessonExample } from "./lesson-examples";
import type { CreationTask } from "./task-types";
import { getLessonGuideState } from "./lesson-guide-state";
import { createTaskProject } from "./task-project";
import { builtInSoundNames } from "../editor/asset-catalog";

export function RealBlockGuide({ task }: { task: CreationTask }) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useMemo(() => lessonExample(task.taskId), [task.taskId]);
  const preview = useMemo(() => createTaskProject(task), [task]);
  useEffect(
    () =>
      ref.current
        ? mountBlockPreview(ref.current, state, {
            selectedSpriteId: preview.course!.bindings.actor,
            sprites: preview.sprites,
            scenes: preview.scenes,
            messages: preview.messages,
            spriteAssets: preview.assets
              .filter((asset) => asset.type === "sprite")
              .map((asset) => ({
                assetId: asset.assetId,
                name: asset.assetId,
              })),
            sounds: preview.assets
              .filter((asset) => asset.type === "audio")
              .map((asset) => ({
                assetId: asset.assetId,
                name: builtInSoundNames[asset.assetId] ?? asset.assetId,
              })),
            variables: preview.variables.length
              ? preview.variables
              : [{ variableId: "var_1", name: "我的变量" }],
          })
        : undefined,
    [state, preview],
  );
  return (
    <div
      className="real-block-guide"
      role="img"
      tabIndex={0}
      aria-label={`真实积木示例：${task.title}，仅供参考，不会自动加入程序`}
    >
      <p>参考结构可上下、左右滚动查看，不会自动加入程序。</p>
      {["collect", "score", "data_count"].includes(task.taskId) && (
        <p>这段程序写在金币角色中。</p>
      )}
      {task.taskId === "data_show" && (
        <p>左侧程序给团团，右侧点击程序给金币。</p>
      )}
      <div ref={ref} />
    </div>
  );
}

export function LessonGuide() {
  const project = useEditorStore((state) => state.project);
  const { lastRunReport } = useEditorRuntime();
  const task = getAssignedCreationTask(project);
  const lesson = getLessonConfig(task);
  const key = "kids-code:guide-skipped:" + project.projectId;
  const [skipped, setSkipped] = useState(
    () => sessionStorage.getItem(key) === "yes",
  );
  useEffect(() => setSkipped(sessionStorage.getItem(key) === "yes"), [key]);
  if (!task || !lesson) return null;
  const { step, complete } = getLessonGuideState(
    project,
    task,
    lastRunReport?.projectId === project.projectId ? lastRunReport : null,
  );
  return (
    <section className="lesson-guide" aria-label="角色引导">
      <div className="lesson-guide-heading">
        <strong>团团与点点的编程约定</strong>
        <button
          onClick={() => {
            const next = !skipped;
            setSkipped(next);
            sessionStorage.setItem(key, next ? "yes" : "no");
          }}
        >
          {skipped ? "重看引导" : "暂时跳过"}
        </button>
      </div>
      {!skipped && (
        <>
          <div className="mentor-line">
            <img
              src={assetUrl("ui/story-ip/tuantuan-curious-v1.webp")}
              alt="团团"
            />
            <p>{lesson.mentorLines[0]}</p>
          </div>
          <ol>
            {lesson.guideSteps.map((label, index) => (
              <li
                key={label}
                data-current={step === index}
                data-complete={step > index}
              >
                {step > index ? "✓ " : `${index + 1}. `}
                {label}
              </li>
            ))}
          </ol>
          <div className="mentor-line">
            <img
              src={assetUrl("ui/story-ip/diandian-hint-v2.webp")}
              alt="点点"
            />
            <p>
              {complete
                ? "看到了！程序真的完成了目标。你还可以保留积木再改编。"
                : lesson.mentorLines[1]}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
