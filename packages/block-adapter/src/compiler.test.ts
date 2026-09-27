import { describe, expect, it } from "vitest";
import {
  compileBlockForRuntime,
  type RuntimeCompilableBlock,
} from "./compiler";

const fakeBlock = (
  type: string,
  fields: Record<string, Record<string, unknown>> = {},
): RuntimeCompilableBlock => ({
  id: `source-${type}`,
  type,
  getInputTargetBlock(inputName) {
    const values = fields[inputName];
    return values ? { getFieldValue: (fieldName) => values[fieldName] } : null;
  },
});

describe("compileBlockForRuntime", () => {
  it("clamps movement steps to the child-safe range", () => {
    const result = compileBlockForRuntime(
      fakeBlock("motion_movesteps", { STEPS: { NUM: 99 } }),
    );
    expect(result).toMatchObject({ type: "MOT_MOVE", steps: 10 });
  });

  it("reads values from child-friendly picker shadows", () => {
    const result = compileBlockForRuntime(
      fakeBlock("motion_movesteps", { STEPS: { VALUE: 7 } }),
    );
    expect(result).toMatchObject({ type: "MOT_MOVE", steps: 7 });
  });

  it("keeps unknown imported blocks as safe compatibility nodes", () => {
    expect(
      compileBlockForRuntime(fakeBlock("future_extension_block")),
    ).toMatchObject({
      type: "UNSUPPORTED",
      originalType: "future_extension_block",
    });
  });

  it("compiles left movement with an editable step count", () => {
    const result = compileBlockForRuntime(
      fakeBlock("kids_move_left", { STEPS: { NUM: 4 } }),
    );
    expect(result).toMatchObject({
      type: "MOT_MOVE",
      direction: "left",
      steps: 4,
    });
  });

  it("compiles collision enter, stay, and exit events", () => {
    for (const [type, runtimeType] of [
      ["kids_when_touching", "EVT_TOUCH"],
      ["kids_while_touching", "EVT_TOUCH_STAY"],
      ["kids_when_touch_end", "EVT_TOUCH_EXIT"],
    ] as const) {
      expect(
        compileBlockForRuntime({
          ...fakeBlock(type),
          getFieldValue: () => "spr_box",
        }),
      ).toMatchObject({ type: runtimeType, targetSpriteId: "spr_box" });
    }
  });

  it("compiles vertical movement in both directions", () => {
    expect(
      compileBlockForRuntime(fakeBlock("kids_move_up", { STEPS: { NUM: 2 } })),
    ).toMatchObject({ type: "MOT_MOVE", direction: "up", steps: 2 });
    expect(
      compileBlockForRuntime(
        fakeBlock("kids_move_down", { STEPS: { NUM: 5 } }),
      ),
    ).toMatchObject({ type: "MOT_MOVE", direction: "down", steps: 5 });
  });

  it("compiles left turns as counter-clockwise rotation", () => {
    const result = compileBlockForRuntime(
      fakeBlock("kids_turn_left", { DEGREES: { NUM: 30 } }),
    );
    expect(result).toMatchObject({ type: "MOT_TURN", degrees: -30 });
  });

  it("compiles costume and explicit scene selection", () => {
    expect(
      compileBlockForRuntime({
        ...fakeBlock("kids_switch_costume"),
        getFieldValue: () => "obj_star_coin",
      }),
    ).toMatchObject({
      type: "LOOK_COSTUME",
      costumeAssetId: "obj_star_coin",
    });
    expect(
      compileBlockForRuntime({
        ...fakeBlock("kids_switch_scene"),
        getFieldValue: () => "scn_second",
      }),
    ).toMatchObject({ type: "SCENE_SWITCH", sceneId: "scn_second" });
  });

  it("trims speech and keeps its configured duration", () => {
    const result = compileBlockForRuntime(
      fakeBlock("looks_sayforsecs", {
        MESSAGE: { TEXT: "  找到宝箱啦！  " },
        SECS: { NUM: 3 },
      }),
    );
    expect(result).toMatchObject({
      type: "LOOK_SAY",
      text: "找到宝箱啦！",
      duration: 3,
    });
  });

  it("compiles integer grid coordinates within the supported bounds", () => {
    const result = compileBlockForRuntime(
      fakeBlock("motion_gotoxy", {
        X: { NUM: 999 },
        Y: { NUM: 120 },
      }),
    );
    expect(result).toMatchObject({ type: "MOT_GOTO", x: 47, y: 35 });
  });

  it("reads the selected sound from its menu shadow", () => {
    const result = compileBlockForRuntime(
      fakeBlock("sound_play", {
        SOUND_MENU: { SOUND_MENU: "sfx_game_success" },
      }),
    );
    expect(result).toMatchObject({
      type: "SND_PLAY",
      soundId: "sfx_game_success",
    });
  });

  it("compiles score changes within the game-safe range", () => {
    const result = compileBlockForRuntime(
      fakeBlock("kids_score_change", { DELTA: { NUM: 5000 } }),
    );
    expect(result).toMatchObject({ type: "GAME_CHANGE_SCORE", delta: 1000 });
  });

  it("compiles a touching condition with its nested body", () => {
    const child = fakeBlock("kids_score_change", { DELTA: { NUM: 5 } });
    const block: RuntimeCompilableBlock = {
      id: "source-touching",
      type: "kids_if_touching",
      getFieldValue: () => "spr_box",
      getInputTargetBlock: (inputName) =>
        inputName === "SUBSTACK" ? child : null,
    };
    const result = compileBlockForRuntime(block);
    expect(result).toMatchObject({
      type: "GAME_IF_TOUCHING",
      targetSpriteId: "spr_box",
      body: [{ type: "GAME_CHANGE_SCORE", delta: 5 }],
    });
  });

  it("compiles keyboard and sprite click event hats", () => {
    const keyboard = compileBlockForRuntime({
      ...fakeBlock("event_whenkeypressed"),
      getFieldValue: () => "right arrow",
    });
    const click = compileBlockForRuntime(
      fakeBlock("event_whenthisspriteclicked"),
    );
    expect(keyboard).toMatchObject({ type: "EVT_KEY", key: "right arrow" });
    expect(click).toMatchObject({ type: "EVT_SPRITE_CLICK" });
  });

  it("compiles a forever loop with its nested body", () => {
    const child = fakeBlock("motion_movesteps", { STEPS: { NUM: 2 } });
    const block: RuntimeCompilableBlock = {
      id: "source-forever",
      type: "control_forever",
      getInputTargetBlock: (inputName) =>
        inputName === "SUBSTACK" ? child : null,
    };
    expect(compileBlockForRuntime(block)).toMatchObject({
      type: "CTL_FOREVER",
      body: [{ type: "MOT_MOVE", steps: 2 }],
    });
  });

  it("compiles broadcast sender and receiver blocks", () => {
    const receiver = compileBlockForRuntime({
      ...fakeBlock("kids_when_message"),
      getFieldValue: () => "游戏成功",
    });
    const sender = compileBlockForRuntime({
      ...fakeBlock("kids_broadcast"),
      getFieldValue: () => "游戏成功",
    });
    expect(receiver).toMatchObject({
      type: "EVT_MESSAGE",
      message: "游戏成功",
    });
    expect(sender).toMatchObject({
      type: "EVT_BROADCAST",
      message: "游戏成功",
    });
  });

  it("compiles scene start and next scene blocks", () => {
    expect(
      compileBlockForRuntime(fakeBlock("kids_when_scene_starts")),
    ).toMatchObject({ type: "EVT_SCENE_START" });
    expect(compileBlockForRuntime(fakeBlock("kids_next_scene"))).toMatchObject({
      type: "SCENE_NEXT",
    });
  });

  it("compiles touching events and return-to-start actions", () => {
    const touching = compileBlockForRuntime({
      ...fakeBlock("kids_when_touching"),
      getFieldValue: () => "spr_box",
    });
    expect(touching).toMatchObject({
      type: "EVT_TOUCH",
      targetSpriteId: "spr_box",
    });
    expect(compileBlockForRuntime(fakeBlock("kids_goto_start"))).toMatchObject({
      type: "MOT_GOTO_START",
    });
  });

  it("compiles stop scope and game results", () => {
    const stop = compileBlockForRuntime({
      ...fakeBlock("kids_stop"),
      getFieldValue: () => "all",
    });
    const result = compileBlockForRuntime({
      ...fakeBlock("kids_result"),
      getFieldValue: (field) =>
        field === "RESULT" ? "failure" : "再试一次吧！",
    });
    expect(stop).toMatchObject({ type: "CTL_STOP", scope: "all" });
    expect(result).toMatchObject({
      type: "GAME_RESULT",
      result: "failure",
      message: "再试一次吧！",
    });
  });

  it("compiles a generic if with touching and score logic", () => {
    const touching: RuntimeCompilableBlock = {
      ...fakeBlock("kids_touching_condition"),
      getFieldValue: () => "spr_box",
    };
    const score: RuntimeCompilableBlock = {
      ...fakeBlock("kids_score_compare"),
      getFieldValue: () => "gt",
      getInputTargetBlock: (input) =>
        input === "RIGHT" ? { getFieldValue: () => 3 } : null,
    };
    const condition: RuntimeCompilableBlock = {
      ...fakeBlock("kids_logic_and"),
      getInputTargetBlock: (input) =>
        input === "LEFT" ? touching : input === "RIGHT" ? score : null,
    };
    const body = fakeBlock("kids_score_change", { DELTA: { NUM: 2 } });
    const result = compileBlockForRuntime({
      ...fakeBlock("kids_if"),
      getInputTargetBlock: (input) =>
        input === "CONDITION" ? condition : input === "SUBSTACK" ? body : null,
    });

    expect(result).toMatchObject({
      type: "CTL_IF",
      condition: {
        type: "COND_AND",
        left: { type: "COND_TOUCHING", targetSpriteId: "spr_box" },
        right: {
          type: "COND_COMPARE",
          operator: "gt",
          left: { type: "NUMBER_SCORE" },
          right: { type: "NUMBER_LITERAL", value: 3 },
        },
      },
      body: [{ type: "GAME_CHANGE_SCORE", delta: 2 }],
    });
  });

  it("compiles if/else, not, or, and a random number range", () => {
    const random: RuntimeCompilableBlock = {
      ...fakeBlock("kids_random_number"),
      getInputTargetBlock: (input) => ({
        getFieldValue: () => (input === "FROM" ? 2 : 6),
      }),
    };
    const compare: RuntimeCompilableBlock = {
      ...fakeBlock("kids_score_compare"),
      getFieldValue: () => "lt",
      getInputTargetBlock: (input) => (input === "RIGHT" ? random : null),
    };
    const not: RuntimeCompilableBlock = {
      ...fakeBlock("kids_logic_not"),
      getInputTargetBlock: (input) => (input === "OPERAND" ? compare : null),
    };
    const condition: RuntimeCompilableBlock = {
      ...fakeBlock("kids_logic_or"),
      getInputTargetBlock: (input) =>
        input === "LEFT" ? not : input === "RIGHT" ? compare : null,
    };
    const result = compileBlockForRuntime({
      ...fakeBlock("kids_if_else"),
      getInputTargetBlock: (input) =>
        input === "CONDITION"
          ? condition
          : input === "SUBSTACK"
            ? fakeBlock("looks_show")
            : input === "SUBSTACK2"
              ? fakeBlock("looks_hide")
              : null,
    });

    expect(result).toMatchObject({
      type: "CTL_IF_ELSE",
      condition: {
        type: "COND_OR",
        left: { type: "COND_NOT" },
        right: {
          type: "COND_COMPARE",
          operator: "lt",
          right: { type: "NUMBER_RANDOM", from: 2, to: 6 },
        },
      },
      thenBody: [{ type: "LOOK_SHOW" }],
      elseBody: [{ type: "LOOK_HIDE" }],
    });
  });

  it("compiles variable set, increase, decrease, and visibility actions", () => {
    for (const [type, runtimeType] of [
      ["kids_variable_set", "GAME_SET_VARIABLE"],
      ["kids_variable_increase", "GAME_CHANGE_VARIABLE"],
      ["kids_variable_decrease", "GAME_CHANGE_VARIABLE"],
      ["kids_variable_show", "GAME_SHOW_VARIABLE"],
      ["kids_variable_hide", "GAME_SHOW_VARIABLE"],
    ] as const) {
      const result = compileBlockForRuntime({
        ...fakeBlock(type, { VALUE: { NUM: 3 } }),
        getFieldValue: () => "var_energy",
      });
      expect(result).toMatchObject({
        type: runtimeType,
        variableId: "var_energy",
      });
    }
  });

  it("compiles variables as values in conditions", () => {
    const condition: RuntimeCompilableBlock = {
      ...fakeBlock("kids_variable_compare", { RIGHT: { NUM: 8 } }),
      getFieldValue: (field) => (field === "OP" ? "eq" : "var_energy"),
    };
    const result = compileBlockForRuntime({
      ...fakeBlock("kids_if"),
      getInputTargetBlock: (input) =>
        input === "CONDITION" ? condition : null,
    });
    expect(result).toMatchObject({
      type: "CTL_IF",
      condition: {
        type: "COND_COMPARE",
        operator: "eq",
        left: { type: "NUMBER_VARIABLE", variableId: "var_energy" },
        right: { type: "NUMBER_LITERAL", value: 8 },
      },
    });
  });
});
