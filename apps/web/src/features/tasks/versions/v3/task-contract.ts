import type { Project } from "@kids-code/domain";
import type { RuntimeReport } from "@kids-code/runtime";
import type { CreationTask } from "./task-types";
import { CURRENT_TASK_VERSION } from "./task-versions";

type Course = NonNullable<Project["course"]>;

export function bindCourseProject(
  project: Project,
  task: CreationTask,
  captureSetup = true,
): Project {
  const bindings: Course["bindings"] = {
    actor:
      project.pathMap?.actorSpriteId ??
      (project.sprites.some((sprite) => sprite.spriteId === "spr_liji")
        ? "spr_liji"
        : (project.sprites[0]?.spriteId ?? "spr_liji")),
    ...(project.sprites.some((sprite) => sprite.spriteId === "spr_box")
      ? { target: "spr_box" }
      : {}),
    ...(project.sprites.some((sprite) => sprite.spriteId === "spr_coin")
      ? { coin: "spr_coin" }
      : {}),
    ...(project.variables.length &&
    task.blockGuide.some((block) => block.category === "variable")
      ? {
          data:
            project.variables.find(
              (variable) => variable.variableId === "var_1",
            )?.variableId ?? project.variables[0]!.variableId,
        }
      : {}),
  };
  const ids = new Set(
    [bindings.actor, bindings.target, bindings.coin].filter(Boolean),
  );
  return {
    ...project,
    course: {
      taskId: task.taskId,
      contentVersion: task.contentVersion ?? CURRENT_TASK_VERSION,
      bindings,
      ...(captureSetup
        ? {
            setup: {
              movementStep: project.settings.movementStep,
              sceneIds: project.scenes.map((scene) => scene.sceneId),
              ...(project.pathMap
                ? { pathMap: structuredClone(project.pathMap) }
                : {}),
              instances: project.scenes.flatMap((scene) =>
                scene.instances
                  .filter((instance) => ids.has(instance.spriteId))
                  .map((instance) => ({
                    sceneId: scene.sceneId,
                    spriteId: instance.spriteId,
                    costumeAssetId: project.sprites.find(
                      (sprite) => sprite.spriteId === instance.spriteId,
                    )!.costumeAssetId,
                    transform: { ...instance.transform },
                    visible: instance.visible,
                  })),
              ),
            },
          }
        : {}),
    },
  };
}

export function getTaskSetupProblem(project: Project): string | null {
  const course = project.course;
  if (!course) return null;
  const { bindings, setup } = course;
  const names = { actor: "任务角色", target: "目标物", coin: "金币" } as const;
  for (const role of ["actor", "target", "coin"] as const) {
    const id = bindings[role];
    if (id && !project.sprites.some((sprite) => sprite.spriteId === id))
      return `本关的${names[role]}被移除了。恢复任务布局后可以继续编程。`;
  }
  if (
    bindings.data &&
    !project.variables.some((variable) => variable.variableId === bindings.data)
  )
    return "本关记录数据的变量被移除了。恢复任务布局后可以继续。";
  if (!setup) return null;
  if (project.settings.movementStep !== setup.movementStep)
    return `本关每格使用 ${setup.movementStep} 像素。请恢复任务布局，或复制到自由创作后调整。`;
  if (
    project.currentSceneId !== setup.sceneIds[0] ||
    setup.sceneIds.some((id, index) => project.scenes[index]?.sceneId !== id)
  )
    return "本关的起始场景或后续场景改变了。恢复任务布局后再运行。";
  if (
    JSON.stringify(project.pathMap ?? null) !==
    JSON.stringify(setup.pathMap ?? null)
  )
    return "本关的道路或目标改变了。恢复任务地图后再挑战。";
  for (const expected of setup.instances) {
    const sprite = project.sprites.find(
      (item) => item.spriteId === expected.spriteId,
    );
    const instance = project.scenes
      .find((scene) => scene.sceneId === expected.sceneId)
      ?.instances.find((item) => item.spriteId === expected.spriteId);
    if (
      !instance ||
      sprite?.costumeAssetId !== expected.costumeAssetId ||
      instance.visible !== expected.visible ||
      Object.entries(expected.transform).some(
        ([key, value]) =>
          instance.transform[key as keyof typeof instance.transform] !== value,
      )
    )
      return "本关角色或目标物的起始位置、大小或造型改变了。恢复任务布局会保留你已连接的积木。";
  }
  return null;
}

