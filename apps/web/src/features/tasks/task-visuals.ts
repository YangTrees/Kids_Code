import type { Project } from "@kids-code/domain";
import { spriteLibrary, backgroundLibrary } from "../editor/asset-catalog";
import { STORY_TASK_VERSION } from "./task-release";
import type { CreationTask } from "./task-types";
import { lessonScenarios } from "./lesson-scenarios";

export const STORY_ACTOR_ID = "spr_story_tuantuan";
export const STORY_COSTUME_ID = "costume_story_tuantuan_idle_v1";

/** Copy changes identity labels only. Assessment closures and all requirements stay intact. */
export function createLatestTask(task: CreationTask): CreationTask {
  const scenario = lessonScenarios[task.taskId];
  const text = (value: string) =>
    value
      .replaceAll("栗奇", "团团")
      .replaceAll("“游戏”分类创建变量", "“变量”分类创建变量")
      .replaceAll("“游戏”分类点击“创建变量”", "“变量”分类点击“创建变量”")
      .replaceAll("在“控制”分类找到绿色", "在“运算”分类找到绿色")
      .replaceAll("“判断”分类", "“控制”分类");
  return {
    ...task,
    contentVersion: STORY_TASK_VERSION,
    visualSetId: "story-ip-v1",
    title: scenario?.title ?? text(task.title),
    description: scenario?.description ?? text(task.description),
    blockGuide: task.blockGuide.map((block) => ({
      ...block,
      label: text(block.label),
    })),
    rules: task.rules.map((rule) => ({
      ...rule,
      label: text(rule.label),
      anyOf: [...rule.anyOf],
    })),
    hints: task.hints.map((hint, index) =>
      index === 0 && scenario ? scenario.question : text(hint),
    ) as CreationTask["hints"],
    runtimeGoal: {
      ...task.runtimeGoal,
      label: scenario?.goal ?? text(task.runtimeGoal.label),
    },
    ...(task.programGoal
      ? {
          programGoal: {
            ...task.programGoal,
            label: text(task.programGoal.label),
          },
        }
      : {}),
  };
}

/** New empty course templates only; existing works never pass through a visual migration. */
export function applyStoryTaskVisuals(project: Project): Project {
  if (
    Object.keys(project.workspaceStates).length ||
    project.scripts.some((script) => script.blocks.length)
  )
    throw new Error("STORY_TEMPLATE_MUST_BE_EMPTY");
  const actorId = project.course?.bindings.actor;
  if (!actorId) throw new Error("STORY_TEMPLATE_ACTOR_MISSING");
  const next = structuredClone(project);
  const backdropId = next.pathMap
    ? "bg_story_cloud_v1"
    : next.variables.length ||
        /^(pattern_|think_|ai_)/.test(next.course!.taskId)
      ? "bg_story_workshop_v1"
      : "bg_story_garden_v1";
  const costumes = new Map([
    [actorId, STORY_COSTUME_ID],
    ["spr_box", "obj_story_treasure_chest_v1"],
    ["spr_coin", "obj_story_coin_v1"],
  ]);
  next.sprites = next.sprites.map((sprite) => ({
    ...sprite,
    spriteId: sprite.spriteId === actorId ? STORY_ACTOR_ID : sprite.spriteId,
    name: sprite.spriteId === actorId ? "团团" : sprite.name,
    costumeAssetId: costumes.get(sprite.spriteId) ?? sprite.costumeAssetId,
  }));
  next.scenes = next.scenes.map((scene) => ({
    ...scene,
    backdropAssetId:
      next.scenes.length > 1 && scene.sceneId !== next.scenes[0]!.sceneId
        ? backdropId === "bg_story_garden_v1"
          ? "bg_story_workshop_v1"
          : "bg_story_garden_v1"
        : backdropId,
    instances: scene.instances.map((instance) =>
      instance.spriteId === actorId
        ? {
            ...instance,
            spriteId: STORY_ACTOR_ID,
            instanceId: `ins_story_tuantuan_${scene.sceneId}`,
          }
        : instance,
    ),
  }));
  if (next.pathMap) next.pathMap.actorSpriteId = STORY_ACTOR_ID;
  next.course!.bindings.actor = STORY_ACTOR_ID;
  const required = new Set([
    ...next.scenes.map((scene) => scene.backdropAssetId),
    ...next.sprites.map((sprite) => sprite.costumeAssetId),
    "costume_story_tuantuan_right_v1",
  ]);
  for (const asset of [...spriteLibrary, ...backgroundLibrary]) {
    if (
      !required.has(asset.assetId) ||
      next.assets.some((item) => item.assetId === asset.assetId)
    )
      continue;
    next.assets.push({
      assetId: asset.assetId,
      path: asset.path,
      type: asset.assetId.startsWith("bg_") ? "background" : "sprite",
    });
  }
  return next;
}
