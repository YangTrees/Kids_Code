import type { CreationTask, TaskId } from "./task-types";
import { STORY_TASK_VERSION } from "./task-release";

/** Unreleased project: one active curriculum, no legacy assessment bundles. */
export const CURRENT_TASK_VERSION = STORY_TASK_VERSION;
export const PREVIOUS_TASK_VERSION = "2";
export const LEGACY_TASK_VERSION = "1";
export function correctTaskCopy(task: CreationTask): CreationTask {
  if (task.taskId !== "ai_helper") return task;
  return {
    ...task,
    rules: task.rules.map((rule) =>
      rule.id === "repeat"
        ? { ...rule, label: "连续观察五次" }
        : rule.id === "if"
          ? { ...rule, label: "每次加分后立刻判断" }
          : rule,
    ),
  };
}
export function findVersionedTask(
  taskId: TaskId,
  version: string,
  currentTasks: CreationTask[],
): CreationTask | undefined {
  return version === CURRENT_TASK_VERSION
    ? currentTasks.find((task) => task.taskId === taskId)
    : undefined;
}
