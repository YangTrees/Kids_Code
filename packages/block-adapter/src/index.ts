import * as ScratchBlocks from "scratch-blocks";
import { runtimeScriptSchema, type RuntimeScript } from "@kids-code/domain";
import { compileBlockForRuntime } from "./compiler";
import {
  BLOCK_PALETTE,
  filterTeachingToolbox,
  type ToolboxItem,
} from "./teaching";
import { numberParameter, type BlockParameter } from "./parameters";
import { getMediaBaseUrl } from "./media";
export { getMediaBaseUrl, setMediaBaseUrl } from "./media";
export {
  numberParameter,
  validateParameter,
  type BlockParameter,
} from "./parameters";
export {
  BLOCK_PALETTE,
  filterTeachingToolbox,
  type ToolboxCategory,
} from "./teaching";

export {
  compileBlockForRuntime,
  type RuntimeCompilableBlock,
} from "./compiler";

export type WorkspaceChangeListener = (workspaceState: object) => void;
export type WorkspaceCategory =
  | "event"
  | "motion"
  | "looks"
  | "sound"
  | "control"
  | "game"
  | "variable"
  | "operator";

const categoryPosition: Record<WorkspaceCategory, number> = {
  event: 0,
  motion: 1,
  looks: 2,
  sound: 3,
  control: 4,
  game: 5,
  variable: 6,
  operator: 7,
};

export interface WorkspaceToolboxContext {
  selectedSpriteId: string;
  sprites: Array<{ spriteId: string; name: string }>;
  scenes: Array<{ sceneId: string; name: string }>;
  spriteAssets: Array<{ assetId: string; name: string }>;
  sounds: Array<{ assetId: string; name: string }>;
  messages: Array<{ messageId: string; name: string }>;
  variables: Array<{ variableId: string; name: string }>;
  onCreateVariable?: () => void;
  maxBlocks?: number;
  allowedBlockTypes?: readonly string[];
  coordinateGrid?: { columns: number; rows: number };
}

let activeToolboxContext: WorkspaceToolboxContext | null = null;

const menuOptions = (
  values: Array<{ id: string; name: string }>,
  fallback: [string, string],
): [string, string][] =>
  values.length > 0
    ? values.map((value) => [value.name, value.id])
    : [fallback];

const spriteTargetOptions = (): [string, string][] =>
  activeToolboxContext
    ? menuOptions(
        activeToolboxContext.sprites
          .filter(
            (sprite) =>
              sprite.spriteId !== activeToolboxContext?.selectedSpriteId,
          )
          .map((sprite) => ({
            id: sprite.spriteId,
            name: sprite.name,
          })),
        ["星星金币", "spr_coin"],
      )
    : [
        ["宝箱", "spr_box"],
        ["星星金币", "spr_coin"],
        ["栗奇", "spr_liji"],
      ];

const sceneOptions = (): [string, string][] =>
  menuOptions(
    (activeToolboxContext?.scenes ?? []).map((scene) => ({
      id: scene.sceneId,
      name: scene.name,
    })),
    ["当前场景", "scn_forest"],
  );

const costumeOptions = (): [string, string][] =>
  activeToolboxContext
    ? menuOptions(
        activeToolboxContext.spriteAssets.map((asset) => ({
          id: asset.assetId,
          name: asset.name,
        })),
        ["栗奇", "costume_liji_idle"],
      )
    : [
        ["栗奇", "costume_liji_idle"],
        ["宝箱", "obj_treasure_chest"],
        ["星星金币", "obj_star_coin"],
      ];

const soundOptions = (): [string, string][] =>
  activeToolboxContext
    ? menuOptions(
        activeToolboxContext.sounds.map((sound) => ({
          id: sound.assetId,
          name: sound.name,
        })),
        ["按钮声", "sfx_ui_click"],
      )
    : [
        ["按钮声", "sfx_ui_click"],
        ["收集金币", "sfx_collect_coin"],
        ["闯关成功", "sfx_game_success"],
      ];

const messageOptions = (): [string, string][] =>
  activeToolboxContext
    ? menuOptions(
        activeToolboxContext.messages.map((message) => ({
          id: message.name,
          name: message.name,
        })),
        ["开始游戏", "开始游戏"],
      )
    : [
        ["开始游戏", "开始游戏"],
        ["找到宝箱", "找到宝箱"],
        ["游戏成功", "游戏成功"],
      ];

const variableOptions = (): [string, string][] =>
  menuOptions(
    (activeToolboxContext?.variables ?? []).map((variable) => ({
      id: variable.variableId,
      name: variable.name,
    })),
    ["先创建变量", "var_missing"],
  );

const seedMessages = (): void => {
  Object.assign(ScratchBlocks.Msg, {
    EVENT_WHENFLAGCLICKED: "点击 %1 时",
    EVENT_WHENKEYPRESSED: "按下 %1 键时",
    EVENT_WHENKEYPRESSED_SPACE: "空格",
    EVENT_WHENKEYPRESSED_LEFT: "←",
    EVENT_WHENKEYPRESSED_RIGHT: "→",
    EVENT_WHENKEYPRESSED_UP: "↑",
    EVENT_WHENKEYPRESSED_DOWN: "↓",
    EVENT_WHENKEYPRESSED_ANY: "任意",
    EVENT_WHENTHISSPRITECLICKED: "点击这个角色时",
    MOTION_MOVESTEPS: "向右移动 %1 格",
    MOTION_TURNRIGHT: "右转 %1 %2 度",
    MOTION_GOTOXY: "移动到 X %1 列 Y %2 行",
    LOOKS_SAYFORSECS: "说 %1 %2 秒",
    LOOKS_SHOW: "显示",
    LOOKS_HIDE: "隐藏",
    LOOKS_CHANGESIZEBY: "将大小增加 %1",
    SOUND_PLAY: "播放声音 %1",
    SOUND_STOPALLSOUNDS: "停止所有声音",
    CONTROL_WAIT: "等待 %1 秒",
    CONTROL_REPEAT: "重复 %1 次",
    CONTROL_FOREVER: "重复执行",
  });
};

