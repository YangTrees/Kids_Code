import type {
  RuntimeBlock,
  RuntimeCondition,
  RuntimeNumberExpression,
} from "@kids-code/domain";

export interface RuntimeCompilableBlock {
  id: string;
  type: string;
  getFieldValue?(fieldName: string): unknown;
  getInputTargetBlock(
    inputName: string,
  ):
    | RuntimeCompilableBlock
    | { getFieldValue?(fieldName: string): unknown }
    | null;
  getNextBlock?(): RuntimeCompilableBlock | null;
}

const numberInput = (
  block: RuntimeCompilableBlock,
  input: string,
  min: number,
  max: number,
  fallback: number,
) => {
  const value = Number(
    block.getInputTargetBlock(input)?.getFieldValue?.("NUM") ??
      block.getInputTargetBlock(input)?.getFieldValue?.("VALUE") ??
      fallback,
  );
  return Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
};

const numberField = (
  block: { getFieldValue?(fieldName: string): unknown } | null,
  min: number,
  max: number,
  fallback: number,
) => {
  const value = Number(
    block?.getFieldValue?.("NUM") ??
      block?.getFieldValue?.("VALUE") ??
      fallback,
  );
  return Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
};

const compileNumberExpression = (
  block:
    | RuntimeCompilableBlock
    | { getFieldValue?(fieldName: string): unknown }
    | null,
  fallback = 0,
): RuntimeNumberExpression => {
  const compilable = block as RuntimeCompilableBlock | null;
  if (compilable?.type === "kids_score_value") return { type: "NUMBER_SCORE" };
  if (compilable?.type === "kids_variable_value")
    return {
      type: "NUMBER_VARIABLE",
      variableId: String(compilable.getFieldValue?.("VARIABLE") ?? "var_1"),
    };
  if (compilable?.type === "kids_random_number") {
    return {
      type: "NUMBER_RANDOM",
      from: Math.round(
        numberField(compilable.getInputTargetBlock("FROM"), -9999, 9999, 1),
      ),
      to: Math.round(
        numberField(compilable.getInputTargetBlock("TO"), -9999, 9999, 10),
      ),
    };
  }
  return {
    type: "NUMBER_LITERAL",
    value: numberField(block, -9999, 9999, fallback),
  };
};

const compileCondition = (
  block:
    | RuntimeCompilableBlock
    | { getFieldValue?(fieldName: string): unknown }
    | null,
): RuntimeCondition => {
  const compilable = block as RuntimeCompilableBlock | null;
  if (!compilable?.type) return { type: "COND_BOOLEAN", value: false };
  switch (compilable.type) {
    case "kids_touching_condition":
      return {
        type: "COND_TOUCHING",
        targetSpriteId: String(
          compilable.getFieldValue?.("TARGET") ?? "spr_coin",
        ),
      };
    case "kids_score_compare": {
      const operator = compilable.getFieldValue?.("OP");
      return {
        type: "COND_COMPARE",
        operator: operator === "eq" || operator === "lt" ? operator : "gt",
        left: { type: "NUMBER_SCORE" },
        right: compileNumberExpression(
          compilable.getInputTargetBlock("RIGHT"),
          0,
        ),
      };
    }
    case "kids_variable_compare": {
      const operator = compilable.getFieldValue?.("OP");
      return {
        type: "COND_COMPARE",
        operator: operator === "eq" || operator === "lt" ? operator : "gt",
        left: {
          type: "NUMBER_VARIABLE",
          variableId: String(compilable.getFieldValue?.("VARIABLE") ?? "var_1"),
        },
        right: compileNumberExpression(
          compilable.getInputTargetBlock("RIGHT"),
          0,
        ),
      };
    }
    case "kids_logic_and":
    case "kids_logic_or":
      return {
        type: compilable.type === "kids_logic_and" ? "COND_AND" : "COND_OR",
        left: compileCondition(compilable.getInputTargetBlock("LEFT")),
        right: compileCondition(compilable.getInputTargetBlock("RIGHT")),
      };
    case "kids_logic_not":
      return {
        type: "COND_NOT",
        operand: compileCondition(compilable.getInputTargetBlock("OPERAND")),
      };
    default:
      return { type: "COND_BOOLEAN", value: false };
  }
};
const textInput = (
  block: RuntimeCompilableBlock,
  input: string,
  fallback: string,
) => {
  const value = block.getInputTargetBlock(input)?.getFieldValue?.("TEXT");
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};
const menuInput = (
  block: RuntimeCompilableBlock,
  input: string,
  field: string,
  fallback: string,
) => {
  const value = block.getInputTargetBlock(input)?.getFieldValue?.(field);
  return typeof value === "string" && value ? value : fallback;
};
const compileChain = (
  first:
    | RuntimeCompilableBlock
    | { getFieldValue?(fieldName: string): unknown }
    | null,
): RuntimeBlock[] => {
  const result: RuntimeBlock[] = [];
  let current = first as RuntimeCompilableBlock | null;
  while (current) {
    result.push(compileBlockForRuntime(current));
    current = current.getNextBlock?.() ?? null;
  }
  return result;
};

