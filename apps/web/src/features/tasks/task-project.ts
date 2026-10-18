import type { CreationTask } from "./task-types";
import { bindCourseProject } from "./task-contract";
import { createTaskProject as createLayoutProject } from "./task-layout";
import { applyStoryTaskVisuals } from "./task-visuals";

/** All course entries use the current story series and one assessment version. */
export function createTaskProject(task: CreationTask) {
  const original = createLayoutProject(task);
  return bindCourseProject(applyStoryTaskVisuals(original), task);
}
