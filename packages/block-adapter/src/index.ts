import * as ScratchBlocks from "scratch-blocks";
import { runtimeScriptSchema, type RuntimeScript } from "@kids-code/domain";
import { compileBlockForRuntime } from "./compiler";

export {
  compileBlockForRuntime,
  type RuntimeCompilableBlock,
} from "./compiler";

export type WorkspaceChangeListener = (workspaceState: object) => void;
export type WorkspaceCategory =
  "event" | "motion" | "looks" | "sound" | "control" | "game";

const categoryPosition: Record<WorkspaceCategory, number> = {
  event: 0,
  motion: 1,
  looks: 2,
  sound: 3,
  control: 4,
  game: 5,
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
    EVENT_WHENTHISSPRITECLICKED: "点击这个角色时",
    MOTION_MOVESTEPS: "向右移动 %1 格",
    MOTION_TURNRIGHT: "右转 %1 %2 度",
    MOTION_GOTOXY: "移动到 X %1 Y %2",
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
        colour: "#428EF4",
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
        colour: "#428EF4",
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
        colour: "#428EF4",
      },
      {
        type: "kids_move_down",
        message0: "向下移动 %1 格",
        args0: [{ type: "input_value", name: "STEPS" }],
        previousStatement: null,
        nextStatement: null,
        colour: "#428EF4",
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
        colour: "#45B531",
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
        colour: "#8A55E8",
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
        colour: "#E34D91",
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
        colour: "#45B531",
      },
      {
        type: "kids_score_change",
        message0: "将得分增加 %1",
        args0: [{ type: "input_value", name: "DELTA" }],
        previousStatement: null,
        nextStatement: null,
        colour: "#45B531",
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
        colour: "#F58A25",
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
        colour: "#F58A25",
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
        colour: "#F58A25",
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
        colour: "#59C059",
      },
      {
        type: "kids_logic_and",
        message0: "%1 并且 %2",
        args0: [
          { type: "input_value", name: "LEFT", check: "Boolean" },
          { type: "input_value", name: "RIGHT", check: "Boolean" },
        ],
        extensions: ["output_boolean"],
        colour: "#59C059",
      },
      {
        type: "kids_logic_or",
        message0: "%1 或者 %2",
        args0: [
          { type: "input_value", name: "LEFT", check: "Boolean" },
          { type: "input_value", name: "RIGHT", check: "Boolean" },
        ],
        extensions: ["output_boolean"],
        colour: "#59C059",
      },
      {
        type: "kids_logic_not",
        message0: "不满足 %1",
        args0: [{ type: "input_value", name: "OPERAND", check: "Boolean" }],
        extensions: ["output_boolean"],
        colour: "#59C059",
      },
      {
        type: "kids_random_number",
        message0: "随机数 %1 到 %2",
        args0: [
          { type: "input_value", name: "FROM", check: "Number" },
          { type: "input_value", name: "TO", check: "Number" },
        ],
        extensions: ["output_number"],
        colour: "#59C059",
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
        colour: "#F58A25",
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
        colour: "#F58A25",
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
        colour: "#F58A25",
      },
      {
        type: "kids_variable_show",
        message0: "显示变量 %1",
        args0: [variableField()],
        previousStatement: null,
        nextStatement: null,
        colour: "#F58A25",
      },
      {
        type: "kids_variable_hide",
        message0: "隐藏变量 %1",
        args0: [variableField()],
        previousStatement: null,
        nextStatement: null,
        colour: "#F58A25",
      },
      {
        type: "kids_variable_value",
        message0: "%1 的值",
        args0: [variableField()],
        extensions: ["output_number"],
        colour: "#F58A25",
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
        colour: "#59C059",
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
        colour: "#F4B41A",
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
        colour: "#F4B41A",
      },
    ]);
  }
  if (!ScratchBlocks.Blocks.kids_when_scene_starts) {
    ScratchBlocks.defineBlocksWithJsonArray([
      {
        type: "kids_when_scene_starts",
        message0: "场景开始时",
        nextStatement: null,
        colour: "#F4B41A",
      },
      {
        type: "kids_next_scene",
        message0: "切换到下一个场景",
        previousStatement: null,
        nextStatement: null,
        colour: "#45B531",
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
        colour: "#F4B41A",
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
        colour: "#F4B41A",
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
        colour: "#F4B41A",
      },
      {
        type: "kids_goto_start",
        message0: "回到起点",
        previousStatement: null,
        nextStatement: null,
        colour: "#428EF4",
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
        colour: "#F58A25",
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
        colour: "#45B531",
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
    event: blockStyle("#F4B41A", "#D99800", "#B77900"),
    motion: blockStyle("#428EF4", "#2674D8", "#1C5EB7"),
    looks: blockStyle("#8A55E8", "#6F3FCB", "#5730A5"),
    sounds: blockStyle("#E34D91", "#C83778", "#A42A62"),
    control: blockStyle("#F58A25", "#D96B10", "#B65308"),
    data: blockStyle("#FF8C1A", "#DB6E00", "#B85800"),
    data_lists: blockStyle("#FF661A", "#DB4D00", "#B83E00"),
    sensing: blockStyle("#4CBFE6", "#2CA7D1", "#2187AA"),
    pen: blockStyle("#0FBD8C", "#0B9F76", "#087D5D"),
    operators: blockStyle("#59C059", "#3FA33F", "#318231"),
    more: blockStyle("#FF6680", "#DB4D68", "#B83E55"),
    game: blockStyle("#55BE42", "#3E9F30", "#2F7D24"),
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

const kidsToolbox = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "事件",
      colour: "#F4B41A",
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
      colour: "#428EF4",
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
            X: { shadow: { type: "math_number", fields: { NUM: 240 } } },
            Y: { shadow: { type: "math_number", fields: { NUM: 180 } } },
          },
        },
      ],
    },
    {
      kind: "category",
      name: "外观",
      colour: "#8A55E8",
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
      colour: "#E34D91",
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
      colour: "#F58A25",
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
      colour: "#45B531",
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
): RuntimeScript[] => {
  seedMessages();
  registerKidsBlocks();
  registerUnknownSerializedBlocks(workspaceState);
  const workspace = new ScratchBlocks.Workspace();
  try {
    ScratchBlocks.serialization.workspaces.load(workspaceState, workspace);
    return compileWorkspace(workspace, ownerSpriteId);
  } finally {
    workspace.dispose();
  }
};