const registerKidsBlocks = (): void => {
  if (!ScratchBlocks.Blocks.kids_step_picker) {
    ScratchBlocks.Extensions.register(
      "kids_picker_no_drag",
      function (this: ScratchBlocks.Block) {
        this.setMovable(false);
        this.setDeletable(false);
      },
    );
    const picker = (type: string, values: string[]) => ({
      type,
      message0: "%1",
      args0: [
        {
          type: "field_grid_dropdown",
          name: "VALUE",
          options: values.map((value) => [value, value]),
          columns: Math.min(values.length, 5),
        },
      ],
      extensions: ["colours_textfield", "output_number", "kids_picker_no_drag"],
    });
    ScratchBlocks.defineBlocksWithJsonArray([
      picker(
        "kids_step_picker",
        Array.from({ length: 10 }, (_, index) => String(index + 1)),
      ),
      picker("kids_angle_picker", ["15", "30", "45", "90"]),
      picker("kids_duration_picker", ["0.5", "1", "2", "3", "5"]),
      picker("kids_repeat_picker", ["2", "3", "4", "5", "10"]),
      picker("kids_size_picker", ["-20", "-10", "10", "20", "50"]),
    ]);
  }
  if (!ScratchBlocks.Blocks.kids_move_left) {
    ScratchBlocks.defineBlocksWithJsonArray([
      {
        type: "kids_move_left",
        message0: "向左移动 %1 格",
        args0: [{ type: "input_value", name: "STEPS" }],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.motion,
      },
    ]);
  }
  if (!ScratchBlocks.Blocks.kids_move_forward) {
    ScratchBlocks.defineBlocksWithJsonArray([
      {
        type: "kids_move_forward",
        message0: "朝面向方向前进 %1 格",
        args0: [{ type: "input_value", name: "STEPS" }],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.motion,
      },
    ]);
  }
  if (!ScratchBlocks.Blocks.kids_turn_left) {
    ScratchBlocks.defineBlocksWithJsonArray([
      {
        type: "kids_turn_left",
        message0: "左转 %1 度",
        args0: [{ type: "input_value", name: "DEGREES" }],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.motion,
      },
    ]);
  }
  if (!ScratchBlocks.Blocks.kids_move_up) {
    ScratchBlocks.defineBlocksWithJsonArray([
      {
        type: "kids_move_up",
        message0: "向上移动 %1 格",
        args0: [{ type: "input_value", name: "STEPS" }],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.motion,
      },
      {
        type: "kids_move_down",
        message0: "向下移动 %1 格",
        args0: [{ type: "input_value", name: "STEPS" }],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.motion,
      },
    ]);
  }
  if (!ScratchBlocks.Blocks.kids_switch_scene) {
    ScratchBlocks.defineBlocksWithJsonArray([
      {
        type: "kids_switch_scene",
        message0: "切换到场景 %1",
        args0: [
          {
            type: "field_dropdown",
            name: "SCENE",
            options: sceneOptions,
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.game,
      },
      {
        type: "kids_switch_costume",
        message0: "切换造型为 %1",
        args0: [
          {
            type: "field_dropdown",
            name: "COSTUME",
            options: costumeOptions,
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.looks,
      },
    ]);
  }
  if (!ScratchBlocks.Blocks.kids_sound_menu) {
    ScratchBlocks.defineBlocksWithJsonArray([
      {
        type: "kids_sound_menu",
        message0: "%1",
        args0: [
          {
            type: "field_dropdown",
            name: "SOUND_MENU",
            options: soundOptions,
          },
        ],
        output: "String",
        colour: BLOCK_PALETTE.sound,
        extensions: ["kids_picker_no_drag"],
      },
    ]);
  }
  if (!ScratchBlocks.Blocks.kids_score_set) {
    ScratchBlocks.defineBlocksWithJsonArray([
      {
        type: "kids_score_set",
        message0: "将得分设为 %1",
        args0: [{ type: "input_value", name: "VALUE" }],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.game,
      },
      {
        type: "kids_score_change",
        message0: "将得分增加 %1",
        args0: [{ type: "input_value", name: "DELTA" }],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.game,
      },
      {
        type: "kids_if_touching",
        message0: "如果碰到 %1",
        args0: [
          {
            type: "field_dropdown",
            name: "TARGET",
            options: spriteTargetOptions,
          },
        ],
        message1: "那么 %1",
        args1: [{ type: "input_statement", name: "SUBSTACK" }],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.control,
      },
    ]);
  }
  if (!ScratchBlocks.Blocks.kids_if) {
    ScratchBlocks.defineBlocksWithJsonArray([
      {
        type: "kids_if",
        message0: "如果 %1 那么",
        args0: [{ type: "input_value", name: "CONDITION", check: "Boolean" }],
        message1: "%1",
        args1: [{ type: "input_statement", name: "SUBSTACK" }],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.control,
      },
      {
        type: "kids_if_else",
        message0: "如果 %1 那么",
        args0: [{ type: "input_value", name: "CONDITION", check: "Boolean" }],
        message1: "%1 否则",
        args1: [{ type: "input_statement", name: "SUBSTACK" }],
        message2: "%1",
        args2: [{ type: "input_statement", name: "SUBSTACK2" }],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.control,
      },
      {
        type: "kids_touching_condition",
        message0: "碰到 %1？",
        args0: [
          {
            type: "field_dropdown",
            name: "TARGET",
            options: spriteTargetOptions,
          },
        ],
        extensions: ["output_boolean"],
        colour: "#4CBFE6",
      },
      {
        type: "kids_score_compare",
        message0: "得分 %1 %2",
        args0: [
          {
            type: "field_dropdown",
            name: "OP",
            options: [
              ["大于", "gt"],
              ["等于", "eq"],
              ["小于", "lt"],
            ],
          },
          { type: "input_value", name: "RIGHT", check: "Number" },
        ],
        extensions: ["output_boolean"],
        colour: BLOCK_PALETTE.operator,
      },
      {
        type: "kids_logic_and",
        message0: "%1 并且 %2",
        args0: [
          { type: "input_value", name: "LEFT", check: "Boolean" },
          { type: "input_value", name: "RIGHT", check: "Boolean" },
        ],
        extensions: ["output_boolean"],
        colour: BLOCK_PALETTE.operator,
      },
      {
        type: "kids_logic_or",
        message0: "%1 或者 %2",
        args0: [
          { type: "input_value", name: "LEFT", check: "Boolean" },
          { type: "input_value", name: "RIGHT", check: "Boolean" },
        ],
        extensions: ["output_boolean"],
        colour: BLOCK_PALETTE.operator,
      },
      {
        type: "kids_logic_not",
        message0: "不满足 %1",
        args0: [{ type: "input_value", name: "OPERAND", check: "Boolean" }],
        extensions: ["output_boolean"],
        colour: BLOCK_PALETTE.operator,
      },
      {
        type: "kids_random_number",
        message0: "随机数 %1 到 %2",
        args0: [
          { type: "input_value", name: "FROM", check: "Number" },
          { type: "input_value", name: "TO", check: "Number" },
        ],
        extensions: ["output_number"],
        colour: BLOCK_PALETTE.operator,
      },
    ]);
  }
  if (!ScratchBlocks.Blocks.kids_variable_set) {
    const variableField = () => ({
      type: "field_dropdown",
      name: "VARIABLE",
      options: variableOptions,
    });
    ScratchBlocks.defineBlocksWithJsonArray([
      {
        type: "kids_variable_set",
        message0: "将 %1 设为 %2",
        args0: [
          variableField(),
          { type: "input_value", name: "VALUE", check: "Number" },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.variable,
      },
      {
        type: "kids_variable_increase",
        message0: "将 %1 增加 %2",
        args0: [
          variableField(),
          { type: "input_value", name: "VALUE", check: "Number" },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.variable,
      },
      {
        type: "kids_variable_decrease",
        message0: "将 %1 减少 %2",
        args0: [
          variableField(),
          { type: "input_value", name: "VALUE", check: "Number" },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.variable,
      },
      {
        type: "kids_variable_show",
        message0: "显示变量 %1",
        args0: [variableField()],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.variable,
      },
      {
        type: "kids_variable_hide",
        message0: "隐藏变量 %1",
        args0: [variableField()],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.variable,
      },
      {
        type: "kids_variable_value",
        message0: "%1 的值",
        args0: [variableField()],
        extensions: ["output_number"],
        colour: BLOCK_PALETTE.variable,
      },
      {
        type: "kids_variable_compare",
        message0: "%1 %2 %3",
        args0: [
          variableField(),
          {
            type: "field_dropdown",
            name: "OP",
            options: [
              ["大于", "gt"],
              ["等于", "eq"],
              ["小于", "lt"],
            ],
          },
          { type: "input_value", name: "RIGHT", check: "Number" },
        ],
        extensions: ["output_boolean"],
        colour: BLOCK_PALETTE.operator,
      },
    ]);
  }
  if (!ScratchBlocks.Blocks.kids_when_message) {
    ScratchBlocks.defineBlocksWithJsonArray([
      {
        type: "kids_when_message",
        message0: "收到消息 %1 时",
        args0: [
          {
            type: "field_dropdown",
            name: "MESSAGE",
            options: messageOptions,
          },
        ],
        nextStatement: null,
        colour: BLOCK_PALETTE.event,
      },
      {
        type: "kids_broadcast",
        message0: "广播消息 %1",
        args0: [
          {
            type: "field_dropdown",
            name: "MESSAGE",
            options: messageOptions,
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.event,
      },
    ]);
  }
  if (!ScratchBlocks.Blocks.kids_when_scene_starts) {
    ScratchBlocks.defineBlocksWithJsonArray([
      {
        type: "kids_when_scene_starts",
        message0: "场景开始时",
        nextStatement: null,
        colour: BLOCK_PALETTE.event,
      },
      {
        type: "kids_next_scene",
        message0: "切换到下一个场景",
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.game,
      },
    ]);
  }
  if (!ScratchBlocks.Blocks.kids_when_touching) {
    ScratchBlocks.defineBlocksWithJsonArray([
      {
        type: "kids_when_touching",
        message0: "碰到 %1 时",
        args0: [
          {
            type: "field_dropdown",
            name: "TARGET",
            options: spriteTargetOptions,
          },
        ],
        nextStatement: null,
        colour: BLOCK_PALETTE.event,
      },
      {
        type: "kids_while_touching",
        message0: "持续碰到 %1 时",
        args0: [
          {
            type: "field_dropdown",
            name: "TARGET",
            options: spriteTargetOptions,
          },
        ],
        nextStatement: null,
        colour: BLOCK_PALETTE.event,
      },
      {
        type: "kids_when_touch_end",
        message0: "离开 %1 时",
        args0: [
          {
            type: "field_dropdown",
            name: "TARGET",
            options: spriteTargetOptions,
          },
        ],
        nextStatement: null,
        colour: BLOCK_PALETTE.event,
      },
      {
        type: "kids_goto_start",
        message0: "回到起点",
        previousStatement: null,
        nextStatement: null,
        colour: BLOCK_PALETTE.motion,
      },
      {
        type: "kids_stop",
        message0: "停止 %1",
        args0: [
          {
            type: "field_dropdown",
            name: "SCOPE",
            options: [
              ["当前脚本", "this"],
              ["全部脚本", "all"],
            ],
          },
        ],
        previousStatement: null,
        colour: BLOCK_PALETTE.control,
      },
      {
        type: "kids_result",
        message0: "游戏 %1 %2",
        args0: [
          {
            type: "field_dropdown",
            name: "RESULT",
            options: [
              ["成功", "success"],
              ["失败", "failure"],
            ],
          },
          {
            type: "field_input",
            name: "MESSAGE",
            text: "太棒了！",
          },
        ],
        previousStatement: null,
        colour: BLOCK_PALETTE.game,
      },
    ]);
  }
};

const registerUnknownSerializedBlocks = (workspaceState?: object): void => {
  if (!workspaceState) return;
  const types = new Set<string>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (
      "type" in value &&
      typeof (value as { type?: unknown }).type === "string"
    )
      types.add((value as { type: string }).type);
    for (const child of Object.values(value)) visit(child);
  };
  visit(workspaceState);
  for (const type of types) {
    if (ScratchBlocks.Blocks[type]) continue;
    ScratchBlocks.defineBlocksWithJsonArray([
      {
        type,
        message0: `暂不支持：${type}`,
        previousStatement: null,
        nextStatement: null,
        colour: "#9AA8B7",
      },
    ]);
  }
};

const blockStyle = (primary: string, secondary: string, tertiary: string) => ({
  colourPrimary: primary,
  colourSecondary: secondary,
  colourTertiary: tertiary,
  hat: "",
});

const kidsCodeTheme = ScratchBlocks.Theme.defineTheme("kids-code", {
  name: "kids-code",
  blockStyles: {
    event: blockStyle(BLOCK_PALETTE.event, "#D99800", "#B77900"),
    motion: blockStyle(BLOCK_PALETTE.motion, "#2674D8", "#1C5EB7"),
    looks: blockStyle(BLOCK_PALETTE.looks, "#6F3FCB", "#5730A5"),
    sounds: blockStyle(BLOCK_PALETTE.sound, "#C83778", "#A42A62"),
    control: blockStyle(BLOCK_PALETTE.control, "#D96B10", "#B65308"),
    data: blockStyle(BLOCK_PALETTE.variable, "#DB6E00", "#B85800"),
    data_lists: blockStyle("#FF661A", "#DB4D00", "#B83E00"),
    sensing: blockStyle("#4CBFE6", "#2CA7D1", "#2187AA"),
    pen: blockStyle("#0FBD8C", "#0B9F76", "#087D5D"),
    operators: blockStyle(BLOCK_PALETTE.operator, "#3FA33F", "#318231"),
    more: blockStyle("#FF6680", "#DB4D68", "#B83E55"),
    game: blockStyle(BLOCK_PALETTE.game, "#3E9F30", "#2F7D24"),
    textField: blockStyle("#FFFFFF", "#E8EEF5", "#C9D5E4"),
  },
  componentStyles: {
    workspaceBackgroundColour: "#ffffff00",
    toolboxBackgroundColour: "#f4f8fd",
    toolboxForegroundColour: "#38547a",
    flyoutBackgroundColour: "#f4f8fd",
    flyoutForegroundColour: "#38547a",
    flyoutOpacity: 0.96,
    scrollbarColour: "#b8cce1",
    scrollbarOpacity: 0.8,
    insertionMarkerColour: "#ffffff",
    insertionMarkerOpacity: 0.45,
    markerColour: "#287ff0",
    cursorColour: "#287ff0",
    selectedGlowColour: "#ffe36b",
    selectedGlowOpacity: 0.65,
    replacementGlowColour: "#ffffff",
    replacementGlowOpacity: 0.55,
  },
  fontStyle: {
    family: '"Microsoft YaHei", sans-serif',
    weight: "700",
    size: 13,
  },
});

const kidsToolbox: {
  kind: string;
  contents: Array<{
    kind: string;
    name: string;
    colour: string;
    contents: ToolboxItem[];
  }>;
} = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "事件",
      colour: BLOCK_PALETTE.event,
      contents: [
        { kind: "block", type: "event_whenflagclicked" },
        { kind: "block", type: "event_whenkeypressed" },
        { kind: "block", type: "event_whenthisspriteclicked" },
        { kind: "block", type: "kids_when_touching" },
        { kind: "block", type: "kids_while_touching" },
        { kind: "block", type: "kids_when_touch_end" },
        { kind: "block", type: "kids_when_message" },
        { kind: "block", type: "kids_when_scene_starts" },
        { kind: "block", type: "kids_broadcast" },
      ],
    },
    {
      kind: "category",
      name: "动作",
      colour: BLOCK_PALETTE.motion,
      contents: [
        {
          kind: "block",
          type: "motion_movesteps",
          inputs: {
            STEPS: {
              shadow: { type: "kids_step_picker", fields: { VALUE: "1" } },
            },
          },
        },
        {
          kind: "block",
          type: "kids_move_forward",
          inputs: {
            STEPS: {
              shadow: { type: "kids_step_picker", fields: { VALUE: "1" } },
            },
          },
        },
        {
          kind: "block",
          type: "kids_move_left",
          inputs: {
            STEPS: {
              shadow: { type: "kids_step_picker", fields: { VALUE: "1" } },
            },
          },
        },
        {
          kind: "block",
          type: "kids_move_up",
          inputs: {
            STEPS: {
              shadow: { type: "kids_step_picker", fields: { VALUE: "1" } },
            },
          },
        },
        {
          kind: "block",
          type: "kids_move_down",
          inputs: {
            STEPS: {
              shadow: { type: "kids_step_picker", fields: { VALUE: "1" } },
            },
          },
        },
        {
          kind: "block",
          type: "motion_turnright",
          inputs: {
            DEGREES: {
              shadow: {
                type: "kids_angle_picker",
                fields: { VALUE: "15" },
              },
            },
          },
        },
        {
          kind: "block",
          type: "kids_turn_left",
          inputs: {
            DEGREES: {
              shadow: {
                type: "kids_angle_picker",
                fields: { VALUE: "15" },
              },
            },
          },
        },
        { kind: "block", type: "kids_goto_start" },
        {
          kind: "block",
          type: "motion_gotoxy",
          inputs: {
            X: { shadow: { type: "math_number", fields: { NUM: 5 } } },
            Y: { shadow: { type: "math_number", fields: { NUM: 4 } } },
          },
        },
      ],
    },
    {
      kind: "category",
      name: "外观",
      colour: BLOCK_PALETTE.looks,
      contents: [
        {
          kind: "block",
          type: "looks_sayforsecs",
          inputs: {
            MESSAGE: {
              shadow: { type: "text", fields: { TEXT: "你好！" } },
            },
            SECS: {
              shadow: {
                type: "kids_duration_picker",
                fields: { VALUE: "2" },
              },
            },
          },
        },
        { kind: "block", type: "looks_show" },
        { kind: "block", type: "looks_hide" },
        {
          kind: "block",
          type: "looks_changesizeby",
          inputs: {
            CHANGE: {
              shadow: { type: "kids_size_picker", fields: { VALUE: "10" } },
            },
          },
        },
        { kind: "block", type: "kids_switch_costume" },
      ],
    },
    {
      kind: "category",
      name: "声音",
      colour: BLOCK_PALETTE.sound,
      contents: [
        {
          kind: "block",
          type: "sound_play",
          inputs: { SOUND_MENU: { shadow: { type: "kids_sound_menu" } } },
        },
        { kind: "block", type: "sound_stopallsounds" },
      ],
    },
    {
      kind: "category",
      name: "控制",
      colour: BLOCK_PALETTE.control,
      contents: [
        {
          kind: "block",
          type: "control_wait",
          inputs: {
            DURATION: {
              shadow: {
                type: "kids_duration_picker",
                fields: { VALUE: "1" },
              },
            },
          },
        },
        {
          kind: "block",
          type: "control_repeat",
          inputs: {
            TIMES: {
              shadow: { type: "kids_repeat_picker", fields: { VALUE: "2" } },
            },
          },
        },
        { kind: "block", type: "control_forever" },
        { kind: "block", type: "kids_if" },
        { kind: "block", type: "kids_if_else" },
        { kind: "block", type: "kids_touching_condition" },
        {
          kind: "block",
          type: "kids_score_compare",
          inputs: {
            RIGHT: { shadow: { type: "math_number", fields: { NUM: 1 } } },
          },
        },
        { kind: "block", type: "kids_logic_and" },
        { kind: "block", type: "kids_logic_or" },
        { kind: "block", type: "kids_logic_not" },
        {
          kind: "block",
          type: "kids_random_number",
          inputs: {
            FROM: { shadow: { type: "math_number", fields: { NUM: 1 } } },
            TO: { shadow: { type: "math_number", fields: { NUM: 10 } } },
          },
        },
        { kind: "block", type: "kids_if_touching" },
        { kind: "block", type: "kids_stop" },
      ],
    },
    {
      kind: "category",
      name: "游戏",
      colour: BLOCK_PALETTE.game,
      contents: [
        {
          kind: "button",
          text: "＋ 创建变量",
          callbackkey: "CREATE_KIDS_VARIABLE",
          "web-class": "kids-create-variable-button",
        },
        {
          kind: "block",
          type: "kids_variable_set",
          inputs: {
            VALUE: { shadow: { type: "math_number", fields: { NUM: 0 } } },
          },
        },
        {
          kind: "block",
          type: "kids_variable_increase",
          inputs: {
            VALUE: { shadow: { type: "math_number", fields: { NUM: 1 } } },
          },
        },
        {
          kind: "block",
          type: "kids_variable_decrease",
          inputs: {
            VALUE: { shadow: { type: "math_number", fields: { NUM: 1 } } },
          },
        },
        { kind: "block", type: "kids_variable_show" },
        { kind: "block", type: "kids_variable_hide" },
        { kind: "block", type: "kids_variable_value" },
        {
          kind: "block",
          type: "kids_variable_compare",
          inputs: {
            RIGHT: { shadow: { type: "math_number", fields: { NUM: 1 } } },
          },
        },
        {
          kind: "block",
          type: "kids_score_set",
          inputs: {
            VALUE: { shadow: { type: "math_number", fields: { NUM: 0 } } },
          },
        },
        {
          kind: "block",
          type: "kids_score_change",
          inputs: {
            DELTA: { shadow: { type: "math_number", fields: { NUM: 1 } } },
          },
        },
        { kind: "block", type: "kids_switch_scene" },
        { kind: "block", type: "kids_next_scene" },
        { kind: "block", type: "kids_result" },
      ],
    },
  ],
};

// Real categories follow semantic block colors, including mixed score/data lessons.
const operatorTypes = new Set([
  "kids_score_compare",
  "kids_variable_compare",
  "kids_logic_and",
  "kids_logic_or",
  "kids_logic_not",
  "kids_random_number",
]);
const controlItems = kidsToolbox.contents[4]!.contents;
const gameItems = kidsToolbox.contents[5]!.contents;
const operatorItems = [...controlItems, ...gameItems].filter(
  (item) => "type" in item && operatorTypes.has(item.type!),
);
const variableItems = gameItems.filter(
  (item) =>
    item.kind === "button" ||
    ("type" in item &&
      item.type!.startsWith("kids_variable_") &&
      !operatorTypes.has(item.type!)),
);
kidsToolbox.contents[4]!.contents = controlItems.filter(
  (item) => !("type" in item && operatorTypes.has(item.type!)),
);
kidsToolbox.contents[5]!.contents = gameItems.filter(
  (item) =>
    item.kind !== "button" &&
    !(
      "type" in item &&
      (item.type!.startsWith("kids_variable_") || operatorTypes.has(item.type!))
    ),
);
kidsToolbox.contents.push({
  kind: "category",
  name: "变量",
  colour: BLOCK_PALETTE.variable,
  contents: variableItems,
});
kidsToolbox.contents.push({
  kind: "category",
  name: "运算",
  colour: BLOCK_PALETTE.operator,
  contents: operatorItems,
});

const editableInputDefaults: Record<
  string,
  Array<{
    inputName: string;
    shadowType: "math_number" | "text";
    fieldName: "NUM" | "TEXT";
    value: string;
  }>
> = {
  motion_movesteps: [
    {
      inputName: "STEPS",
      shadowType: "math_number",
      fieldName: "NUM",
      value: "1",
    },
  ],
  kids_move_forward: [
    {
      inputName: "STEPS",
      shadowType: "math_number",
      fieldName: "NUM",
      value: "1",
    },
  ],
  kids_move_left: [
    {
      inputName: "STEPS",
      shadowType: "math_number",
      fieldName: "NUM",
      value: "1",
    },
  ],
  kids_move_up: [
    {
      inputName: "STEPS",
      shadowType: "math_number",
      fieldName: "NUM",
      value: "1",
    },
  ],
  kids_move_down: [
    {
      inputName: "STEPS",
      shadowType: "math_number",
      fieldName: "NUM",
      value: "1",
    },
  ],
  motion_turnright: [
    {
      inputName: "DEGREES",
      shadowType: "math_number",
      fieldName: "NUM",
      value: "15",
    },
  ],
  kids_turn_left: [
    {
      inputName: "DEGREES",
      shadowType: "math_number",
      fieldName: "NUM",
      value: "15",
    },
  ],
  looks_sayforsecs: [
    {
      inputName: "MESSAGE",
      shadowType: "text",
      fieldName: "TEXT",
      value: "你好！",
    },
    {
      inputName: "SECS",
      shadowType: "math_number",
      fieldName: "NUM",
      value: "2",
    },
  ],
  looks_changesizeby: [
    {
      inputName: "CHANGE",
      shadowType: "math_number",
      fieldName: "NUM",
      value: "10",
    },
  ],
  control_wait: [
    {
      inputName: "DURATION",
      shadowType: "math_number",
      fieldName: "NUM",
      value: "1",
    },
  ],
  control_repeat: [
    {
      inputName: "TIMES",
      shadowType: "math_number",
      fieldName: "NUM",
      value: "2",
    },
  ],
};

const eventHatTypes = new Set([
  "event_whenflagclicked",
  "event_whenkeypressed",
  "event_whenthisspriteclicked",
  "kids_when_touching",
  "kids_while_touching",
  "kids_when_touch_end",
  "kids_when_message",
  "kids_when_scene_starts",
]);

const compileWorkspace = (
  workspace: ScratchBlocks.Workspace,
  ownerSpriteId: string,
): RuntimeScript[] =>
  workspace
    .getTopBlocks(true)
    .filter((block) => eventHatTypes.has(block.type))
    .map((topBlock) => {
      const blocks = [];
      let current: ScratchBlocks.Block | null = topBlock;
      while (current) {
        blocks.push(compileBlockForRuntime(current));
        current = current.getNextBlock();
      }
      return runtimeScriptSchema.parse({
        scriptId: `scr_${topBlock.id}`,
        ownerSpriteId,
        blocks,
      });
    });

export const compileSerializedWorkspace = (
  ownerSpriteId: string,
  workspaceState: object,
  toolboxContext?: WorkspaceToolboxContext,
): RuntimeScript[] => {
  seedMessages();
  registerKidsBlocks();
  registerUnknownSerializedBlocks(workspaceState);
  const previousContext = activeToolboxContext;
  const context = toolboxContext ?? previousContext;
  activeToolboxContext = context
    ? { ...context, selectedSpriteId: ownerSpriteId }
    : null;
  const workspace = new ScratchBlocks.Workspace();
  try {
    ScratchBlocks.serialization.workspaces.load(workspaceState, workspace);
    return compileWorkspace(workspace, ownerSpriteId);
  } finally {
    workspace.dispose();
    activeToolboxContext = previousContext;
  }
};

/**
 * Shadows are placeholders owned by their input, so they are never offered as
 * a standalone copy/delete target.
 */
const isDeletableBlock = (block: ScratchBlocks.Block): boolean =>
  block.isDeletable() && !block.isShadow();

/** A separate read-only workspace renders the same block definitions and colors. */
export function mountBlockPreview(
  container: HTMLElement,
  state: object,
  context?: WorkspaceToolboxContext,
): () => void {
  const previousContext = activeToolboxContext;
  activeToolboxContext = context ?? previousContext;
  try {
    seedMessages();
    registerKidsBlocks();
    const workspace = ScratchBlocks.inject(container, {
      scratchTheme: ScratchBlocks.ScratchBlocksTheme.CLASSIC,
      theme: kidsCodeTheme,
      readOnly: true,
      scrollbars: false,
      sounds: false,
      media: `${getMediaBaseUrl()}blockly-media/`,
      zoom: { startScale: 1 },
    });
    ScratchBlocks.serialization.workspaces.load(state, workspace);
    const bounds = workspace.getBlocksBoundingBox();
    container.style.height = `${Math.max(100, bounds.bottom - bounds.top + 36)}px`;
    container.style.minWidth = `${Math.max(280, bounds.right - bounds.left + 50)}px`;
    ScratchBlocks.svgResize(workspace);
    return () => workspace.dispose();
  } finally {
    activeToolboxContext = previousContext;
  }
}

export class BlockWorkspaceAdapter {
  #workspace: ScratchBlocks.WorkspaceSvg | null = null;
  #isLoading = false;
  #loadTimer: number | null = null;
  #parameterGrid = { columns: 12, rows: 9 };

  mount(
    container: Element,
    onChange?: WorkspaceChangeListener,
    initialState?: object,
    seedDefault = true,
    toolboxContext?: WorkspaceToolboxContext,
    lifecycle?: { onReady: () => void; onError: (error: unknown) => void },
  ): void {
    this.#isLoading = true;
    activeToolboxContext = toolboxContext ?? null;
    this.#parameterGrid = toolboxContext?.coordinateGrid ?? {
      columns: 12,
      rows: 9,
    };
    seedMessages();
    registerKidsBlocks();
    registerUnknownSerializedBlocks(initialState);
    this.#workspace = ScratchBlocks.inject(container, {
      scratchTheme: ScratchBlocks.ScratchBlocksTheme.CLASSIC,
      theme: kidsCodeTheme,
      toolbox: filterTeachingToolbox(
        kidsToolbox,
        toolboxContext?.allowedBlockTypes,
      ),
      maxBlocks: toolboxContext?.maxBlocks ?? 1_000,
      media: `${getMediaBaseUrl()}blockly-media/`,
      trashcan: false,
      sounds: false,
      scrollbars: true,
      move: { scrollbars: true, drag: true, wheel: true },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.82,
        maxScale: 1.3,
        minScale: 0.5,
      },
      grid: { spacing: 24, length: 2, colour: "#d8e4f3", snap: false },
    });
    // The editor owns the accessible category tabs; keep only the flyout here.
    this.#workspace.getToolbox()?.setVisible(false);
    this.#workspace.registerButtonCallback("CREATE_KIDS_VARIABLE", () =>
      activeToolboxContext?.onCreateVariable?.(),
    );

    this.#workspace.addChangeListener((event) => {
      if (event.isUiEvent || this.#isLoading || !onChange || !this.#workspace)
        return;
      onChange(ScratchBlocks.serialization.workspaces.save(this.#workspace));
    });

    const workspace = this.#workspace;
    this.#loadTimer = window.setTimeout(() => {
      this.#loadTimer = null;
      if (this.#workspace !== workspace) return;
      try {
        if (initialState) {
          ScratchBlocks.serialization.workspaces.load(initialState, workspace);
          this.#ensureEditableInputs();
        } else if (seedDefault) {
          this.#seedWorkspace();
        }
        this.#isLoading = false;
        lifecycle?.onReady();
      } catch (error) {
        // Keep a partially deserialized workspace out of the run/save path.
        this.#isLoading = true;
        if (lifecycle) lifecycle.onError(error);
        else console.error("Failed to restore block workspace", error);
      }
    }, 0);
  }

  #seedWorkspace(): void {
    if (!this.#workspace || this.#workspace.getAllBlocks(false).length > 0)
      return;

    const flag = this.#workspace.newBlock("event_whenflagclicked");
    const move = this.#workspace.newBlock("motion_movesteps");
    const say = this.#workspace.newBlock("looks_sayforsecs");
    const number = this.#workspace.newBlock("kids_step_picker");
    const seconds = this.#workspace.newBlock("kids_duration_picker");
    const message = this.#workspace.newBlock("text");

    number.setFieldValue("3", "VALUE");
    seconds.setFieldValue("2", "VALUE");
    message.setFieldValue("你好，我是栗奇！", "TEXT");
    move.getInput("STEPS")?.connection?.connect(number.outputConnection);
    say.getInput("MESSAGE")?.connection?.connect(message.outputConnection);
    say.getInput("SECS")?.connection?.connect(seconds.outputConnection);
    flag.nextConnection?.connect(move.previousConnection);
    move.nextConnection?.connect(say.previousConnection);

    for (const block of [flag, move, say, number, seconds, message]) {
      block.initSvg();
      block.render();
    }
    flag.moveBy(88, 52);
  }

  #ensureEditableInputs(): void {
    if (!this.#workspace) return;
    for (const block of this.#workspace.getAllBlocks(false)) {
      for (const inputDefault of editableInputDefaults[block.type] ?? []) {
        const input = block.getInput(inputDefault.inputName);
        if (!input?.connection || input.connection.targetBlock()) continue;
        const shadow = this.#workspace.newBlock(inputDefault.shadowType);
        shadow.setFieldValue(inputDefault.value, inputDefault.fieldName);
        shadow.setShadow(true);
        input.connection.connect(shadow.outputConnection);
        shadow.initSvg();
        shadow.render();
      }
    }
  }

  resize(): void {
    if (this.#workspace) ScratchBlocks.svgResize(this.#workspace);
  }

  selectCategory(category: WorkspaceCategory): void {
    this.#workspace
      ?.getToolbox()
      ?.selectItemByPosition(categoryPosition[category]);
  }

  save(): object | undefined {
    return this.#workspace
      ? ScratchBlocks.serialization.workspaces.save(this.#workspace)
      : undefined;
  }

  parameterAt(target: EventTarget | null): BlockParameter | null {
    if (!(target instanceof Element)) return null;
    const id = target.closest("[data-id]")?.getAttribute("data-id") ?? "";
    const block =
      this.#workspace?.getBlockById(id) ??
      this.#workspace?.getFlyout()?.getWorkspace().getBlockById(id);
    if (!block) return null;
    for (const input of block.inputList)
      for (const field of input.fieldRow) {
        // Scratch draws a sound-menu shadow as a capsule. Its padding and
        // outer path belong to the block SVG, outside the field's text/arrow
        // group. Those are still parameter clicks, not parent-block drags.
        const ownsSoundCapsule =
          field.name === "SOUND_MENU" &&
          (block.type === "kids_sound_menu" ||
            block.type === "sound_sounds_menu");
        const hitsField =
          field.getSvgRoot()?.contains(target) ||
          ((ownsSoundCapsule ||
            (block.isShadow() && field.isFullBlockField())) &&
            block.getSvgRoot()?.contains(target));
        if (!field.name || !hitsField) continue;
        const parent = block.getParent();
        const ownerInput =
          parent?.inputList.find(
            (item) => item.connection?.targetBlock() === block,
          )?.name ?? "";
        const numeric =
          field.name === "NUM" ||
          (field.name === "VALUE" && block.type.endsWith("_picker"));
        if (numeric) {
          const config = numberParameter(
            parent?.type ?? block.type,
            ownerInput,
            this.#parameterGrid,
          );
          return {
            blockId: block.id,
            fieldName: field.name,
            kind: "number",
            value: String(field.getValue()),
            label: config.label,
            number: config,
          };
        }
        if (field.name === "TEXT")
          return {
            blockId: block.id,
            fieldName: field.name,
            kind: "text",
            value: String(field.getValue()),
            label: "说话内容",
          };
        if (field instanceof ScratchBlocks.FieldDropdown)
          return {
            blockId: block.id,
            fieldName: field.name,
            kind: "select",
            value: String(field.getValue()),
            label:
              field.name === "TARGET"
                ? "选择角色"
                : field.name === "SCENE"
                  ? "选择场景"
                  : field.name === "SOUND_MENU"
                    ? "选择声音"
                    : field.name === "KEY_OPTION"
                      ? "选择按键"
                      : "选择参数",
            options: field.getOptions(false).flatMap((option) => {
              if (!Array.isArray(option) || typeof option[1] !== "string")
                return [];
              const label = option[0];
              return [
                {
                  label:
                    typeof label === "string"
                      ? label
                      : label && "alt" in label
                        ? String(label.alt)
                        : String(option[1]),
                  value: option[1],
                },
              ];
            }),
          };
      }
    return null;
  }

  listParameters(): BlockParameter[] {
    const parameters: BlockParameter[] = [];
    const seen = new Set<string>();
    for (const block of this.#workspace?.getAllBlocks(false) ?? []) {
      for (const input of block.inputList) {
        for (const field of input.fieldRow) {
          const parameter = this.parameterAt(field.getSvgRoot());
          if (!parameter) continue;
          const key = `${parameter.blockId}:${parameter.fieldName}`;
          if (seen.has(key)) continue;
          seen.add(key);
          parameters.push(parameter);
        }
      }
    }
    return parameters;
  }

  editParameter(parameter: BlockParameter, value: string): boolean {
    const block =
      this.#workspace?.getBlockById(parameter.blockId) ??
      this.#workspace
        ?.getFlyout()
        ?.getWorkspace()
        .getBlockById(parameter.blockId);
    if (!block || !block.getField(parameter.fieldName)) return false;
    ScratchBlocks.Events.setGroup(true);
    try {
      // Grid-picker dropdowns have a fixed menu. Preserve arbitrary legal numbers
      // as ordinary numeric shadows so saving/reloading cannot discard the value.
      if (parameter.kind === "number" && block.type.endsWith("_picker")) {
        const parent = block.getParent();
        const connection = parent?.inputList.find(
          (input) => input.connection?.targetBlock() === block,
        )?.connection;
        if (!connection) return false;
        const owner = block.workspace as ScratchBlocks.WorkspaceSvg;
        block.dispose();
        const shadow = owner.newBlock("math_number");
        shadow.setFieldValue(value, "NUM");
        shadow.setShadow(true);
        connection.connect(shadow.outputConnection);
        shadow.initSvg();
        shadow.render();
      } else block.setFieldValue(value, parameter.fieldName);
      return true;
    } finally {
      ScratchBlocks.Events.setGroup(false);
    }
  }

  cancelGesture(): void {
    this.#workspace?.cancelCurrentGesture();
    this.#workspace?.getFlyout()?.getWorkspace().cancelCurrentGesture();
  }

  compile(ownerSpriteId: string): RuntimeScript[] {
    if (!this.#workspace) return [];
    return compileWorkspace(this.#workspace, ownerSpriteId);
  }

  highlightBlock(blockId: string | null): void {
    this.#workspace?.highlightBlock(blockId);
  }

  /**
   * Maps a DOM event (for example a right-click) back to the block under the
   * cursor. Scratch Blocks tags every block SVG group with `data-id`, so the
   * lookup stays stable without reaching into library internals.
   */
  getBlockIdFromEventTarget(target: EventTarget | null): string | null {
    if (!this.#workspace || !(target instanceof Element)) return null;
    const owner = target.closest("[data-id]");
    const blockId = owner?.getAttribute("data-id");
    if (!blockId) return null;
    const block = this.#workspace.getBlockById(blockId);
    if (!block || block.isInFlyout) return null;
    return blockId;
  }

  /** How many blocks disappear when `blockId` is deleted. */
  getBlockStackSize(blockId: string): number {
    const block = this.#workspace?.getBlockById(blockId);
    if (!block) return 0;
    const deletable = block.getDescendants(false).filter(isDeletableBlock);
    const next = block.getNextBlock();
    if (!next) return Math.max(deletable.length, 1);
    // Blocks hanging below stay in the script, so they are not counted.
    const below = next.getDescendants(false).filter(isDeletableBlock);
    return Math.max(
      deletable.filter((item) => !below.includes(item)).length,
      1,
    );
  }

  canDeleteBlock(blockId: string): boolean {
    const block = this.#workspace?.getBlockById(blockId);
    return !!block && isDeletableBlock(block);
  }

  /** Copies the block together with everything connected below it. */
  duplicateBlock(blockId: string): boolean {
    const workspace = this.#workspace;
    if (!workspace) return false;
    const block = workspace.getBlockById(blockId);
    if (!block || block.isInFlyout) return false;
    const copyData = block.toCopyData(true);
    if (!copyData) return false;
    ScratchBlocks.Events.setGroup(true);
    try {
      return ScratchBlocks.clipboard.paste(copyData, workspace) !== null;
    } finally {
      ScratchBlocks.Events.setGroup(false);
    }
  }

  /**
   * Deletes the block with `healStack`, so the script stays continuous and the
   * change is undoable as a single step.
   */
  deleteBlock(blockId: string): boolean {
    const workspace = this.#workspace;
    if (!workspace) return false;
    const block = workspace.getBlockById(blockId);
    if (!block || block.isInFlyout || !isDeletableBlock(block)) return false;
    ScratchBlocks.Events.setGroup(true);
    try {
      block.dispose(true, true);
      return true;
    } finally {
      ScratchBlocks.Events.setGroup(false);
    }
  }

  /** Tidies up blocks that were dropped all over the workspace. */
  cleanUpBlocks(): void {
    this.#workspace?.cleanUp();
  }

  destroy(): void {
    if (this.#loadTimer !== null) window.clearTimeout(this.#loadTimer);
    this.#loadTimer = null;
    this.#isLoading = true;
    this.#workspace?.dispose();
    this.#workspace = null;
  }
}
