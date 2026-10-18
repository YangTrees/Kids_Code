import { useState } from "react";
import { useNavigate } from "react-router";
import type { Project } from "@kids-code/domain";
import { IndexedDbProjectRepository } from "@kids-code/persistence";
import { useEditorStore } from "../editor/editor-store";
import { useEditorRuntime } from "../editor/EditorRuntimeContext";
import { useProjectPersistence } from "../editor/ProjectPersistenceContext";
export function createFreeLessonCopy(project: Project): Project {
  const copy = structuredClone(project);
  copy.projectId =
    "prj_" + crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  copy.name = (project.name + " · 自由版").slice(0, 30);
  copy.createdAt = copy.updatedAt = new Date().toISOString();
  delete copy.course;
  return copy;
}
export function LessonToolActions() {
  const project = useEditorStore((state) => state.project);
  const { saveNow } = useProjectPersistence();
  const { stop } = useEditorRuntime();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="lesson-free-copy">
      <span>想改地图和素材？保留本课，另建自由作品。</span>
      <button
        disabled={busy}
        onClick={() => {
          if (busy) return;
          setBusy(true);
          setError("");
          void (async () => {
            try {
              await saveNow();
              const copy = createFreeLessonCopy(project);
              await new IndexedDbProjectRepository().save(copy, Date.now());
              stop();
              navigate("/editor/" + copy.projectId);
            } catch {
              setError("复制没有成功，当前作品仍保留。请重试。");
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        {busy ? "正在复制…" : "复制为自由作品"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