export class BlockWorkspaceAdapter {
  #workspace: ScratchBlocks.WorkspaceSvg | null = null;
  #isLoading = false;

  mount(
    container: Element,
    onChange?: WorkspaceChangeListener,
    initialState?: object,
    seedDefault = true,
    toolboxContext?: WorkspaceToolboxContext,
  ): void {
    activeToolboxContext = toolboxContext ?? null;
    seedMessages();
    registerKidsBlocks();
    registerUnknownSerializedBlocks(initialState);
    this.#workspace = ScratchBlocks.inject(container, {
      scratchTheme: ScratchBlocks.ScratchBlocksTheme.CLASSIC,
      theme: kidsCodeTheme,
      toolbox: kidsToolbox,
      maxBlocks: toolboxContext?.maxBlocks ?? 1_000,
      media: "/blockly-media/",
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

    window.setTimeout(() => {
      if (this.#workspace && initialState) {
        this.#isLoading = true;
        try {
          ScratchBlocks.serialization.workspaces.load(
            initialState,
            this.#workspace,
          );
          this.#ensureEditableInputs();
        } finally {
          this.#isLoading = false;
        }
        return;
      }
      if (seedDefault) this.#seedWorkspace();
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

  compile(ownerSpriteId: string): RuntimeScript[] {
    if (!this.#workspace) return [];
    return compileWorkspace(this.#workspace, ownerSpriteId);
  }

  highlightBlock(blockId: string | null): void {
    this.#workspace?.highlightBlock(blockId);
  }

  destroy(): void {
    this.#workspace?.dispose();
    this.#workspace = null;
  }
}
