import type { Project } from "@kids-code/domain";
import { creationTasks } from "../tasks/task-catalog";
import { findVersionedTask } from "../tasks/task-versions";
import { createTaskProject } from "../tasks/task-project";
import { applyStoryTaskVisuals } from "../tasks/task-visuals";
import type { TaskId } from "../tasks/task-types";

export const STORY_ACTOR = "spr_story_tuantuan";
export const STORY_FRONT = "costume_story_tuantuan_idle_v1";
export const STORY_RIGHT = "costume_story_tuantuan_right_v1";

/** Unsaved visual proof from the frozen lesson layout. */
export function createStoryIpSample(taskId: TaskId): Project {
  const task = findVersionedTask(taskId, "4", creationTasks);
  if (!task) throw new Error(`Unknown sample task: ${taskId}`);
  const project = applyStoryTaskVisuals(createTaskProject(task));
  delete project.course;
  project.projectId = `prj_story_sample_${taskId}`;
  project.name = "绘本系列素材样片";
  return project;
}
