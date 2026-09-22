import { IndexedDbProjectRepository } from "@kids-code/persistence";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { createTaskProject } from "./task-project";
import { useProjectPersistence } from "../editor/ProjectPersistenceContext";
import { useEditorRuntime } from "../editor/EditorRuntimeContext";
import { useEditorStore } from "../editor/editor-store";
import {
  creationTasks,
  evaluateCreationTask,
  getAssignedTaskId,
  getNextCreationTask,
  getTaskHintLevel,
  markTaskCompleted,
  setAssignedTaskId,
  type CreationTask,
} from "./task-catalog";

const repository = new IndexedDbProjectRepository();

interface CompletionState {
  task: CreationTask;
  stars: 1 | 2 | 3;
}

export function TaskCompletionDialog() {
  const navigate = useNavigate();
  const project = useEditorStore((state) => state.project);
  const { lastRunReport, status, runId, stop } = useEditorRuntime();
  const { saveNow } = useProjectPersistence();
  const handledRunRef = useRef("");
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionState | null>(null);

  useEffect(() => {
    const key = `${project.projectId}:${runId}`;
    if (
      !lastRunReport ||
      (status !== "COMPLETED" && status !== "RUNNING") ||
      handledRunRef.current === key ||
      lastRunReport.projectId !== project.projectId
    )
      return;
    const taskId = getAssignedTaskId(project.projectId);
    if (lastRunReport.taskId !== taskId) return;
    const task = creationTasks.find((item) => item.taskId === taskId);
    if (!task || !evaluateCreationTask(project, task, lastRunReport).complete)
      return;
    handledRunRef.current = key;
    const stars = Math.max(
      1,
      3 - getTaskHintLevel(project.projectId, task.taskId),
    ) as 1 | 2 | 3;
    markTaskCompleted(task.taskId, stars);
    setCompletion({ task, stars });
  }, [lastRunReport, project, status, runId]);

  if (!completion) return null;

  const nextTask = getNextCreationTask(completion.task.taskId);
  const enterNextTask = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await saveNow();
      if (!nextTask) {
        stop();
        setCompletion(null);
        navigate("/#challenges");
        return;
      }
      const starterProject = createTaskProject(nextTask);
      await repository.save(starterProject, Date.now());
      setAssignedTaskId(starterProject.projectId, nextTask.taskId);
      stop();
      setCompletion(null);
      navigate(`/editor/${starterProject.projectId}`);
    } catch {
      setError("保存没有成功，请重试。你的当前作品仍在这里。");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="task-complete-backdrop" role="presentation">
      <section
        className="task-complete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-complete-title"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy) setCompletion(null);
          if (event.key !== "Tab") return;
          const buttons = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          ];
          const first = buttons[0];
          const last = buttons.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          }
          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <span className="task-complete-burst" aria-hidden="true" />
        <img src="/assets/ui/home-coin.png" alt="" />
        <span className="task-complete-kicker">CHALLENGE COMPLETE</span>
        <h2 id="task-complete-title">任务完成！</h2>
        <p>你完成了“{completion.task.title}”，新的创作能力已经解锁。</p>
        <div
          className="task-complete-stars"
          aria-label={`${completion.stars} 星`}
        >
          {[1, 2, 3].map((star) => (
            <span key={star} data-earned={star <= completion.stars}>
              ★
            </span>
          ))}
        </div>
        <div className="task-complete-next">
          {nextTask ? (
            <>
              <small>下一个任务</small>
              <strong>{nextTask.title}</strong>
              <span>{nextTask.description}</span>
            </>
          ) : (
            <>
              <small>全部完成</small>
              <strong>你已完成所有创作任务</strong>
              <span>可以回到首页重玩任务，或者继续自由创作。</span>
            </>
          )}
        </div>
        <div className="task-complete-actions">
          <button
            className="task-complete-stay"
            autoFocus
            disabled={busy}
            onClick={() => setCompletion(null)}
          >
            留在这里
          </button>
          <button
            className="task-complete-continue"
            disabled={busy}
            onClick={() => void enterNextTask()}
          >
            {busy ? "准备中…" : nextTask ? "进入下一任务" : "返回任务列表"}
          </button>
        </div>
        {error ? <p role="alert">{error}</p> : null}
      </section>
    </div>
  );
}
