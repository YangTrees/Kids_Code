import { createProjectForMode } from "../projects/project-factory";
import { pathCellPosition, type PathMap } from "@kids-code/domain";
import type { CreationTask } from "./task-catalog";

const pathLayouts: Partial<
  Record<CreationTask["taskId"], Omit<PathMap, "actorSpriteId">>
> = {
  path_straight: {
    start: { column: 4, row: 5 },
    goal: { column: 7, row: 5 },
    tiles: [4, 5, 6, 7].map((column) => ({ column, row: 5 })),
  },
  path_turn: {
    start: { column: 3, row: 6 },
    goal: { column: 5, row: 4 },
    tiles: [
      { column: 3, row: 6 },
      { column: 4, row: 6 },
      { column: 5, row: 6 },
      { column: 5, row: 5 },
      { column: 5, row: 4 },
    ],
  },
  path_zigzag: {
    start: { column: 3, row: 6 },
    goal: { column: 7, row: 6 },
    tiles: [
      { column: 3, row: 6 },
      { column: 4, row: 6 },
      { column: 5, row: 6 },
      { column: 5, row: 5 },
      { column: 5, row: 4 },
      { column: 6, row: 4 },
      { column: 7, row: 4 },
      { column: 7, row: 5 },
      { column: 7, row: 6 },
    ],
  },
  path_repeat: {
    start: { column: 6, row: 6 },
    goal: { column: 6, row: 2 },
    tiles: [6, 5, 4, 3, 2].map((row) => ({ column: 6, row })),
  },
  sky_waypoint: {
    theme: "sky",
    start: { column: 2, row: 6 },
    goal: { column: 8, row: 6 },
    checkpoints: [{ column: 5, row: 4 }],
    tiles: [
      ...[2, 3, 4, 5, 6, 7, 8].map((column) => ({ column, row: 6 })),
      { column: 4, row: 5 },
      { column: 4, row: 4 },
      { column: 5, row: 4 },
      { column: 6, row: 4 },
      { column: 6, row: 5 },
    ],
  },
  sky_collect: {
    theme: "sky",
    start: { column: 2, row: 6 },
    goal: { column: 8, row: 6 },
    collectibles: [
      { column: 4, row: 3 },
      { column: 7, row: 6 },
    ],
    tiles: [
      ...[2, 3, 4, 5, 6, 7, 8].map((column) => ({ column, row: 6 })),
      ...[3, 4, 5].map((row) => ({ column: 4, row })),
    ],
  },
  sky_shortcut: {
    theme: "sky",
    start: { column: 2, row: 6 },
    goal: { column: 8, row: 4 },
    maxSteps: 8,
    tiles: [
      ...[2, 3, 4, 5, 6, 7, 8].map((column) => ({ column, row: 6 })),
      { column: 8, row: 5 },
      { column: 8, row: 4 },
      ...[3, 4, 5].map((row) => ({ column: 4, row })),
      ...[5, 6, 7, 8].map((column) => ({ column, row: 3 })),
    ],
  },
  sky_master: {
    theme: "sky",
    start: { column: 2, row: 7 },
    goal: { column: 9, row: 2 },
    checkpoints: [
      { column: 5, row: 4 },
      { column: 9, row: 4 },
    ],
    collectibles: [
      { column: 4, row: 7 },
      { column: 7, row: 4 },
    ],
    maxSteps: 12,
    noRevisit: true,
    tiles: [
      ...[2, 3, 4, 5].map((column) => ({ column, row: 7 })),
      ...[4, 5, 6].map((row) => ({ column: 5, row })),
      ...[6, 7, 8, 9].map((column) => ({ column, row: 4 })),
      { column: 9, row: 3 },
      { column: 9, row: 2 },
    ],
  },
};

export function createTaskProject(task: CreationTask) {
  const project = createProjectForMode(task.projectMode);
  project.name = `挑战 · ${task.title}`;
  project.workspaceStates = {};
  const pathLayout = pathLayouts[task.taskId];
  if (pathLayout) {
    project.settings.movementStep = 40;
    project.pathMap = { actorSpriteId: "spr_liji", ...pathLayout };
    const scene = project.scenes[0]!;
    scene.name = pathLayout.theme === "sky" ? "云岛远征" : "路线探险";
    if (pathLayout.theme === "sky") {
      project.assets.push({
        assetId: "bg_sky_islands_map",
        type: "background",
        path: "backgrounds/sky-islands-map.png",
      });
      scene.backdropAssetId = "bg_sky_islands_map";
    }
    scene.instances = scene.instances.filter(
      (instance) => instance.spriteId === "spr_liji",
    );
    const actor = scene.instances[0]!;
    actor.transform.x = pathCellPosition(pathLayout.start).x;
    actor.transform.y = pathCellPosition(pathLayout.start).y;
  }
  if (task.taskId === "scene" || task.taskId === "scene_story") {
    const first = project.scenes[0]!;
    project.scenes.push({
      ...structuredClone(first),
      sceneId: "scn_task_second",
      name: task.taskId === "scene_story" ? "魔法森林" : "故事教室",
      backdropAssetId:
        task.taskId === "scene_story" ? "bg_forest_01" : "bg_classroom_01",
      instances: first.instances.map((instance) => ({
        ...structuredClone(instance),
        instanceId: instance.instanceId + "_second",
      })),
    });
  }
  return project;
}