export const compileBlockForRuntime = (
  block: RuntimeCompilableBlock,
): RuntimeBlock => {
  const base = { id: `blk_${block.id}`, sourceBlockId: block.id };
  switch (block.type) {
    case "event_whenflagclicked":
      return { ...base, type: "EVT_FLAG" };
    case "event_whenkeypressed":
      return {
        ...base,
        type: "EVT_KEY",
        key: String(block.getFieldValue?.("KEY_OPTION") ?? "space"),
      };
    case "event_whenthisspriteclicked":
      return { ...base, type: "EVT_SPRITE_CLICK" };
    case "kids_when_touching":
      return {
        ...base,
        type: "EVT_TOUCH",
        targetSpriteId: String(block.getFieldValue?.("TARGET") ?? "spr_coin"),
      };
    case "kids_while_touching":
      return {
        ...base,
        type: "EVT_TOUCH_STAY",
        targetSpriteId: String(block.getFieldValue?.("TARGET") ?? "spr_coin"),
      };
    case "kids_when_touch_end":
      return {
        ...base,
        type: "EVT_TOUCH_EXIT",
        targetSpriteId: String(block.getFieldValue?.("TARGET") ?? "spr_coin"),
      };
    case "kids_when_scene_starts":
      return { ...base, type: "EVT_SCENE_START" };
    case "kids_when_message":
      return {
        ...base,
        type: "EVT_MESSAGE",
        message: String(block.getFieldValue?.("MESSAGE") ?? "开始游戏"),
      };
    case "kids_broadcast":
      return {
        ...base,
        type: "EVT_BROADCAST",
        message: String(block.getFieldValue?.("MESSAGE") ?? "开始游戏"),
      };
    case "kids_next_scene":
      return { ...base, type: "SCENE_NEXT" };
    case "motion_movesteps":
      return {
        ...base,
        type: "MOT_MOVE",
        direction: "right",
        steps: numberInput(block, "STEPS", 1, 10, 1),
      };
    case "kids_move_left":
      return {
        ...base,
        type: "MOT_MOVE",
        direction: "left",
        steps: numberInput(block, "STEPS", 1, 10, 1),
      };
    case "kids_move_up":
      return {
        ...base,
        type: "MOT_MOVE",
        direction: "up",
        steps: numberInput(block, "STEPS", 1, 10, 1),
      };
    case "kids_move_down":
      return {
        ...base,
        type: "MOT_MOVE",
        direction: "down",
        steps: numberInput(block, "STEPS", 1, 10, 1),
      };
    case "motion_turnright":
      return {
        ...base,
        type: "MOT_TURN",
        degrees: numberInput(block, "DEGREES", 1, 360, 15),
      };
    case "kids_turn_left":
      return {
        ...base,
        type: "MOT_TURN",
        degrees: -numberInput(block, "DEGREES", 1, 360, 15),
      };
    case "motion_gotoxy":
      return {
        ...base,
        type: "MOT_GOTO",
        x: numberInput(block, "X", 0, 480, 240),
        y: numberInput(block, "Y", 0, 360, 180),
      };
    case "kids_goto_start":
      return { ...base, type: "MOT_GOTO_START" };
    case "looks_sayforsecs":
      return {
        ...base,
        type: "LOOK_SAY",
        text: textInput(block, "MESSAGE", "你好！").slice(0, 40),
        duration: numberInput(block, "SECS", 0.1, 10, 2),
      };
    case "looks_show":
      return { ...base, type: "LOOK_SHOW" };
    case "looks_hide":
      return { ...base, type: "LOOK_HIDE" };
    case "looks_changesizeby":
      return {
        ...base,
        type: "LOOK_SIZE",
        delta: numberInput(block, "CHANGE", -80, 80, 10),
      };
    case "kids_switch_costume":
      return {
        ...base,
        type: "LOOK_COSTUME",
        costumeAssetId: String(
          block.getFieldValue?.("COSTUME") ?? "costume_liji_idle",
        ),
      };
    case "sound_play":
      return {
        ...base,
        type: "SND_PLAY",
        soundId: menuInput(block, "SOUND_MENU", "SOUND_MENU", "sfx_ui_click"),
      };
    case "sound_stopallsounds":
      return { ...base, type: "SND_STOP_ALL" };
    case "control_wait":
      return {
        ...base,
        type: "CTL_WAIT",
        duration: numberInput(block, "DURATION", 0.1, 10, 1),
      };
    case "control_repeat":
      return {
        ...base,
        type: "CTL_REPEAT",
        count: numberInput(block, "TIMES", 2, 10, 2),
        body: compileChain(block.getInputTargetBlock("SUBSTACK")),
      };
    case "control_forever":
      return {
        ...base,
        type: "CTL_FOREVER",
        body: compileChain(block.getInputTargetBlock("SUBSTACK")),
      };
    case "kids_if":
      return {
        ...base,
        type: "CTL_IF",
        condition: compileCondition(block.getInputTargetBlock("CONDITION")),
        body: compileChain(block.getInputTargetBlock("SUBSTACK")),
      };
    case "kids_if_else":
      return {
        ...base,
        type: "CTL_IF_ELSE",
        condition: compileCondition(block.getInputTargetBlock("CONDITION")),
        thenBody: compileChain(block.getInputTargetBlock("SUBSTACK")),
        elseBody: compileChain(block.getInputTargetBlock("SUBSTACK2")),
      };
    case "kids_stop":
      return {
        ...base,
        type: "CTL_STOP",
        scope: block.getFieldValue?.("SCOPE") === "all" ? "all" : "this",
      };
    case "kids_score_set":
      return {
        ...base,
        type: "GAME_SET_SCORE",
        value: numberInput(block, "VALUE", 0, 9999, 0),
      };
    case "kids_score_change":
      return {
        ...base,
        type: "GAME_CHANGE_SCORE",
        delta: numberInput(block, "DELTA", -1000, 1000, 1),
      };
    case "kids_variable_set":
      return {
        ...base,
        type: "GAME_SET_VARIABLE",
        variableId: String(block.getFieldValue?.("VARIABLE") ?? "var_1"),
        value: compileNumberExpression(block.getInputTargetBlock("VALUE"), 0),
      };
    case "kids_variable_increase":
    case "kids_variable_decrease":
      return {
        ...base,
        type: "GAME_CHANGE_VARIABLE",
        variableId: String(block.getFieldValue?.("VARIABLE") ?? "var_1"),
        delta: compileNumberExpression(block.getInputTargetBlock("VALUE"), 1),
        direction:
          block.type === "kids_variable_decrease" ? "decrease" : "increase",
      };
    case "kids_variable_show":
    case "kids_variable_hide":
      return {
        ...base,
        type: "GAME_SHOW_VARIABLE",
        variableId: String(block.getFieldValue?.("VARIABLE") ?? "var_1"),
        visible: block.type === "kids_variable_show",
      };
    case "kids_switch_scene":
      return {
        ...base,
        type: "SCENE_SWITCH",
        sceneId: String(block.getFieldValue?.("SCENE") ?? "scn_forest"),
      };
    case "kids_if_touching":
      return {
        ...base,
        type: "GAME_IF_TOUCHING",
        targetSpriteId: String(block.getFieldValue?.("TARGET") ?? "spr_coin"),
        body: compileChain(block.getInputTargetBlock("SUBSTACK")),
      };
    case "kids_result": {
      const message = String(block.getFieldValue?.("MESSAGE") ?? "太棒了！")
        .trim()
        .slice(0, 40);
      return {
        ...base,
        type: "GAME_RESULT",
        result:
          block.getFieldValue?.("RESULT") === "failure" ? "failure" : "success",
        message: message || "游戏结束",
      };
    }
    default:
      return { ...base, type: "UNSUPPORTED", originalType: block.type };
  }
};
