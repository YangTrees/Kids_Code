import type { CreationTask } from "./task-types";

export const basicsTasks: CreationTask[] = [
  {
    taskId: "speak",
    chapter: "基础入门",
    title: "让栗奇说话",
    description: "点击开始后，让栗奇说出一句你喜欢的话。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "说 你好！ 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "使用“点击开始”事件",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "say", label: "连接一个“说…秒”积木", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "运行作品并让栗奇说完这句话",
      check: (report) => report.status === "COMPLETED",
    },
    hints: [
      "想一想：角色什么时候开始说话？",
      "在“事件”中找到点击开始，在“外观”中找到说话积木。",
      "把紫色“说…秒”积木连接到黄色“点击开始”积木下面。",
    ],
  },
  {
    taskId: "move",
    chapter: "基础入门",
    title: "走向宝箱",
    description: "运行作品，让栗奇向宝箱方向移动。",
    projectMode: "treasure-template",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "向右移动 3 格", category: "motion" },
    ],
    rules: [
      {
        id: "start",
        label: "使用“点击开始”事件",
        anyOf: ["event_whenflagclicked"],
      },
      {
        id: "move",
        label: "连接移动或移动到坐标积木",
        anyOf: [
          "motion_movesteps",
          "kids_move_left",
          "kids_move_up",
          "kids_move_down",
          "motion_gotoxy",
        ],
      },
    ],
    runtimeGoal: {
      label: "运行后栗奇确实向宝箱方向移动",
      check: (report) => Boolean(report.spritePositions.spr_liji),
    },
    hints: [
      "想一想：栗奇需要先等待什么事件？",
      "到“动作”分类寻找蓝色移动积木。",
      "把移动积木放在点击开始下面，再调整步数或坐标。",
    ],
  },
  {
    taskId: "sequence",
    chapter: "基础入门",
    title: "先说再走",
    description: "让栗奇介绍自己，然后向右走一格。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "说 我出发啦！ 1 秒", category: "looks" },
      { label: "向右移动 1 格", category: "motion" },
    ],
    rules: [
      {
        id: "start",
        label: "从点击开始事件出发",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "say", label: "让角色说话", anyOf: ["looks_sayforsecs"] },
      { id: "move", label: "让角色向右移动", anyOf: ["motion_movesteps"] },
    ],
    runtimeGoal: {
      label: "运行后栗奇说话并向右移动",
      check: (report) => report.status === "COMPLETED",
    },
    hints: [
      "这次需要连续执行两件事。",
      "先把紫色说话积木接到黄色事件下面。",
      "再把蓝色向右移动积木接在说话积木后面。",
    ],
  },
  {
    taskId: "turn",
    chapter: "基础入门",
    title: "转个方向",
    description: "让栗奇转一个方向。转动改变朝向，向右、向左仍按屏幕方向移动。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "右转 90 度", category: "motion" },
    ],
    rules: [
      {
        id: "start",
        label: "使用“点击开始”事件",
        anyOf: ["event_whenflagclicked"],
      },
      {
        id: "turn",
        label: "连接左转或右转积木",
        anyOf: ["kids_turn_left", "motion_turnright"],
      },
    ],
    runtimeGoal: {
      label: "运行后让栗奇真正改变朝向",
      check: (report) => report.status === "COMPLETED",
    },
    hints: [
      "转向积木藏在蓝色的“动作”分类里。",
      "先连接点击开始，再连接一个转向积木。",
      "可以选择左转或右转，并试试不同角度。",
    ],
  },
  {
    taskId: "diagonal",
    chapter: "基础入门",
    title: "走向右上角",
    description: "组合两个方向，让栗奇走到起点的右上方。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "向右移动 1 格", category: "motion" },
      { label: "向上移动 1 格", category: "motion" },
    ],
    rules: [
      {
        id: "start",
        label: "从点击开始事件出发",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "right", label: "向右移动", anyOf: ["motion_movesteps"] },
      { id: "up", label: "向上移动", anyOf: ["kids_move_up"] },
    ],
    runtimeGoal: {
      label: "栗奇的位置同时向右、向上改变",
      check: (report) => report.status === "COMPLETED",
    },
    hints: [
      "向右移动会改变横向位置。",
      "向上移动会改变纵向位置。",
      "把两个动作都接在点击开始后面，运行时看格子。",
    ],
  },
  {
    taskId: "repeat",
    chapter: "基础入门",
    title: "重复的舞步",
    description: "使用循环，让栗奇重复执行一个动作。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "重复 2 次", category: "control", shape: "loop" },
      { label: "向右移动 1 格", category: "motion" },
    ],
    rules: [
      {
        id: "start",
        label: "使用“点击开始”事件",
        anyOf: ["event_whenflagclicked"],
      },
      {
        id: "repeat",
        label: "使用重复积木",
        anyOf: ["control_repeat", "control_forever"],
      },
      {
        id: "action",
        label: "循环中加入动作",
        anyOf: ["motion_movesteps", "kids_turn_left", "motion_turnright"],
      },
    ],
    runtimeGoal: {
      label: "运行并看到动作重复执行",
      check: (report) =>
        report.status === "RUNNING" || report.status === "COMPLETED",
    },
    hints: [
      "橙色的“控制”分类里有重复积木。",
      "把蓝色动作积木放进重复积木的肚子里。",
      "先用“重复 2 次”；动作真正执行两次后，就能完成挑战。",
    ],
  },
  {
    taskId: "collision",
    chapter: "互动游戏",
    title: "碰到宝箱",
    description: "让程序判断栗奇是否碰到了另一个角色。",
    projectMode: "treasure-template",
    blockGuide: [
      { label: "碰到 宝箱 时", category: "event", shape: "hat" },
      { label: "说 找到啦！ 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "touch",
        label: "使用碰撞事件或碰撞条件",
        anyOf: [
          "kids_when_touching",
          "kids_if_touching",
          "kids_touching_condition",
        ],
      },
      {
        id: "action",
        label: "碰撞后执行一个效果",
        anyOf: ["looks_sayforsecs", "sound_play", "kids_score_change"],
      },
    ],
    runtimeGoal: {
      label: "运行时让栗奇碰到宝箱",
      check: (report) =>
        report.touchedPairs.some(
          (pair) => pair === "spr_liji:spr_box" || pair === "spr_box:spr_liji",
        ),
    },
    hints: [
      "可以用“碰到角色时”，也可以用“如果碰到”。",
      "在碰撞积木后连接说话、声音或得分积木。",
      "让栗奇先移动到宝箱附近，再判断是否碰到。",
    ],
  },
  {
    taskId: "collision_sound",
    chapter: "互动游戏",
    title: "宝箱会响",
    description: "栗奇碰到宝箱时，播放一个声音。",
    projectMode: "treasure-template",
    blockGuide: [
      { label: "碰到 宝箱 时", category: "event", shape: "hat" },
      { label: "播放声音 叮", category: "sound" },
    ],
    rules: [
      { id: "touch", label: "监听碰到宝箱", anyOf: ["kids_when_touching"] },
      { id: "sound", label: "碰到后播放声音", anyOf: ["sound_play"] },
    ],
    runtimeGoal: {
      label: "栗奇碰到宝箱并触发声音",
      check: (report) => report.touchedPairs.includes("spr_liji:spr_box"),
    },
    hints: [
      "先用方向键或移动积木接近宝箱。",
      "给栗奇连接黄色“碰到宝箱时”事件。",
      "在碰撞事件下面连接粉色声音积木。",
    ],
  },
  {
    taskId: "touch_end",
    chapter: "互动游戏",
    title: "离开宝箱",
    description: "栗奇碰到宝箱后退开，让栗奇在离开时说再见。",
    projectMode: "treasure-template",
    blockGuide: [
      { label: "离开 宝箱 时", category: "event", shape: "hat" },
      { label: "说 再见！ 1 秒", category: "looks" },
    ],
    rules: [
      {
        id: "leave",
        label: "使用离开碰撞事件",
        anyOf: ["kids_when_touch_end"],
      },
      { id: "say", label: "离开后让角色说话", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "接触宝箱再退开，真正触发离开事件",
      check: (report) =>
        report.status === "RUNNING" || report.status === "COMPLETED",
    },
    hints: [
      "离开事件要先接触，再向反方向退开才会发生。",
      "在黄色事件分类找到“离开角色时”。",
      "把紫色说话积木接到离开事件下面。",
    ],
  },
  {
    taskId: "collect",
    chapter: "互动游戏",
    title: "收集金币",
    description: "点击金币时增加得分，并播放收集声音。",
    projectMode: "coin-template",
    blockGuide: [
      { label: "点击这个角色时", category: "event", shape: "hat" },
      { label: "将得分增加 1", category: "game" },
      { label: "播放声音 收集金币", category: "sound" },
    ],
    rules: [
      {
        id: "click",
        label: "使用“点击这个角色时”事件",
        anyOf: ["event_whenthisspriteclicked"],
      },
      { id: "score", label: "连接增加得分积木", anyOf: ["kids_score_change"] },
      { id: "sound", label: "连接播放声音积木", anyOf: ["sound_play"] },
    ],
    runtimeGoal: {
      label: "运行后成功收集金币并获得分数",
      check: (report) => report.score > 0,
    },
    hints: [
      "先选择下方的星星金币角色，再给它编程。",
      "需要用到“事件”“游戏”和“声音”三个分类。",
      "依次连接：点击这个角色时 → 增加得分 → 播放声音。",
    ],
  },
  {
    taskId: "score",
    chapter: "互动游戏",
    title: "累计三分",
    description: "点击金币后，用重复积木连续加分，让得分达到 3 分。",
    projectMode: "coin-template",
    blockGuide: [
      { label: "点击这个角色时", category: "event", shape: "hat" },
      { label: "重复 3 次", category: "control", shape: "loop" },
      { label: "将得分增加 1", category: "game" },
    ],
    rules: [
      {
        id: "click",
        label: "点击金币时开始",
        anyOf: ["event_whenthisspriteclicked"],
      },
      {
        id: "repeat",
        label: "使用重复积木",
        anyOf: ["control_repeat"],
      },
      {
        id: "score",
        label: "重复增加得分",
        anyOf: ["kids_score_change"],
      },
    ],
    runtimeGoal: {
      label: "运行后累计达到 3 分",
      check: (report) => report.score >= 3,
    },
    hints: [
      "先选中金币，把“点击这个角色时”放进工作区。",
      "在事件下面连接橙色“重复 3 次”积木。",
      "把绿色“将得分增加 1”放进重复积木里面，再点击金币。",
    ],
  },
  {
    taskId: "treasure_win",
    chapter: "互动游戏",
    title: "打开胜利宝箱",
    description: "碰到宝箱时宣布游戏成功。",
    projectMode: "treasure-template",
    blockGuide: [
      { label: "碰到 宝箱 时", category: "event", shape: "hat" },
      { label: "游戏 成功", category: "game" },
    ],
    rules: [
      { id: "touch", label: "碰到宝箱时开始", anyOf: ["kids_when_touching"] },
      { id: "win", label: "宣布游戏成功", anyOf: ["kids_result"] },
    ],
    runtimeGoal: {
      label: "栗奇碰到宝箱并获得成功结果",
      check: (report) =>
        report.result === "success" &&
        report.touchedPairs.includes("spr_liji:spr_box"),
    },
    hints: [
      "先让栗奇能够走到宝箱旁边。",
      "用“碰到宝箱时”作为胜利条件。",
      "把绿色“游戏成功”连接在碰撞事件下面。",
    ],
  },
  {
    taskId: "scene",
    chapter: "程序思维",
    title: "前往新场景",
    description: "用积木切换到另一个场景。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "切换到下一个场景", category: "game" },
    ],
    rules: [
      {
        id: "start",
        label: "使用一个开始事件",
        anyOf: ["event_whenflagclicked", "kids_when_scene_starts"],
      },
      {
        id: "scene",
        label: "使用场景切换积木",
        anyOf: ["kids_switch_scene", "kids_next_scene"],
      },
    ],
    runtimeGoal: {
      label: "运行一次场景切换程序",
      check: (report) => report.status === "COMPLETED",
    },
    hints: [
      "先在下方添加第二个场景。",
      "“游戏”分类里有切换场景积木。",
      "把切换场景连接在点击开始下面。",
    ],
  },
  {
    taskId: "variable",
    chapter: "程序思维",
    title: "能量计数器",
    description: "创建变量，并在运行时改变它的值。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "将 能量 设为 0", category: "variable" },
      { label: "将 能量 增加 1", category: "variable" },
    ],
    rules: [
      { id: "set", label: "设置变量初始值", anyOf: ["kids_variable_set"] },
      {
        id: "change",
        label: "增加或减少变量",
        anyOf: ["kids_variable_increase", "kids_variable_decrease"],
      },
    ],
    runtimeGoal: {
      label: "运行后至少一个变量不等于 0",
      check: (report) =>
        Object.values(report.variables).some((value) => value !== 0),
    },
    hints: [
      "到“游戏”分类点击“创建变量”。",
      "先设置变量，再连接增加或减少变量积木。",
      "点击运行，舞台左上角会显示变量值。",
    ],
  },
  {
    taskId: "logic",
    chapter: "程序思维",
    title: "聪明的判断",
    description: "用如果和条件积木决定程序执行什么。",
    projectMode: "treasure-template",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "碰到 宝箱？", category: "condition", shape: "condition" },
      { label: "如果…那么", category: "control", shape: "loop" },
      { label: "说 找到啦！", category: "looks" },
    ],
    rules: [
      {
        id: "if",
        label: "使用“如果”或“如果否则”",
        anyOf: ["kids_if", "kids_if_else"],
      },
      {
        id: "condition",
        label: "加入一个判断条件",
        anyOf: [
          "kids_touching_condition",
          "kids_score_compare",
          "kids_variable_compare",
          "kids_logic_and",
          "kids_logic_or",
          "kids_logic_not",
        ],
      },
      {
        id: "action",
        label: "条件成立时执行一个动作",
        anyOf: ["looks_sayforsecs", "sound_play", "kids_score_change"],
      },
    ],
    runtimeGoal: {
      label: "让条件成立并执行动作",
      check: (report) =>
        report.status === "COMPLETED" || report.status === "RUNNING",
    },
    hints: [
      "先从“控制”分类拖出“如果”。",
      "把六边形条件积木放进“如果”的空位。",
      "在“那么”里面放入说话、声音或得分积木。",
    ],
  },
  {
    taskId: "compare_score",
    chapter: "程序思维",
    title: "分数达标才说话",
    description: "先得到 2 分，只有分数超过 1 时才让栗奇说话。",
    projectMode: "blank",
    blockGuide: [
      { label: "将得分设为 2", category: "game" },
      { label: "如果…那么", category: "control", shape: "loop" },
      { label: "得分 大于 1？", category: "operator", shape: "condition" },
      { label: "说 达标啦！", category: "looks" },
    ],
    rules: [
      {
        id: "score",
        label: "设置或增加得分",
        anyOf: ["kids_score_set", "kids_score_change"],
      },
      { id: "if", label: "使用如果判断", anyOf: ["kids_if"] },
      { id: "compare", label: "比较当前得分", anyOf: ["kids_score_compare"] },
      { id: "say", label: "分数达标后说话", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "得分至少为 2，判断成立并说话",
      check: (report) => report.status === "COMPLETED" && report.score >= 2,
    },
    hints: [
      "先用绿色积木把得分设为 2。",
      "在橙色“如果”里放入得分比较条件。",
      "条件选“大于 1”，再把说话积木放进“那么”里面。",
    ],
  },
  {
    taskId: "logic_or",
    chapter: "程序思维",
    title: "两个办法都可以",
    description: "用“或者”连接两个条件，满足其中一个就让栗奇回应。",
    projectMode: "treasure-template",
    blockGuide: [
      { label: "如果…那么", category: "control", shape: "loop" },
      {
        label: "条件 A 或者 条件 B",
        category: "operator",
        shape: "condition",
      },
      { label: "说 我想到办法啦！", category: "looks" },
    ],
    rules: [
      { id: "if", label: "使用如果判断", anyOf: ["kids_if"] },
      { id: "or", label: "用或者连接两个条件", anyOf: ["kids_logic_or"] },
      { id: "say", label: "条件成立时让角色说话", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "让至少一个条件成立并触发回应",
      check: (report) => report.status === "COMPLETED",
    },
    hints: [
      "“或者”只要一边成立，整个条件就成立。",
      "在“控制”分类找到绿色“或者”，放进“如果”的六边形空位。",
      "可以在两边试试“得分比较”或“碰到角色”条件。",
    ],
  },
  {
    taskId: "random",
    chapter: "程序思维",
    title: "抽一个幸运数字",
    description: "创建一个变量，把 1 到 6 的随机数存进去。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "将 幸运数字 设为…", category: "variable" },
      { label: "随机数 1 到 6", category: "operator" },
    ],
    rules: [
      {
        id: "start",
        label: "从点击开始事件出发",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "variable", label: "设置一个变量", anyOf: ["kids_variable_set"] },
      { id: "random", label: "使用随机数积木", anyOf: ["kids_random_number"] },
    ],
    runtimeGoal: {
      label: "变量获得 1 到 6 之间的数字",
      check: (report) =>
        Object.values(report.variables).some(
          (value) => value >= 1 && value <= 6,
        ),
    },
    hints: [
      "先在“游戏”分类创建变量“幸运数字”。",
      "把设置变量积木接在点击开始下面。",
      "在“控制”分类找到绿色“随机数”，设为 1 到 6，再放进变量积木的数字空位。",
    ],
  },
  {
    taskId: "keyboard",
    chapter: "进阶创作",
    title: "键盘遥控",
    description: "按下方向键，让栗奇在舞台上移动一格。",
    projectMode: "treasure-template",
    blockGuide: [
      { label: "按下 → 键时", category: "event", shape: "hat" },
      { label: "向右移动 1 格", category: "motion" },
    ],
    rules: [
      {
        id: "keyboard",
        label: "使用按键事件",
        anyOf: ["event_whenkeypressed"],
      },
      {
        id: "move",
        label: "按键后连接移动积木",
        anyOf: [
          "motion_movesteps",
          "kids_move_left",
          "kids_move_up",
          "kids_move_down",
        ],
      },
    ],
    runtimeGoal: {
      label: "运行作品并用按键移动栗奇",
      check: (report) => Boolean(report.spritePositions.spr_liji),
    },
    hints: [
      "先在“事件”分类找到按键事件。",
      "选择一个方向键，再在下面连接同方向的移动积木。",
      "点击运行后按下这个方向键，观察栗奇移动一格。",
    ],
  },
  {
    taskId: "sound",
    chapter: "进阶创作",
    title: "声音导演",
    description: "给一个开始事件配上清晰的游戏音效。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "播放声音 按钮声", category: "sound" },
    ],
    rules: [
      {
        id: "start",
        label: "使用一个开始事件",
        anyOf: ["event_whenflagclicked", "event_whenthisspriteclicked"],
      },
      { id: "sound", label: "连接播放声音积木", anyOf: ["sound_play"] },
    ],
    runtimeGoal: {
      label: "运行作品并播放一次声音",
      check: (report) => report.status === "COMPLETED",
    },
    hints: [
      "粉红色积木属于“声音”分类。",
      "把播放声音连接在黄色事件积木下面。",
      "从下拉菜单选择一种声音，再点击运行。",
    ],
  },
  {
    taskId: "magic",
    chapter: "进阶创作",
    title: "消失魔术",
    description: "让栗奇消失一下，再重新回到舞台。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "隐藏", category: "looks" },
      { label: "等待 1 秒", category: "control" },
      { label: "显示", category: "looks" },
    ],
    rules: [
      { id: "hide", label: "使用隐藏积木", anyOf: ["looks_hide"] },
      { id: "wait", label: "加入等待积木", anyOf: ["control_wait"] },
      { id: "show", label: "使用显示积木", anyOf: ["looks_show"] },
    ],
    runtimeGoal: {
      label: "运行完整的消失和出现过程",
      check: (report) => report.status === "COMPLETED",
    },
    hints: [
      "隐藏和显示都在紫色“外观”分类里。",
      "为了看清变化，在隐藏和显示之间放一个等待积木。",
      "连接顺序：点击开始 → 隐藏 → 等待 1 秒 → 显示。",
    ],
  },
  {
    taskId: "broadcast",
    chapter: "进阶创作",
    title: "消息接力",
    description: "广播一条消息，让另一段程序收到后回应。",
    projectMode: "dialogue-template",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "广播消息 开始游戏", category: "event" },
      { label: "收到消息 开始游戏 时", category: "event", shape: "hat" },
      { label: "说 收到！ 2 秒", category: "looks" },
    ],
    rules: [
      { id: "send", label: "使用广播消息积木", anyOf: ["kids_broadcast"] },
      {
        id: "receive",
        label: "使用收到消息事件",
        anyOf: ["kids_when_message"],
      },
      {
        id: "response",
        label: "收到后说话或播放声音",
        anyOf: ["looks_sayforsecs", "sound_play"],
      },
    ],
    runtimeGoal: {
      label: "运行后完成一次消息接力",
      check: (report) => report.status === "COMPLETED",
    },
    hints: [
      "广播和接收消息都在黄色“事件”分类里。",
      "先做一段“点击开始 → 广播消息”的程序。",
      "再做另一段“收到消息时 → 说话”的程序。",
    ],
  },
  {
    taskId: "scene_story",
    chapter: "进阶创作",
    title: "跨场景对话",
    description: "从教室切换到森林，让新场景里的角色开口说话。",
    projectMode: "dialogue-template",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "切换到下一个场景", category: "game" },
      { label: "当场景开始时", category: "event", shape: "hat" },
      { label: "说 欢迎来到森林！", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始事件启动",
        anyOf: ["event_whenflagclicked"],
      },
      {
        id: "switch",
        label: "切换到第二个场景",
        anyOf: ["kids_switch_scene", "kids_next_scene"],
      },
      {
        id: "scene_start",
        label: "响应场景开始事件",
        anyOf: ["kids_when_scene_starts"],
      },
      { id: "say", label: "在新场景里说话", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "真正切换场景并让角色开口",
      check: (report) => (report.sceneChanges ?? 0) > 0,
    },
    hints: [
      "这一关已准备好教室和森林两个场景。",
      "第一段程序：点击开始 → 切换到下一个场景。",
      "第二段程序：当场景开始时 → 说“欢迎来到森林”。",
    ],
  },
  {
    taskId: "finale",
    chapter: "进阶创作",
    title: "森林大冒险",
    description: "组合按键、碰撞和成功结果，做出一个完整小游戏。",
    projectMode: "treasure-template",
    blockGuide: [
      { label: "按下 → 键时", category: "event", shape: "hat" },
      { label: "向右移动 1 格", category: "motion" },
      { label: "碰到 宝箱 时", category: "event", shape: "hat" },
      { label: "游戏 成功", category: "game" },
    ],
    rules: [
      {
        id: "keyboard",
        label: "使用按键事件",
        anyOf: ["event_whenkeypressed"],
      },
      {
        id: "move",
        label: "按键后连接移动积木",
        anyOf: [
          "motion_movesteps",
          "kids_move_left",
          "kids_move_up",
          "kids_move_down",
        ],
      },
      {
        id: "touch",
        label: "使用碰撞事件或条件",
        anyOf: ["kids_when_touching", "kids_if_touching"],
      },
      { id: "result", label: "碰到后宣布游戏成功", anyOf: ["kids_result"] },
    ],
    runtimeGoal: {
      label: "操作栗奇碰到宝箱并完成游戏",
      check: (report) => report.result === "success",
    },
    hints: [
      "先用按键事件和移动积木控制栗奇。",
      "再新建一段“碰到宝箱时”的程序。",
      "把绿色“游戏成功”积木接在碰撞事件下面。",
    ],
  },
  {
    taskId: "path_straight",
    chapter: "路线挑战",
    title: "走过小木桥",
    description: "让栗奇从绿色起点沿着道路走 3 格，到达黄色终点。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "向右移动 3 格", category: "motion" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始事件启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "move", label: "向右前进", anyOf: ["motion_movesteps"] },
    ],
    runtimeGoal: {
      label: "沿道路逐格到达终点，途中不能走出道路",
      check: (report) =>
        report.status === "COMPLETED" &&
        Boolean(report.pathReachedGoal) &&
        !report.pathViolation,
    },
    hints: [
      "道路上的每一个浅色方格就是 1 格，绿色是起点，黄色是终点。",
      "从起点数到终点，一共需要向右走 3 格。",
      "把“向右移动 3 格”接在“点击开始”下面，再运行。",
    ],
  },
  {
    taskId: "path_turn",
    chapter: "路线挑战",
    title: "拐弯找终点",
    description: "先向右走，再向上走；拐角处要换方向。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "向右移动 2 格", category: "motion" },
      { label: "向上移动 2 格", category: "motion" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始事件启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "right", label: "让栗奇向右走", anyOf: ["motion_movesteps"] },
      { id: "up", label: "在拐角向上走", anyOf: ["kids_move_up"] },
    ],
    runtimeGoal: {
      label: "沿道路转弯并到达终点",
      check: (report) =>
        report.status === "COMPLETED" &&
        Boolean(report.pathReachedGoal) &&
        !report.pathViolation,
    },
    hints: [
      "先观察路的方向：它先向右，再向上。",
      "右边走 2 格会到拐角，接着向上走 2 格。",
      "按顺序连接两块蓝色移动积木，不能跨过拐角。",
    ],
  },
  {
    taskId: "path_zigzag",
    chapter: "路线挑战",
    title: "穿过折线森林",
    description: "跟着折线道路，依次向右、向上、向右、向下。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "向右移动 2 格", category: "motion" },
      { label: "向上移动 2 格", category: "motion" },
      { label: "向右移动 2 格", category: "motion" },
      { label: "向下移动 2 格", category: "motion" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始事件启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "right", label: "让栗奇向右走", anyOf: ["motion_movesteps"] },
      { id: "up", label: "让栗奇向上走", anyOf: ["kids_move_up"] },
      { id: "down", label: "让栗奇向下走", anyOf: ["kids_move_down"] },
    ],
    runtimeGoal: {
      label: "依次经过每个拐角并抵达终点",
      check: (report) =>
        report.status === "COMPLETED" &&
        Boolean(report.pathReachedGoal) &&
        !report.pathViolation,
    },
    hints: [
      "用手指沿着浅色道路描一遍，数数有几个拐角。",
      "每一段都是 2 格：右 → 上 → 右 → 下。",
      "把四块移动积木按道路顺序接在开始事件下面。",
    ],
  },
  {
    taskId: "path_repeat",
    chapter: "路线挑战",
    title: "重复登高",
    description: "用重复积木让栗奇向上走 4 次，抵达山顶终点。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "重复执行 4 次", category: "control", shape: "loop" },
      { label: "向上移动 1 格", category: "motion" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始事件启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "使用重复积木", anyOf: ["control_repeat"] },
      { id: "up", label: "在循环里向上走", anyOf: ["kids_move_up"] },
    ],
    runtimeGoal: {
      label: "重复走过道路并抵达山顶",
      check: (report) =>
        report.status === "COMPLETED" &&
        Boolean(report.pathReachedGoal) &&
        !report.pathViolation,
    },
    hints: [
      "一共有 4 个向上的步长，每一步都是 1 格。",
      "把向上移动 1 格放进橙色“重复执行”里面。",
      "把重复次数改成 4，并接在点击开始下面。",
    ],
  },
  {
    taskId: "sky_waypoint",
    chapter: "云岛远征",
    title: "经过紫色路标",
    description: "不要直接冲向终点，先绕到紫色 1 号路标，再抵达出口。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "向右移动 2 格", category: "motion" },
      { label: "向上移动 2 格", category: "motion" },
      { label: "继续沿路到终点", category: "motion" },
    ],
    rules: [
      {
        id: "start",
        label: "用绿旗启动路线",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "right", label: "使用向右移动", anyOf: ["motion_movesteps"] },
      { id: "up", label: "使用向上移动", anyOf: ["kids_move_up"] },
      { id: "down", label: "使用向下移动", anyOf: ["kids_move_down"] },
    ],
    runtimeGoal: {
      label: "经过 1 号路标后抵达终点，不能离开道路",
      check: (report) =>
        report.status === "COMPLETED" &&
        Boolean(report.pathReachedGoal && report.pathObjectivesMet) &&
        !report.pathViolation,
    },
    hints: [
      "紫色方格里的数字 1 是必须经过的路标；直接走中间会漏掉它。",
      "先右 2 格、上 2 格到紫色路标，再右 2 格、下 2 格回到主路。",
      "最后再右 2 格到黄色终点：右 2 → 上 2 → 右 2 → 下 2 → 右 2。",
    ],
  },
  {
    taskId: "sky_collect",
    chapter: "云岛远征",
    title: "收集两颗星石",
    description: "沿岔路找到两枚金色菱形，再回到主路抵达终点。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "向右移动 2 格", category: "motion" },
      { label: "向上移动 3 格", category: "motion" },
      { label: "向下移动 3 格", category: "motion" },
      { label: "向右移动 4 格", category: "motion" },
    ],
    rules: [
      {
        id: "start",
        label: "用绿旗启动路线",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "right", label: "使用向右移动", anyOf: ["motion_movesteps"] },
      { id: "up", label: "走上岔路", anyOf: ["kids_move_up"] },
      { id: "down", label: "从岔路返回", anyOf: ["kids_move_down"] },
    ],
    runtimeGoal: {
      label: "收齐两颗星石后抵达终点",
      check: (report) =>
        report.status === "COMPLETED" &&
        Boolean(report.pathReachedGoal && report.pathObjectivesMet) &&
        !report.pathViolation,
    },
    hints: [
      "金色菱形是星石；一颗在上方岔路尽头，一颗在通向终点的路上。",
      "先向右 2 格到岔口，向上 3 格拾取星石，再向下 3 格回到岔口。",
      "最后向右 4 格会经过第二颗星石并到达终点。",
    ],
  },
  {
    taskId: "sky_shortcut",
    chapter: "云岛远征",
    title: "八步找捷径",
    description: "地图有两条路，只能用最多 8 步到达终点。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "向右移动 6 格", category: "motion" },
      { label: "向上移动 2 格", category: "motion" },
    ],
    rules: [
      {
        id: "start",
        label: "用绿旗启动路线",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "right", label: "使用向右移动", anyOf: ["motion_movesteps"] },
      { id: "up", label: "使用向上移动", anyOf: ["kids_move_up"] },
    ],
    runtimeGoal: {
      label: "不离开道路，用不超过 8 步抵达终点",
      check: (report) =>
        report.status === "COMPLETED" &&
        Boolean(report.pathReachedGoal && report.pathObjectivesMet) &&
        !report.pathViolation,
    },
    hints: [
      "上方看起来很美，但绕远路会超过 8 步；试着数一数两条路的长度。",
      "最短路沿下方横向道路走，再从右端向上。",
      "向右 6 格、向上 2 格，刚好走 8 步。",
    ],
  },
  {
    taskId: "sky_master",
    chapter: "云岛远征",
    title: "云岛终极远征",
    description: "依次经过 1、2 号路标，收齐星石，使用循环且不走回头路。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "重复执行 3 次", category: "control", shape: "loop" },
      { label: "向右移动 1 格", category: "motion" },
      { label: "向上移动 3 格", category: "motion" },
      { label: "沿路抵达终点", category: "motion" },
    ],
    rules: [
      {
        id: "start",
        label: "用绿旗启动路线",
        anyOf: ["event_whenflagclicked"],
      },
      {
        id: "repeat",
        label: "用重复积木减少重复指令",
        anyOf: ["control_repeat"],
      },
      { id: "right", label: "使用向右移动", anyOf: ["motion_movesteps"] },
      { id: "up", label: "使用向上移动", anyOf: ["kids_move_up"] },
    ],
    runtimeGoal: {
      label: "12 步内按顺序经过路标、收齐星石，不走回头路并抵达终点",
      check: (report) =>
        report.status === "COMPLETED" &&
        Boolean(report.pathReachedGoal && report.pathObjectivesMet) &&
        !report.pathViolation,
    },
    hints: [
      "数字 1、2 是有顺序的路标；金色菱形也都要经过，不能走重复的格子。",
      "路线分成四段：右 3、上 3、右 4、上 2，一共正好 12 步。",
      "把“向右移动 1 格”放进“重复 3 次”，其余三段接在后面。",
    ],
  },
];