export function restoreTaskSetup(project: Project): Project {
  const next = structuredClone(project);
  const { bindings, setup } = next.course ?? {};
  if (!bindings || !setup) return next;
  next.settings.movementStep = setup.movementStep;
  next.currentSceneId = setup.sceneIds[0]!;
  if (setup.pathMap) next.pathMap = structuredClone(setup.pathMap);
  else delete next.pathMap;
  if (
    bindings.data &&
    !next.variables.some((variable) => variable.variableId === bindings.data)
  )
    next.variables.push({
      variableId: bindings.data,
      name: "数据",
      initialValue: 0,
      visible: true,
    });
  for (const sceneId of setup.sceneIds) {
    if (!next.scenes.some((scene) => scene.sceneId === sceneId))
      next.scenes.push({
        sceneId,
        name: "任务场景",
        backdropAssetId: next.assets.find(
          (asset) => asset.type === "background",
        )!.assetId,
        instances: [],
      });
  }
  for (const expected of setup.instances) {
    const sprite = next.sprites.find(
      (item) => item.spriteId === expected.spriteId,
    );
    if (sprite) sprite.costumeAssetId = expected.costumeAssetId;
    else
      next.sprites.push({
        spriteId: expected.spriteId,
        name:
          expected.spriteId === bindings.actor
            ? "任务角色"
            : expected.spriteId === bindings.target
              ? "目标物"
              : "金币",
        costumeAssetId: expected.costumeAssetId,
      });
    const scene = next.scenes.find(
      (item) => item.sceneId === expected.sceneId,
    )!;
    const instance = scene.instances.find(
      (item) => item.spriteId === expected.spriteId,
    );
    if (instance) {
      instance.transform = { ...expected.transform };
      instance.visible = expected.visible;
    } else
      scene.instances.push({
        instanceId: `ins_restore_${expected.sceneId}_${expected.spriteId}`,
        spriteId: expected.spriteId,
        transform: { ...expected.transform },
        visible: expected.visible,
        zIndex: 1,
      });
  }
  next.scenes.sort((a, b) => {
    const aIndex = setup.sceneIds.indexOf(a.sceneId);
    const bIndex = setup.sceneIds.indexOf(b.sceneId);
    return (
      (aIndex < 0 ? setup.sceneIds.length : aIndex) -
      (bIndex < 0 ? setup.sceneIds.length : bIndex)
    );
  });
  next.updatedAt = new Date().toISOString();
  return next;
}

/** Resolve lesson roles before running the existing assessment, without editing the work. */
export function resolveTaskBindings(
  project: Project,
  report?: RuntimeReport | null,
) {
  const bindings = project.course?.bindings;
  if (!bindings) return { project, report };
  const sprites = new Map<string, string>([
    [bindings.actor, "spr_liji"],
    ...(bindings.target
      ? [[bindings.target, "spr_box"] as [string, string]]
      : []),
    ...(bindings.coin ? [[bindings.coin, "spr_coin"] as [string, string]] : []),
  ]);
  const variables = bindings.data
    ? new Map([[bindings.data, "var_1"]])
    : new Map<string, string>();
  if (
    [...sprites, ...variables].every(
      ([actual, canonical]) => actual === canonical,
    )
  )
    return { project, report };
  const rename = <T>(
    values: Record<string, T>,
    keys: Map<string, string>,
  ): Record<string, T> =>
    Object.fromEntries(
      Object.entries(values)
        .sort(([a], [b]) => Number(keys.has(a)) - Number(keys.has(b)))
        .map(([key, value]) => [keys.get(key) ?? key, value]),
    );
  const nextProject = structuredClone(project);
  nextProject.scenes.forEach((scene) =>
    scene.instances.forEach((instance) => {
      instance.spriteId = sprites.get(instance.spriteId) ?? instance.spriteId;
    }),
  );
  nextProject.workspaceStates = rename(nextProject.workspaceStates, sprites);
  return {
    project: nextProject,
    report: report
      ? {
          ...report,
          spritePositions: rename(report.spritePositions, sprites),
          ...(report.spriteRotations
            ? { spriteRotations: rename(report.spriteRotations, sprites) }
            : {}),
          ...(report.spriteScales
            ? { spriteScales: rename(report.spriteScales, sprites) }
            : {}),
          ...(report.spriteTrails
            ? { spriteTrails: rename(report.spriteTrails, sprites) }
            : {}),
          variables: rename(report.variables, variables),
          ...(report.variableHistory
            ? { variableHistory: rename(report.variableHistory, variables) }
            : {}),
          ...(report.visibleVariables
            ? {
                visibleVariables: report.visibleVariables.map(
                  (id) => variables.get(id) ?? id,
                ),
              }
            : {}),
          touchedPairs: report.touchedPairs.map((pair) =>
            pair
              .split(":")
              .map((id) => sprites.get(id) ?? id)
              .join(":"),
          ),
        }
      : report,
  };
}
