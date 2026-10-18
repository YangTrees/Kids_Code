import { createProjectForMode } from "../projects/project-factory";
import { pathCellPosition, type PathMap } from "@kids-code/domain";
import type { CreationTask } from "./task-catalog";
import { bindCourseProject } from "./task-contract";

const pathLayouts: Partial<
  Record<CreationTask["taskId"], Omit<PathMap, "actorSpriteId">>
> = {
  repeat: {
    start: { column: 4, row: 5 },
    goal: { column: 6, row: 5 },
    tiles: [4, 5, 6].map((column) => ({ column, row: 5 })),
  },
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
    start: { column: 3, row: 7 },
    goal: { column: 7, row: 3 },
    tiles: [
      ...[3, 4, 5].map((column) => ({ column, row: 7 })),
      { column: 5, row: 6 },
      { column: 5, row: 5 },
      { column: 6, row: 5 },
      { column: 7, row: 5 },
      { column: 7, row: 4 },
      { column: 7, row: 3 },
    ],
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

/**
 * 后四个单元围绕“数据”展开：先给作品准备好一个名字叫“数据”的变量，
 * 孩子一打开就能在变量分类里看到它，不必先学会创建变量。
 */
const dataVariableTasks = new Set<CreationTask["taskId"]>([
  "data_count",
  "data_show",
  "data_record",
  "data_reset",
  "data_compare",
  "data_label",
  "data_sort",
  "data_chart",
  "pattern_predict",
  "pattern_swap",
  "think_if",
  "think_else",
  "think_threshold",
  "think_train",
  "think_check",
  "ai_quiz",
  "ai_sort",
  "ai_story",
  "ai_final",
  "ai_limit",
  "ai_fair",
]);

export function createTaskProject(task: CreationTask) {
  const project = createProjectForMode(task.projectMode);
  project.name = `挑战 · ${task.title}`;
  project.workspaceStates = {};
  const lessonMessages: Partial<Record<CreationTask["taskId"], string[]>> = {
    broadcast: ["找到宝箱"],
    ai_sort: ["大堆", "小堆"],
    ai_music: ["演奏"],
    ai_story: ["继续"],
    ai_final: ["验收"],
  };
  if (lessonMessages[task.taskId])
    project.messages = lessonMessages[task.taskId]!.map((name) => ({
      messageId: "msg_" + name,
      name,
    }));
  const themedBackgrounds: Record<string, { id: string; path: string }> = {
    数据小侦探: {
      id: "bg_data_discovery_lab",
      path: "backgrounds/data-discovery-lab.png",
    },
    规律与模式: {
      id: "bg_pattern_garden",
      path: "backgrounds/pattern-garden.png",
    },
    会判断的程序: {
      id: "bg_decision_workshop",
      path: "backgrounds/decision-workshop.png",
    },
    "AI 小创客": {
      id: "bg_decision_workshop",
      path: "backgrounds/decision-workshop.png",
    },
  };
  const themedBackground = themedBackgrounds[task.chapter];
  if (themedBackground) {
    project.assets.push({
      assetId: themedBackground.id,
      type: "background",
      path: themedBackground.path,
    });
    const scene = project.scenes[0]!;
    scene.name = task.chapter;
    scene.backdropAssetId = themedBackground.id;
    if (task.projectMode === "blank") {
      scene.instances = scene.instances.filter(
        (instance) => instance.spriteId === "spr_liji",
      );
      const actor = scene.instances[0]!;
      actor.transform.x = task.taskId === "pattern_square" ? 180 : 220;
      actor.transform.y = 180;
    }
  }
  if (dataVariableTasks.has(task.taskId)) {
    project.variables = [
      { variableId: "var_1", name: "数据", initialValue: 0, visible: true },
    ];
  }
  // All treasure lessons describe a three-cell approach; match the actual geometry.
  if (task.projectMode === "treasure-template") {
    const scene = project.scenes[0]!;
    const actor = scene.instances.find(
      (instance) => instance.spriteId === "spr_liji",
    );
    const chest = scene.instances.find(
      (instance) => instance.spriteId === "spr_box",
    );
    if (actor && chest) {
      chest.transform.x = actor.transform.x + 120;
      chest.transform.y = actor.transform.y;
    }
  }
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
  if (
    task.taskId === "scene" ||
    task.taskId === "scene_story" ||
    task.taskId === "ai_story"
  ) {
    const first = project.scenes[0]!;
    project.scenes.push({
      ...structuredClone(first),
      sceneId: "scn_task_second",
      name: task.taskId === "scene" ? "故事教室" : "魔法森林",
      backdropAssetId:
        task.taskId === "scene" ? "bg_classroom_01" : "bg_forest_01",
      instances: first.instances.map((instance) => ({
        ...structuredClone(instance),
        instanceId: instance.instanceId + "_second",
      })),
    });
  }
  return bindCourseProject(project, task);
}
