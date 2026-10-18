import { StageController } from "@kids-code/stage";
import { RuntimeSession, type RuntimeClock } from "@kids-code/runtime";
import type { Project, RuntimeScript } from "@kids-code/domain";
import { creationTasks } from "../tasks/task-catalog";
import { findVersionedTask } from "../tasks/task-versions";
import { createTaskProject } from "../tasks/task-project";
import { spriteLibrary } from "../editor/asset-catalog";

const clock: RuntimeClock = {
  async wait(ms, cancellation) {
    await new Promise((resolve) => setTimeout(resolve, ms));
    cancellation.throwIfCancelled();
  },
  async tween(ms, update, cancellation) {
    for (let i = 1; i <= 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, ms / 5));
      cancellation.throwIfCancelled();
      update(i / 5);
    }
  },
};
const until = async (predicate: () => boolean) => {
  const deadline = Date.now() + 8000;
  while (!predicate()) {
    if (Date.now() > deadline)
      throw new Error("Geometry observation timed out");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

/** Dev-only real Pixi/runtime acceptance; no app work or learning progress is saved. */
export async function runGeometryAcceptance() {
  if (!import.meta.env.DEV) throw new Error("Development acceptance only");
  const records: Array<{
    version: string;
    check: string;
    pass: boolean;
    detail?: unknown;
  }> = [];
  for (const version of ["4"]) {
    const project = createTaskProject(
      findVersionedTask("collision", version, creationTasks)!,
    );
    const actor = project.course!.bindings.actor;
    const host = document.createElement("div");
    Object.assign(host.style, {
      position: "fixed",
      left: "-2000px",
      width: "480px",
      height: "360px",
    });
    document.body.append(host);
    const stage = new StageController();
    try {
      await stage.mount(host, project);
      stage.setEffectsEnabled(false);
      const start = stage.getSpritePosition(actor)!;
      const chest = stage.getSpritePosition("spr_box")!;
      const same = (position: { x: number; y: number } | null) =>
        Boolean(position && position.x === start.x && position.y === start.y);
      stage.setSpriteRotation(actor, 90);
      records.push({
        version,
        check: "rotation-does-not-translate",
        pass: same(stage.getSpritePosition(actor)),
      });
      stage.setSpriteScale(actor, 1.5);
      records.push({
        version,
        check: "scale-does-not-translate",
        pass: same(stage.getSpritePosition(actor)),
      });
      stage.reset();
      if (version === "4") {
        await stage.setSpriteCostume(actor, "costume_story_tuantuan_right_v1");
        records.push({
          version,
          check: "pose-retains-grid-center",
          pass: same(stage.getSpritePosition(actor)),
        });
      }
      const edge = stage.resolveSpritePosition(actor, chest.x + 120, chest.y);
      records.push({
        version,
        check: "large-step-stops-at-edge",
        pass: edge.x < chest.x && stage.isTouching(actor, "spr_box"),
        detail: edge,
      });
      stage.resolveSpritePosition(actor, start.x, start.y);
      records.push({
        version,
        check: "leaving-contact",
        pass: !stage.isTouching(actor, "spr_box"),
      });
      stage.resolveSpritePosition(actor, chest.x, chest.y);
      records.push({
        version,
        check: "reenter-contact",
        pass: stage.isTouching(actor, "spr_box"),
      });
      stage.setSpriteVisible("spr_box", false);
      const through = stage.resolveSpritePosition(actor, chest.x + 80, chest.y);
      records.push({
        version,
        check: "hidden-target-does-not-collide",
        pass: !stage.isTouching(actor, "spr_box") && through.x > chest.x,
      });
      stage.reset();
      records.push({
        version,
        check: "reset-restores-start",
        pass: same(stage.getSpritePosition(actor)),
      });
      const movement = (
        direction: "left" | "right",
        steps: number,
        suffix: string,
      ) => ({
        id: "blk_" + suffix,
        sourceBlockId: suffix,
        type: "MOT_MOVE" as const,
        direction,
        steps,
      });
      const scripts: RuntimeScript[] = [
        {
          scriptId: "scr_geometry_move",
          ownerSpriteId: actor,
          blocks: [
            { id: "blk_flag", sourceBlockId: "flag", type: "EVT_FLAG" },
            movement("right", 3, "approach"),
            {
              id: "blk_wait",
              sourceBlockId: "wait",
              type: "CTL_WAIT",
              duration: 0.3,
            },
            movement("left", 2, "leave"),
            movement("right", 2, "reenter"),
            {
              id: "blk_wait_end",
              sourceBlockId: "wait-end",
              type: "CTL_WAIT",
              duration: 0.3,
            },
          ],
        },
        {
          scriptId: "scr_geometry_touch",
          ownerSpriteId: actor,
          blocks: [
            {
              id: "blk_touch",
              sourceBlockId: "touch",
              type: "EVT_TOUCH",
              targetSpriteId: "spr_box",
            },
            {
              id: "blk_score",
              sourceBlockId: "score",
              type: "GAME_CHANGE_SCORE",
              delta: 1,
            },
          ],
        },
      ];
      for (let run = 1; run <= 2; run++) {
        stage.reset();
        const session = new RuntimeSession(
          project,
          stage,
          { highlightBlock() {}, reportError() {} },
          clock,
        );
        const done = session.start(scripts);
        try {
          await until(() => session.report.score >= 2);
          await new Promise((resolve) => setTimeout(resolve, 350));
          records.push({
            version,
            check:
              run === 1
                ? "enter-once-sustain-no-repeat-reenter-again"
                : "stop-and-rerun",
            pass: session.report.score === 2,
            detail: session.report.touchedPairs,
          });
        } finally {
          session.stop(false);
          await done;
        }
      }
      const second = structuredClone(project.scenes[0]!);
      second.sceneId = "scn_geometry_second";
      second.instances.forEach((item) => (item.instanceId += "_second"));
      project.scenes.push(second);
      await stage.switchScene(second.sceneId);
      records.push({
        version,
        check: "switches-to-second-scene",
        pass: stage.getCurrentSceneId() === second.sceneId,
      });
      stage.reset();
      await until(
        () =>
          stage.getCurrentSceneId() === project.currentSceneId &&
          stage.getSpritePosition(actor) !== null,
      );
      records.push({
        version,
        check: "scene-change-and-reset",
        pass: same(stage.getSpritePosition(actor)),
        detail: { start, actual: stage.getSpritePosition(actor) },
      });
      const repeatScript: RuntimeScript[] = [
        {
          scriptId: "scr_single_step",
          ownerSpriteId: actor,
          blocks: [
            {
              id: "blk_step_flag",
              sourceBlockId: "step-flag",
              type: "EVT_FLAG",
            },
            {
              id: "blk_step_loop",
              sourceBlockId: "step-loop",
              type: "CTL_REPEAT",
              count: 2,
              body: [movement("right", 1, "step-right")],
            },
          ],
        },
      ];
      const positions: unknown[] = [];
      for (const stepping of [false, true]) {
        stage.reset();
        let observed = 0;
        let pauses = 0;
        const session: RuntimeSession = new RuntimeSession(
          project,
          stage,
          { highlightBlock() {}, reportError() {} },
          clock,
          (_status, report) => {
            const count = Object.values(
              report.executedBlockCounts ?? {},
            ).reduce((total, value) => total + value, 0);
            if (stepping && report.status === "RUNNING" && count > observed) {
              observed = count;
              pauses += 1;
              session.pause();
            }
          },
        );
        const done = session.start(repeatScript);
        try {
          for (
            let steps = 0;
            session.report.status !== "COMPLETED" && steps < 30;
            steps++
          ) {
            await until(
              () =>
                session.report.status === "COMPLETED" ||
                session.report.status === "PAUSED",
            );
            if (session.report.status === "PAUSED") {
              const before = observed;
              session.resume();
              await until(
                () =>
                  session.report.status === "COMPLETED" || observed > before,
              );
            }
          }
          await done;
          positions.push(session.report.spritePositions[actor]);
          if (stepping)
            records.push({
              version,
              check: "single-step-really-pauses",
              // The container finishes while its last child is already paused;
              // it does not create a fourth, artificial execution step.
              pass:
                pauses === 3 &&
                session.report.executedBlockCounts?.["step-right"] === 2 &&
                session.report.executedBlockCounts?.["step-loop"] === 1,
              detail: { pauses, executed: session.report.executedBlockCounts },
            });
        } finally {
          session.stop(false);
        }
      }
      records.push({
        version,
        check: "single-step-equals-continuous-repeat",
        pass: JSON.stringify(positions[0]) === JSON.stringify(positions[1]),
        detail: positions,
      });
    } finally {
      stage.destroy();
      host.remove();
    }
    await checkCoin(project, version, records);
  }
  return records;
}

async function checkCoin(
  project: Project,
  version: string,
  records: Array<{
    version: string;
    check: string;
    pass: boolean;
    detail?: unknown;
  }>,
) {
  const coinProject = structuredClone(project);
  const actor = coinProject.course!.bindings.actor;
  const coinAsset = spriteLibrary.find(
    (asset) =>
      asset.assetId ===
      (version === "4" ? "obj_story_coin_v1" : "obj_star_coin"),
  )!;
  coinProject.assets.push({
    assetId: coinAsset.assetId,
    type: "sprite",
    path: coinAsset.path,
  });
  coinProject.sprites = coinProject.sprites.filter(
    (sprite) => sprite.spriteId === actor,
  );
  coinProject.sprites.push({
    spriteId: "spr_coin",
    name: "金币",
    costumeAssetId: coinAsset.assetId,
  });
  const first = coinProject.scenes[0]!;
  const instance = first.instances.find((item) => item.spriteId === actor)!;
  first.instances = [
    instance,
    {
      ...structuredClone(instance),
      instanceId: "ins_geometry_coin",
      spriteId: "spr_coin",
      transform: { ...instance.transform, x: instance.transform.x + 80 },
    },
  ];
  coinProject.scenes = [first];
  const host = document.createElement("div");
  Object.assign(host.style, {
    position: "fixed",
    left: "-2000px",
    width: "480px",
    height: "360px",
  });
  document.body.append(host);
  const stage = new StageController();
  try {
    await stage.mount(host, coinProject);
    const start = stage.getSpritePosition(actor)!;
    stage.setSpritePosition(actor, start.x + 80, start.y);
    records.push({
      version,
      check: "collectible-cell-center-contact",
      pass: stage.isTouching(actor, "spr_coin"),
    });
    const after = stage.resolveSpritePosition(actor, start.x + 160, start.y);
    records.push({
      version,
      check: "collectible-is-passable",
      pass: after.x > start.x + 80 && !stage.isTouching(actor, "spr_coin"),
    });
    stage.reset();
    const scripts: RuntimeScript[] = [
      {
        scriptId: "scr_coin_cross",
        ownerSpriteId: actor,
        blocks: [
          { id: "blk_flag", sourceBlockId: "flag", type: "EVT_FLAG" },
          {
            id: "blk_cross",
            sourceBlockId: "cross",
            type: "MOT_MOVE",
            direction: "right",
            steps: 4,
          },
        ],
      },
      {
        scriptId: "scr_coin_touch",
        ownerSpriteId: actor,
        blocks: [
          {
            id: "blk_touch_coin",
            sourceBlockId: "touch-coin",
            type: "EVT_TOUCH",
            targetSpriteId: "spr_coin",
          },
          {
            id: "blk_coin_score",
            sourceBlockId: "coin-score",
            type: "GAME_CHANGE_SCORE",
            delta: 1,
          },
        ],
      },
    ];
    const session = new RuntimeSession(
      coinProject,
      stage,
      { highlightBlock() {}, reportError() {} },
      clock,
    );
    const done = session.start(scripts);
    try {
      await until(
        () => session.report.spritePositions[actor]!.x >= start.x + 160,
      );
      records.push({
        version,
        check: "multi-cell-move-observes-crossed-coin",
        pass: session.report.score === 1,
        detail: session.report.touchedPairs,
      });
    } finally {
      session.stop(false);
      await done;
    }
  } finally {
    stage.destroy();
    host.remove();
  }
}
