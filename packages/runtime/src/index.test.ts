import { createDefaultProject, type RuntimeScript } from "@kids-code/domain";
import { describe, expect, it, vi } from "vitest";
import {
  CancellationToken,
  RuntimeCancelledError,
  RuntimeSession,
  type DebugPort,
  type RuntimeClock,
  type StagePort,
} from "./index";

class ImmediateClock implements RuntimeClock {
  async wait(_durationMs: number, cancellation: CancellationToken) {
    cancellation.throwIfCancelled();
  }

  async tween(
    _durationMs: number,
    update: (progress: number) => void,
    cancellation: CancellationToken,
  ) {
    cancellation.throwIfCancelled();
    update(1);
  }
}

class DeferredClock implements RuntimeClock {
  readonly pending: Array<() => void> = [];

  wait(_durationMs: number, cancellation: CancellationToken): Promise<void> {
    return new Promise((resolve, reject) => {
      const off = cancellation.onCancel(() => {
        off();
        reject(new RuntimeCancelledError());
      });
      this.pending.push(() => {
        off();
        resolve();
      });
    });
  }

  async tween(
    _durationMs: number,
    update: (progress: number) => void,
    cancellation: CancellationToken,
  ) {
    cancellation.throwIfCancelled();
    update(1);
  }

  releaseAll(): void {
    for (const resolve of this.pending.splice(0)) resolve();
  }

  releaseNext(): void {
    this.pending.shift()?.();
  }
}

function createStage(): StagePort {
  return {
    setSpritePosition: vi.fn(),
    setSpriteRotation: vi.fn(),
    setSpriteScale: vi.fn(),
    setSpriteVisible: vi.fn(),
    setSpriteZIndex: vi.fn(),
    showSpeech: vi.fn(),
    clearSpeech: vi.fn(),
    playSound: vi.fn(),
    showResult: vi.fn(),
    clearResult: vi.fn(),
    pauseAllSounds: vi.fn(),
    resumeAllSounds: vi.fn(),
    stopAllSounds: vi.fn(),
    setScore: vi.fn(),
    isTouching: vi.fn(() => false),
    setSpriteClickHandler: vi.fn(),
    setInteractionEnabled: vi.fn(),
    setPlayInputEnabled: vi.fn(),
    switchScene: vi.fn(async () => undefined),
    reset: vi.fn(),
  };
}

const script: RuntimeScript = {
  scriptId: "scr_test",
  ownerSpriteId: "spr_liji",
  blocks: [
    { id: "blk_flag", sourceBlockId: "source-flag", type: "EVT_FLAG" },
    {
      id: "blk_move",
      sourceBlockId: "source-move",
      type: "MOT_MOVE",
      direction: "right",
      steps: 3,
    },
    {
      id: "blk_say",
      sourceBlockId: "source-say",
      type: "LOOK_SAY",
      text: "找到啦！",
      duration: 2,
    },
  ],
};

