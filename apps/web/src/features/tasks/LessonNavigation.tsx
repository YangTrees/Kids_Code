import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { IndexedDbProjectRepository } from "@kids-code/persistence";
import { useEditorStore } from "../editor/editor-store";
import { useEditorRuntime } from "../editor/EditorRuntimeContext";
import { useProjectPersistence } from "../editor/ProjectPersistenceContext";
import {
  creationTasks,
  getAssignedTaskId,
  getCompletedTaskIds,
  setAssignedTaskId,
  type CreationTask,
} from "./task-catalog";
import { createTaskProject } from "./task-project";

const repository = new IndexedDbProjectRepository();

export function LessonNavigation() {
  const project = useEditorStore((state) => state.project);
  const { saveNow } = useProjectPersistence();
  const { stop } = useEditorRuntime();
  const navigate = useNavigate();
  const [completed, setCompleted] = useState(getCompletedTaskIds);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const refresh = () => setCompleted(getCompletedTaskIds());
    window.addEventListener("kids-code:task-change", refresh);
    return () => window.removeEventListener("kids-code:task-change", refresh);
  }, []);
  const index = creationTasks.findIndex(
    (task) => task.taskId === getAssignedTaskId(project),
  );
  if (index < 0) return null;
  const current = creationTasks[index]!;
  const previous = creationTasks[index - 1];
  const next = creationTasks[index + 1];
  const unlocked = completed.includes(current.taskId);
  const open = async (task: CreationTask) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await saveNow();
      const existing = (await repository.list())
        .filter((item) => getAssignedTaskId(item) === task.taskId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      const target = existing ?? createTaskProject(task);
      if (!existing) {
        await repository.save(target, Date.now());
        setAssignedTaskId(target.projectId, task.taskId);
      }
      stop();
      navigate("/editor/" + target.projectId);
    } catch {
      setError("暂时无法切换课程，请重试。当前作品仍在这里。");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return (
    <nav className="lesson-navigation" aria-label="课程前后导航">
      <button
        disabled={!previous || busy}
        onClick={() => previous && void open(previous)}
      >
        <span aria-hidden="true">←</span>
        <span>
          <small>上一课</small>
          <strong>{previous?.title ?? "这是第一课"}</strong>
        </span>
      </button>
      <button
        disabled={!next || !unlocked || busy}
        onClick={() => next && unlocked && void open(next)}
      >
        <span>
          <small>下一课{next && !unlocked ? " · 未解锁" : ""}</small>
          <strong>
            {next?.title ?? (unlocked ? "全部课程已完成" : "已经是最后一课")}
          </strong>
        </span>
        <span aria-hidden="true">→</span>
      </button>
      {error && <p role="alert">{error}</p>}
    </nav>
  );
}
