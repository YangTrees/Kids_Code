import type { TaskId } from "./task-types";

export const BASE_TASK_VERSION = "3";
export const STORY_TASK_VERSION = "4";
export const STORY_PILOT_TASK_IDS = [
  "speak",
  "move",
  "sequence",
  "repeat",
  "collision",
  "path_turn",
  "path_repeat",
  "data_compare",
] as const satisfies readonly TaskId[];

const storyPilotIds: ReadonlySet<TaskId> = new Set(STORY_PILOT_TASK_IDS);
export const isStoryPilotTask = (taskId: TaskId): boolean =>
  storyPilotIds.has(taskId);
export const getLatestTaskVersion = (taskId: TaskId): string => (
  void taskId,
  STORY_TASK_VERSION
);