describe("RuntimeSession", () => {
  it("walks a fixed path cell by cell and refuses to skip a corner", async () => {
    const project = createDefaultProject();
    project.pathMap = {
      actorSpriteId: "spr_liji",
      start: { column: 2, row: 6 },
      goal: { column: 4, row: 4 },
      tiles: [
        { column: 2, row: 6 },
        { column: 3, row: 6 },
        { column: 4, row: 6 },
        { column: 4, row: 5 },
        { column: 4, row: 4 },
      ],
    };
    const actor = project.scenes[0]!.instances[0]!;
    actor.transform.x = 100;
    actor.transform.y = 260;
    const moveScript: RuntimeScript = {
      scriptId: "scr_path",
      ownerSpriteId: "spr_liji",
      blocks: [
        { id: "blk_flag", sourceBlockId: "flag", type: "EVT_FLAG" },
        {
          id: "blk_right",
          sourceBlockId: "right",
          type: "MOT_MOVE",
          direction: "right",
          steps: 2,
        },
        {
          id: "blk_up",
          sourceBlockId: "up",
          type: "MOT_MOVE",
          direction: "up",
          steps: 2,
        },
      ],
    };
    const stage = createStage();
    const session = new RuntimeSession(
      project,
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );
    await session.start([moveScript]);
    expect(session.report.pathReachedGoal).toBe(true);
    expect(session.report.pathViolation).toBe(false);
    expect(session.report.pathVisited).toHaveLength(5);
    expect(stage.setSpritePosition).toHaveBeenLastCalledWith(
      "spr_liji",
      180,
      180,
    );

    const invalid = new RuntimeSession(
      project,
      createStage(),
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );
    await invalid.start([
      {
        ...moveScript,
        blocks: [
          moveScript.blocks[0]!,
          {
            id: "blk_right",
            sourceBlockId: "right",
            type: "MOT_MOVE",
            direction: "right",
            steps: 3,
          },
          moveScript.blocks[2]!,
        ],
      },
    ]);
    expect(invalid.report.pathReachedGoal).toBe(true);
    expect(invalid.report.pathViolation).toBe(true);
    expect(invalid.report.pathVisited).toHaveLength(5);
  });

  it("checks waypoints, pickups, step limits and revisits on a map", async () => {
    const project = createDefaultProject();
    project.pathMap = {
      actorSpriteId: "spr_liji",
      start: { column: 2, row: 6 },
      goal: { column: 4, row: 5 },
      tiles: [
        { column: 2, row: 6 },
        { column: 3, row: 6 },
        { column: 4, row: 6 },
        { column: 4, row: 5 },
      ],
      checkpoints: [{ column: 3, row: 6 }],
      collectibles: [{ column: 4, row: 6 }],
      maxSteps: 3,
      noRevisit: true,
    };
    const actor = project.scenes[0]!.instances[0]!;
    actor.transform.x = 100;
    actor.transform.y = 260;
    const session = new RuntimeSession(
      project,
      createStage(),
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );
    const flag: RuntimeScript["blocks"][number] = {
      id: "flag",
      sourceBlockId: "flag",
      type: "EVT_FLAG",
    };
    const move = (
      direction: "right" | "left" | "up",
      steps: number,
    ): RuntimeScript["blocks"][number] => ({
      id: direction + steps,
      sourceBlockId: direction + steps,
      type: "MOT_MOVE",
      direction,
      steps,
    });
    await session.start([
      {
        scriptId: "map_objectives",
        ownerSpriteId: "spr_liji",
        blocks: [flag, move("right", 2), move("up", 1)],
      },
    ]);
    expect(session.report).toMatchObject({
      pathReachedGoal: true,
      pathObjectivesMet: true,
      pathCheckpointCount: 1,
      pathCollectiblesCount: 1,
      pathSteps: 3,
    });
    await session.start([
      {
        scriptId: "map_detour",
        ownerSpriteId: "spr_liji",
        blocks: [
          flag,
          move("right", 2),
          move("left", 1),
          move("right", 1),
          move("up", 1),
        ],
      },
    ]);
    expect(session.report.pathReachedGoal).toBe(true);
    expect(session.report.pathObjectivesMet).toBe(false);
    expect(session.report.pathSteps).toBe(5);
    expect(session.report.pathTrace).toEqual([
      "2:6",
      "3:6",
      "4:6",
      "3:6",
      "4:6",
      "4:5",
    ]);
  });

  it("does not overlap different key handlers on the same sprite", async () => {
    const stage = createStage();
    const clock = new DeferredClock();
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      clock,
    );
    await session.start([
      {
        scriptId: "right",
        ownerSpriteId: "spr_liji",
        blocks: [
          {
            id: "right",
            sourceBlockId: "right",
            type: "EVT_KEY",
            key: "right arrow",
          },
          { id: "wait", sourceBlockId: "wait", type: "CTL_WAIT", duration: 1 },
        ],
      },
      {
        scriptId: "left",
        ownerSpriteId: "spr_liji",
        blocks: [
          {
            id: "left",
            sourceBlockId: "left",
            type: "EVT_KEY",
            key: "left arrow",
          },
          {
            id: "score",
            sourceBlockId: "score",
            type: "GAME_CHANGE_SCORE",
            delta: 1,
          },
        ],
      },
    ]);
    const running = session.triggerKey("right arrow");
    await vi.waitFor(() => expect(clock.pending).toHaveLength(1));
    await session.triggerKey("left arrow");
    expect(session.report.score).toBe(0);
    clock.releaseNext();
    await running;
    await session.triggerKey("left arrow");
    expect(session.report.score).toBe(1);
    session.stop();
  });
  it("keeps legacy movement at ten pixels per grid and records executed blocks", async () => {
    const project = createDefaultProject();
    project.settings.movementStep = 10;
    const stage = createStage();
    const session = new RuntimeSession(
      project,
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );
    await session.start([script]);
    expect(stage.setSpritePosition).toHaveBeenLastCalledWith(
      "spr_liji",
      130,
      300,
    );
    expect(session.report.executedBlockCounts).toMatchObject({
      "source-flag": 1,
      "source-move": 1,
      "source-say": 1,
    });
    expect(session.report.projectId).toBe(project.projectId);
  });

  it("limits sustained contact responses to four per second", async () => {
    const stage = createStage();
    vi.mocked(stage.isTouching).mockReturnValue(true);
    const clock = new DeferredClock();
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      clock,
    );
    const running = session.start([
      {
        scriptId: "stay",
        ownerSpriteId: "spr_liji",
        blocks: [
          {
            id: "stay",
            sourceBlockId: "stay",
            type: "EVT_TOUCH_STAY",
            targetSpriteId: "spr_box",
          },
          {
            id: "score",
            sourceBlockId: "score",
            type: "GAME_CHANGE_SCORE",
            delta: 1,
          },
        ],
      },
    ]);
    await vi.waitFor(() => expect(session.report.score).toBe(1));
    for (let i = 0; i < 4; i++) {
      clock.releaseNext();
      await vi.waitFor(() => expect(clock.pending).toHaveLength(1));
    }
    expect(session.report.score).toBe(1);
    clock.releaseNext();
    await vi.waitFor(() => expect(session.report.score).toBe(2));
    session.stop();
    await running;
  });
  it("continues from the live stage position when rerunning the same scene", async () => {
    const stage = createStage();
    stage.getCurrentSceneId = vi.fn(() => "scn_forest");
    stage.getSpritePosition = vi.fn((spriteId) =>
      spriteId === "spr_liji" ? { x: 200, y: 250 } : null,
    );
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );

    await session.start([script]);

    expect(stage.switchScene).not.toHaveBeenCalled();
    expect(stage.setSpritePosition).toHaveBeenLastCalledWith(
      "spr_liji",
      320,
      250,
    );
  });

  it("executes flag, move and say blocks in order", async () => {
    const stage: StagePort = {
      setSpritePosition: vi.fn(),
      setSpriteRotation: vi.fn(),
      setSpriteScale: vi.fn(),
      setSpriteVisible: vi.fn(),
      setSpriteZIndex: vi.fn(),
      showSpeech: vi.fn(),
      clearSpeech: vi.fn(),
      playSound: vi.fn(),
      stopAllSounds: vi.fn(),
      setScore: vi.fn(),
      isTouching: vi.fn(() => false),
      setSpriteClickHandler: vi.fn(),
      switchScene: vi.fn(async () => undefined),
      reset: vi.fn(),
    };
    const debug: DebugPort = {
      highlightBlock: vi.fn(),
      reportError: vi.fn(),
    };
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      debug,
      new ImmediateClock(),
    );

    await session.start([script]);

    expect(stage.setSpritePosition).toHaveBeenLastCalledWith(
      "spr_liji",
      220,
      300,
    );
    expect(stage.showSpeech).toHaveBeenCalledWith("spr_liji", "找到啦！");
    expect(debug.highlightBlock).toHaveBeenCalledWith("source-move");
    expect(session.status).toBe("COMPLETED");
  });

  it("makes stop idempotent", () => {
    const stage: StagePort = {
      setSpritePosition: vi.fn(),
      setSpriteRotation: vi.fn(),
      setSpriteScale: vi.fn(),
      setSpriteVisible: vi.fn(),
      setSpriteZIndex: vi.fn(),
      showSpeech: vi.fn(),
      clearSpeech: vi.fn(),
      playSound: vi.fn(),
      stopAllSounds: vi.fn(),
      setScore: vi.fn(),
      isTouching: vi.fn(() => false),
      setSpriteClickHandler: vi.fn(),
      switchScene: vi.fn(async () => undefined),
      reset: vi.fn(),
    };
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );

    session.stop();
    session.stop();

    expect(session.status).toBe("STOPPED");
    expect(stage.reset).toHaveBeenCalledTimes(2);
  });

  it("notifies waiters when cancellation occurs", () => {
    const token = new CancellationToken();
    const listener = vi.fn();
    token.onCancel(listener);
    token.cancel();
    token.cancel();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(() => token.throwIfCancelled()).toThrow(RuntimeCancelledError);
  });

  it("uses the current scene as the runtime starting state", async () => {
    const project = createDefaultProject();
    project.scenes.push({
      ...project.scenes[0]!,
      sceneId: "scn_second",
      name: "第二场景",
      instances: project.scenes[0]!.instances.map((instance) => ({
        ...instance,
        instanceId: `${instance.instanceId}_second`,
        transform: { ...instance.transform, x: 400 },
      })),
    });
    project.currentSceneId = "scn_second";
    const stage: StagePort = {
      setSpritePosition: vi.fn(),
      setSpriteRotation: vi.fn(),
      setSpriteScale: vi.fn(),
      setSpriteVisible: vi.fn(),
      setSpriteZIndex: vi.fn(),
      showSpeech: vi.fn(),
      clearSpeech: vi.fn(),
      playSound: vi.fn(),
      stopAllSounds: vi.fn(),
      setScore: vi.fn(),
      isTouching: vi.fn(() => false),
      setSpriteClickHandler: vi.fn(),
      switchScene: vi.fn(async () => undefined),
      reset: vi.fn(),
    };
    const session = new RuntimeSession(
      project,
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );

    await session.start([script]);

    expect(stage.setSpritePosition).toHaveBeenLastCalledWith(
      "spr_liji",
      460,
      300,
    );
  });

  it("moves directly to the center of a grid cell, including both edges", async () => {
    const stage: StagePort = {
      setSpritePosition: vi.fn(),
      setSpriteRotation: vi.fn(),
      setSpriteScale: vi.fn(),
      setSpriteVisible: vi.fn(),
      setSpriteZIndex: vi.fn(),
      showSpeech: vi.fn(),
      clearSpeech: vi.fn(),
      playSound: vi.fn(),
      stopAllSounds: vi.fn(),
      setScore: vi.fn(),
      isTouching: vi.fn(() => false),
      setSpriteClickHandler: vi.fn(),
      switchScene: vi.fn(async () => undefined),
      reset: vi.fn(),
    };
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );

    await session.start([
      {
        scriptId: "scr_goto",
        ownerSpriteId: "spr_liji",
        blocks: [
          { id: "blk_flag", sourceBlockId: "flag", type: "EVT_FLAG" },
          {
            id: "blk_goto",
            sourceBlockId: "goto",
            type: "MOT_GOTO",
            x: 5,
            y: 4,
          },
          {
            id: "blk_goto_first",
            sourceBlockId: "goto_first",
            type: "MOT_GOTO",
            x: 0,
            y: 0,
          },
          {
            id: "blk_goto_last",
            sourceBlockId: "goto_last",
            type: "MOT_GOTO",
            x: 11,
            y: 8,
          },
        ],
      },
    ]);

    expect(stage.setSpritePosition).toHaveBeenCalledWith("spr_liji", 220, 180);
    expect(stage.setSpritePosition).toHaveBeenCalledWith("spr_liji", 20, 20);
    expect(stage.setSpritePosition).toHaveBeenLastCalledWith(
      "spr_liji",
      460,
      340,
    );
    expect(session.report.spritePositions.spr_liji).toEqual({
      x: 460,
      y: 340,
    });
  });

  it("changes score when the sprite touches its target", async () => {
    const stage: StagePort = {
      setSpritePosition: vi.fn(),
      setSpriteRotation: vi.fn(),
      setSpriteScale: vi.fn(),
      setSpriteVisible: vi.fn(),
      setSpriteZIndex: vi.fn(),
      showSpeech: vi.fn(),
      clearSpeech: vi.fn(),
      playSound: vi.fn(),
      stopAllSounds: vi.fn(),
      setScore: vi.fn(),
      isTouching: vi.fn(() => true),
      setSpriteClickHandler: vi.fn(),
      switchScene: vi.fn(async () => undefined),
      reset: vi.fn(),
    };
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );

    await session.start([
      {
        scriptId: "scr_score",
        ownerSpriteId: "spr_liji",
        blocks: [
          { id: "blk_flag", sourceBlockId: "flag", type: "EVT_FLAG" },
          {
            id: "blk_set",
            sourceBlockId: "set",
            type: "GAME_SET_SCORE",
            value: 0,
          },
          {
            id: "blk_touch",
            sourceBlockId: "touch",
            type: "GAME_IF_TOUCHING",
            targetSpriteId: "spr_coin",
            body: [
              {
                id: "blk_change",
                sourceBlockId: "change",
                type: "GAME_CHANGE_SCORE",
                delta: 5,
              },
            ],
          },
        ],
      },
    ]);

    expect(stage.isTouching).toHaveBeenCalledWith("spr_liji", "spr_coin");
    expect(stage.setScore).toHaveBeenLastCalledWith(5);
  });

  it("runs a generic if when touching and score conditions are both true", async () => {
    const stage = createStage();
    (stage.isTouching as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );

    await session.start([
      {
        scriptId: "scr_generic_if",
        ownerSpriteId: "spr_liji",
        blocks: [
          { id: "flag", sourceBlockId: "flag", type: "EVT_FLAG" },
          {
            id: "set",
            sourceBlockId: "set",
            type: "GAME_SET_SCORE",
            value: 5,
          },
          {
            id: "if",
            sourceBlockId: "if",
            type: "CTL_IF",
            condition: {
              type: "COND_AND",
              left: {
                type: "COND_TOUCHING",
                targetSpriteId: "spr_coin",
              },
              right: {
                type: "COND_COMPARE",
                operator: "gt",
                left: { type: "NUMBER_SCORE" },
                right: { type: "NUMBER_LITERAL", value: 3 },
              },
            },
            body: [
              {
                id: "change",
                sourceBlockId: "change",
                type: "GAME_CHANGE_SCORE",
                delta: 2,
              },
            ],
          },
        ],
      },
    ]);

    expect(stage.setScore).toHaveBeenLastCalledWith(7);
    expect(session.report.touchedPairs).toContain("spr_liji:spr_coin");
  });

  it("uses the else branch and an inclusive random integer expression", async () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const stage = createStage();
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );

    await session.start([
      {
        scriptId: "scr_if_else",
        ownerSpriteId: "spr_liji",
        blocks: [
          { id: "flag", sourceBlockId: "flag", type: "EVT_FLAG" },
          {
            id: "if-else",
            sourceBlockId: "if-else",
            type: "CTL_IF_ELSE",
            condition: {
              type: "COND_COMPARE",
              operator: "eq",
              left: { type: "NUMBER_SCORE" },
              right: { type: "NUMBER_RANDOM", from: 2, to: 6 },
            },
            thenBody: [
              {
                id: "then",
                sourceBlockId: "then",
                type: "GAME_CHANGE_SCORE",
                delta: 1,
              },
            ],
            elseBody: [
              {
                id: "else",
                sourceBlockId: "else",
                type: "GAME_CHANGE_SCORE",
                delta: 9,
              },
            ],
          },
        ],
      },
    ]);

    expect(random).toHaveBeenCalledOnce();
    expect(stage.setScore).toHaveBeenLastCalledWith(9);
    random.mockRestore();
  });

  it("updates variables, displays them, and uses them in conditions", async () => {
    const project = createDefaultProject();
    project.variables.push({
      variableId: "var_energy",
      name: "能量",
      initialValue: 0,
      visible: true,
    });
    const stage = createStage();
    stage.setVariable = vi.fn();
    const session = new RuntimeSession(
      project,
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );

    await session.start([
      {
        scriptId: "scr_variables",
        ownerSpriteId: "spr_liji",
        blocks: [
          { id: "flag", sourceBlockId: "flag", type: "EVT_FLAG" },
          {
            id: "set-var",
            sourceBlockId: "set-var",
            type: "GAME_SET_VARIABLE",
            variableId: "var_energy",
            value: { type: "NUMBER_LITERAL", value: 3 },
          },
          {
            id: "increase-var",
            sourceBlockId: "increase-var",
            type: "GAME_CHANGE_VARIABLE",
            variableId: "var_energy",
            delta: { type: "NUMBER_LITERAL", value: 2 },
            direction: "increase",
          },
          {
            id: "decrease-var",
            sourceBlockId: "decrease-var",
            type: "GAME_CHANGE_VARIABLE",
            variableId: "var_energy",
            delta: { type: "NUMBER_LITERAL", value: 1 },
            direction: "decrease",
          },
          {
            id: "if-variable",
            sourceBlockId: "if-variable",
            type: "CTL_IF",
            condition: {
              type: "COND_COMPARE",
              operator: "eq",
              left: { type: "NUMBER_VARIABLE", variableId: "var_energy" },
              right: { type: "NUMBER_LITERAL", value: 4 },
            },
            body: [
              {
                id: "score",
                sourceBlockId: "score",
                type: "GAME_CHANGE_SCORE",
                delta: 5,
              },
            ],
          },
          {
            id: "hide-var",
            sourceBlockId: "hide-var",
            type: "GAME_SHOW_VARIABLE",
            variableId: "var_energy",
            visible: false,
          },
        ],
      },
    ]);

    expect(session.report.variables).toEqual({ var_energy: 4 });
    expect(stage.setScore).toHaveBeenLastCalledWith(5);
    expect(stage.setVariable).toHaveBeenLastCalledWith(
      "var_energy",
      "能量",
      4,
      false,
    );
  });

  it("dispatches keyboard and sprite click event scripts", async () => {
    const stage: StagePort = {
      setSpritePosition: vi.fn(),
      setSpriteRotation: vi.fn(),
      setSpriteScale: vi.fn(),
      setSpriteVisible: vi.fn(),
      setSpriteZIndex: vi.fn(),
      showSpeech: vi.fn(),
      clearSpeech: vi.fn(),
      playSound: vi.fn(),
      stopAllSounds: vi.fn(),
      setScore: vi.fn(),
      isTouching: vi.fn(() => false),
      setSpriteClickHandler: vi.fn(),
      switchScene: vi.fn(async () => undefined),
      reset: vi.fn(),
    };
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );
    const eventScripts: RuntimeScript[] = [
      {
        scriptId: "scr_key",
        ownerSpriteId: "spr_liji",
        blocks: [
          {
            id: "blk_key",
            sourceBlockId: "key",
            type: "EVT_KEY",
            key: "right arrow",
          },
          {
            id: "blk_key_score",
            sourceBlockId: "key-score",
            type: "GAME_CHANGE_SCORE",
            delta: 2,
          },
        ],
      },
      {
        scriptId: "scr_click",
        ownerSpriteId: "spr_liji",
        blocks: [
          {
            id: "blk_click",
            sourceBlockId: "click",
            type: "EVT_SPRITE_CLICK",
          },
          {
            id: "blk_click_score",
            sourceBlockId: "click-score",
            type: "GAME_CHANGE_SCORE",
            delta: 3,
          },
        ],
      },
    ];

    await session.start(eventScripts);
    await session.triggerKey("right arrow");
    await session.triggerSpriteClick("spr_liji");

    expect(stage.setScore).toHaveBeenLastCalledWith(5);
  });

  it("broadcasts a message to another sprite script", async () => {
    const stage: StagePort = {
      setSpritePosition: vi.fn(),
      setSpriteRotation: vi.fn(),
      setSpriteScale: vi.fn(),
      setSpriteVisible: vi.fn(),
      setSpriteZIndex: vi.fn(),
      showSpeech: vi.fn(),
      clearSpeech: vi.fn(),
      playSound: vi.fn(),
      stopAllSounds: vi.fn(),
      setScore: vi.fn(),
      isTouching: vi.fn(() => false),
      setSpriteClickHandler: vi.fn(),
      switchScene: vi.fn(async () => undefined),
      reset: vi.fn(),
    };
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );
    const messageScripts: RuntimeScript[] = [
      {
        scriptId: "scr_sender",
        ownerSpriteId: "spr_liji",
        blocks: [
          { id: "blk_flag", sourceBlockId: "flag", type: "EVT_FLAG" },
          {
            id: "blk_broadcast",
            sourceBlockId: "broadcast",
            type: "EVT_BROADCAST",
            message: "游戏成功",
          },
        ],
      },
      {
        scriptId: "scr_receiver",
        ownerSpriteId: "spr_box",
        blocks: [
          {
            id: "blk_receive",
            sourceBlockId: "receive",
            type: "EVT_MESSAGE",
            message: "游戏成功",
          },
          {
            id: "blk_sound",
            sourceBlockId: "sound",
            type: "SND_PLAY",
            soundId: "sfx_game_success",
          },
        ],
      },
    ];

    await session.start(messageScripts);

    expect(stage.playSound).toHaveBeenCalledWith("sfx_game_success");
  });

  it("switches to the next scene and preserves the score", async () => {
    const project = createDefaultProject();
    project.scenes.push({
      ...project.scenes[0]!,
      sceneId: "scn_second",
      name: "第二场景",
      backdropAssetId: "bg_classroom_01",
      instances: project.scenes[0]!.instances.map((instance) => ({
        ...instance,
        instanceId: `${instance.instanceId}_second`,
      })),
    });
    const stage: StagePort = {
      setSpritePosition: vi.fn(),
      setSpriteRotation: vi.fn(),
      setSpriteScale: vi.fn(),
      setSpriteVisible: vi.fn(),
      setSpriteZIndex: vi.fn(),
      showSpeech: vi.fn(),
      clearSpeech: vi.fn(),
      playSound: vi.fn(),
      stopAllSounds: vi.fn(),
      setScore: vi.fn(),
      isTouching: vi.fn(() => false),
      setSpriteClickHandler: vi.fn(),
      switchScene: vi.fn(async () => undefined),
      reset: vi.fn(),
    };
    const session = new RuntimeSession(
      project,
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );

    await session.start([
      {
        scriptId: "scr_scene",
        ownerSpriteId: "spr_liji",
        blocks: [
          { id: "blk_flag", sourceBlockId: "flag", type: "EVT_FLAG" },
          {
            id: "blk_score",
            sourceBlockId: "score",
            type: "GAME_SET_SCORE",
            value: 7,
          },
          { id: "blk_next", sourceBlockId: "next", type: "SCENE_NEXT" },
        ],
      },
    ]);

    expect(stage.switchScene).toHaveBeenNthCalledWith(1, "scn_forest");
    expect(stage.switchScene).toHaveBeenNthCalledWith(2, "scn_second");
    expect(stage.setScore).toHaveBeenLastCalledWith(7);
  });

  it("switches costumes and can select an explicit scene", async () => {
    const project = createDefaultProject();
    project.scenes.push({
      ...project.scenes[0]!,
      sceneId: "scn_second",
      name: "第二场景",
      backdropAssetId: "bg_classroom_01",
      instances: project.scenes[0]!.instances.map((instance) => ({
        ...instance,
        instanceId: `${instance.instanceId}_explicit`,
      })),
    });
    const stage = createStage();
    stage.setSpriteCostume = vi.fn(async () => undefined);
    const session = new RuntimeSession(
      project,
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );

    await session.start([
      {
        scriptId: "scr_explicit_scene",
        ownerSpriteId: "spr_liji",
        blocks: [
          { id: "blk_flag", sourceBlockId: "flag", type: "EVT_FLAG" },
          {
            id: "blk_costume",
            sourceBlockId: "costume",
            type: "LOOK_COSTUME",
            costumeAssetId: "obj_star_coin",
          },
          {
            id: "blk_scene",
            sourceBlockId: "scene",
            type: "SCENE_SWITCH",
            sceneId: "scn_second",
          },
        ],
      },
    ]);

    expect(stage.setSpriteCostume).toHaveBeenCalledWith(
      "spr_liji",
      "obj_star_coin",
    );
    expect(stage.switchScene).toHaveBeenLastCalledWith("scn_second");
  });

  it("resumes every paused script and synchronizes stage audio", async () => {
    const stage = createStage();
    const clock = new DeferredClock();
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      clock,
    );
    const scripts: RuntimeScript[] = ["one", "two"].map((suffix) => ({
      scriptId: `scr_${suffix}`,
      ownerSpriteId: "spr_liji",
      blocks: [
        {
          id: `flag_${suffix}`,
          sourceBlockId: `flag_${suffix}`,
          type: "EVT_FLAG",
        },
        {
          id: `wait_${suffix}`,
          sourceBlockId: `wait_${suffix}`,
          type: "CTL_WAIT",
          duration: 1,
        },
        {
          id: `score_${suffix}`,
          sourceBlockId: `score_${suffix}`,
          type: "GAME_CHANGE_SCORE",
          delta: 1,
        },
      ],
    }));

    const running = session.start(scripts);
    await vi.waitFor(() => expect(clock.pending).toHaveLength(2));
    session.pause();
    clock.releaseAll();
    await Promise.resolve();
    session.resume();
    await running;

    expect(stage.pauseAllSounds).toHaveBeenCalledOnce();
    expect(stage.resumeAllSounds).toHaveBeenCalledOnce();
    expect(stage.setScore).toHaveBeenLastCalledWith(2);
    expect(stage.setInteractionEnabled).toHaveBeenLastCalledWith(false);
    expect(stage.setPlayInputEnabled).toHaveBeenLastCalledWith(true);
    expect(session.status).toBe("COMPLETED");
  });

  it("stops a project that exceeds the execution step limit", async () => {
    const stage = createStage();
    const debug: DebugPort = {
      highlightBlock: vi.fn(),
      reportError: vi.fn(),
    };
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      debug,
      new ImmediateClock(),
      undefined,
      { maxSteps: 3 },
    );

    await session.start([
      {
        scriptId: "scr_limit",
        ownerSpriteId: "spr_liji",
        blocks: [
          { id: "flag", sourceBlockId: "flag", type: "EVT_FLAG" },
          {
            id: "repeat",
            sourceBlockId: "repeat",
            type: "CTL_REPEAT",
            count: 10,
            body: [
              {
                id: "turn",
                sourceBlockId: "turn",
                type: "MOT_TURN",
                degrees: 15,
              },
            ],
          },
        ],
      },
    ]);

    expect(debug.reportError).toHaveBeenCalledWith("STEP_LIMIT");
    expect(session.status).toBe("ERROR");
  });

  it("rejects too many concurrent start scripts", async () => {
    const debug: DebugPort = {
      highlightBlock: vi.fn(),
      reportError: vi.fn(),
    };
    const session = new RuntimeSession(
      createDefaultProject(),
      createStage(),
      debug,
      new ImmediateClock(),
      undefined,
      { maxConcurrentTasks: 1 },
    );
    const scripts: RuntimeScript[] = ["one", "two"].map((suffix) => ({
      scriptId: `scr_${suffix}`,
      ownerSpriteId: "spr_liji",
      blocks: [
        {
          id: `flag_${suffix}`,
          sourceBlockId: `flag_${suffix}`,
          type: "EVT_FLAG",
        },
      ],
    }));

    await session.start(scripts);

    expect(debug.reportError).toHaveBeenCalledWith("TASK_LIMIT");
    expect(session.status).toBe("ERROR");
  });

  it("breaks recursive broadcasts at the configured depth", async () => {
    const debug: DebugPort = {
      highlightBlock: vi.fn(),
      reportError: vi.fn(),
    };
    const session = new RuntimeSession(
      createDefaultProject(),
      createStage(),
      debug,
      new ImmediateClock(),
      undefined,
      { maxBroadcastDepth: 2 },
    );

    await session.start([
      {
        scriptId: "scr_sender",
        ownerSpriteId: "spr_liji",
        blocks: [
          { id: "flag", sourceBlockId: "flag", type: "EVT_FLAG" },
          {
            id: "send",
            sourceBlockId: "send",
            type: "EVT_BROADCAST",
            message: "loop",
          },
        ],
      },
      {
        scriptId: "scr_loop",
        ownerSpriteId: "spr_liji",
        blocks: [
          {
            id: "receive",
            sourceBlockId: "receive",
            type: "EVT_MESSAGE",
            message: "loop",
          },
          {
            id: "resend",
            sourceBlockId: "resend",
            type: "EVT_BROADCAST",
            message: "loop",
          },
        ],
      },
    ]);

    expect(debug.reportError).toHaveBeenCalledWith("BROADCAST_DEPTH");
    expect(session.status).toBe("ERROR");
  });

  it("fires a touching event once when a sprite enters the target", async () => {
    const stage = createStage();
    const touching = stage.isTouching as ReturnType<typeof vi.fn>;
    touching.mockReturnValueOnce(false).mockReturnValue(true);
    const clock = new DeferredClock();
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      clock,
    );

    const running = session.start([
      {
        scriptId: "scr_touch_event",
        ownerSpriteId: "spr_liji",
        blocks: [
          {
            id: "touch",
            sourceBlockId: "touch",
            type: "EVT_TOUCH",
            targetSpriteId: "spr_coin",
          },
          {
            id: "score",
            sourceBlockId: "score",
            type: "GAME_CHANGE_SCORE",
            delta: 1,
          },
        ],
      },
    ]);
    await vi.waitFor(() => expect(clock.pending).toHaveLength(1));
    clock.releaseNext();
    await vi.waitFor(() => expect(stage.setScore).toHaveBeenLastCalledWith(1));
    clock.releaseNext();
    await Promise.resolve();

    expect(stage.setScore).toHaveBeenCalledTimes(2);
    session.stop();
    await running;
  });

  it("shows a game result and completes all scripts", async () => {
    const stage = createStage();
    const session = new RuntimeSession(
      createDefaultProject(),
      stage,
      { highlightBlock: vi.fn(), reportError: vi.fn() },
      new ImmediateClock(),
    );

    await session.start([
      {
        scriptId: "scr_result",
        ownerSpriteId: "spr_liji",
        blocks: [
          { id: "flag", sourceBlockId: "flag", type: "EVT_FLAG" },
          {
            id: "result",
            sourceBlockId: "result",
            type: "GAME_RESULT",
            result: "success",
            message: "找到宝箱啦！",
          },
        ],
      },
    ]);

    expect(stage.showResult).toHaveBeenCalledWith("success", "找到宝箱啦！");
    expect(session.status).toBe("COMPLETED");
    expect(session.report.result).toBe("success");
    expect(stage.setPlayInputEnabled).toHaveBeenLastCalledWith(false);
  });
});
