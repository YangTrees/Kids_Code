import { createProjectForMode } from "../projects/project-factory";
import type { CreationTask } from "./task-catalog";

export function createTaskProject(task: CreationTask) {
  const project = createProjectForMode(task.projectMode);
  project.name = `挑战 · ${task.title}`;
  project.workspaceStates = {};
  if (task.taskId === "scene") {
    const first = project.scenes[0]!;
    project.scenes.push({
      ...structuredClone(first),
      sceneId: "scn_task_classroom",
      name: "故事教室",
      backdropAssetId: "bg_classroom_01",
      instances: first.instances.map((instance) => ({
        ...structuredClone(instance),
        instanceId: `${instance.instanceId}_classroom`,
      })),
    });
  }
  return project;
}
