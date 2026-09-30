import type { RuntimeReport } from "@kids-code/runtime";
import type { CreationTask } from "./task-types";

const finished = (report: RuntimeReport) => report.status === "COMPLETED";

const anyVariableAtLeast = (report: RuntimeReport, min: number) =>
  Object.values(report.variables ?? {}).some((value) => value >= min);

const anyVariableTracked = (report: RuntimeReport) =>
  Object.keys(report.variables ?? {}).length > 0;

const turnedAway = (report: RuntimeReport) =>
  Math.abs((report.spriteRotations?.spr_liji ?? 0) % 360) > 1;

/**
 * 后四个单元参考 Hour of AI 的学习路径设计：
 * 先认识数据，再发现规律，然后用规则做判断，最后做出自己的智能小作品。
 * 平台上没有真实的模型训练，全部用变量、循环和条件把 AI 的思维方式拆开演示。
 */
export const aiTasks: CreationTask[] = [
  {
    taskId: "data_count",
    chapter: "数据小侦探",
    title: "记下第一份数据",
    description:
      "每点击一次金币，就把“数据”这个变量增加 1，并把它显示在舞台上。人工智能认识世界，就是从一条一条的数据开始的。",
    projectMode: "coin-template",
    blockGuide: [
      { label: "点击这个角色时", category: "event", shape: "hat" },
      { label: "将 数据 增加 1", category: "variable" },
      { label: "显示变量 数据", category: "variable" },
    ],
    rules: [
      {
        id: "click",
        label: "用“点击这个角色时”开始记录",
        anyOf: ["event_whenthisspriteclicked"],
      },
      {
        id: "increase",
        label: "每发生一次就把数据加 1",
        anyOf: ["kids_variable_increase"],
      },
      { id: "show", label: "把数据放到舞台上", anyOf: ["kids_variable_show"] },
    ],
    runtimeGoal: {
      label: "点击金币后让“数据”至少变成 1",
      check: (report) => finished(report) && anyVariableAtLeast(report, 1),
    },
    hints: [
      "数据不是凭空出现的：每发生一件小事，就记一次。",
      "在“事件”里找“点击这个角色时”，在“变量”里找“将…增加…”和“显示变量”。",
      "把“显示变量 数据”和“将 数据 增加 1”接在“点击这个角色时”下面，然后点金币试试。",
    ],
  },
  {
    taskId: "data_show",
    chapter: "数据小侦探",
    title: "让数据看得见",
    description:
      "点击开始后先把“数据”显示在舞台上，再说一句话告诉大家它在哪里。看不见的数据，很难帮我们做判断。",
    projectMode: "coin-template",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "显示变量 数据", category: "variable" },
      { label: "说 数据在这里 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "show", label: "显示数据变量", anyOf: ["kids_variable_show"] },
      { id: "say", label: "用一句话说明数据在哪", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "运行后数据出现在舞台上",
      check: (report) => finished(report) && anyVariableTracked(report),
    },
    hints: [
      "数据要放在看得见的地方，别人才知道发生了什么。",
      "“显示变量”就在“变量”分类里，它和“隐藏变量”是一对。",
      "把“显示变量 数据”和“说…秒”依次接在“点击开始”下面。",
    ],
  },
  {
    taskId: "data_record",
    chapter: "数据小侦探",
    title: "连着观察三次",
    description:
      "用重复积木连续记录 3 次数据，每次把“数据”增加 1 并等待 1 秒。样本越多，后面的判断才越可靠。",
    projectMode: "coin-template",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 3 次", category: "control", shape: "loop" },
      { label: "将 数据 增加 1", category: "variable" },
      { label: "等待 1 秒", category: "control" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "用重复积木连续记录", anyOf: ["control_repeat"] },
      {
        id: "increase",
        label: "每次循环把数据加 1",
        anyOf: ["kids_variable_increase"],
      },
      { id: "wait", label: "每次记录后停一下", anyOf: ["control_wait"] },
    ],
    runtimeGoal: {
      label: "让“数据”至少累积到 3",
      check: (report) => finished(report) && anyVariableAtLeast(report, 3),
    },
    hints: [
      "只观察一次不算数，多记几次才像样——这就是“样本”。",
      "把“将 数据 增加 1”和“等待 1 秒”放进“重复”积木的肚子里。",
      "把重复次数改成 3，然后接到“点击开始”下面。",
    ],
  },
  {
    taskId: "data_reset",
    chapter: "数据小侦探",
    title: "重新开始先归零",
    description:
      "每次点击开始时，先把“数据”设为 0，再开始记录。旧数据混进新数据，结果就会不准。",
    projectMode: "coin-template",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "将 数据 设为 0", category: "variable" },
      { label: "重复 3 次", category: "control", shape: "loop" },
      { label: "将 数据 增加 1", category: "variable" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      {
        id: "reset",
        label: "开始前先把数据设为 0",
        anyOf: ["kids_variable_set"],
      },
      { id: "repeat", label: "用重复积木连续记录", anyOf: ["control_repeat"] },
      {
        id: "increase",
        label: "循环里把数据加 1",
        anyOf: ["kids_variable_increase"],
      },
    ],
    runtimeGoal: {
      label: "归零之后重新累积到 2 以上",
      check: (report) => finished(report) && anyVariableAtLeast(report, 2),
    },
    hints: [
      "上一轮留下来的数字会混进来，难怪结果怪怪的。",
      "“将…设为…”和“将…增加…”都在“变量”分类里，它们的样子很像。",
      "先放“将 数据 设为 0”，再把“将 数据 增加 1”放进“重复 3 次”里。",
    ],
  },
  {
    taskId: "data_compare",
    chapter: "数据小侦探",
    title: "两个数字比一比",
    description:
      "把“数据”设为 5，如果它大于 3 就说“这一组更多”。光看一个数字说明不了什么，比较才能看出意义。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "将 数据 设为 5", category: "variable" },
      { label: "如果 那么", category: "condition", shape: "condition" },
      { label: "数据 > 3", category: "variable" },
      { label: "说 这一组更多 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "set", label: "先给数据一个数值", anyOf: ["kids_variable_set"] },
      {
        id: "compare",
        label: "用变量比较做条件",
        anyOf: ["kids_variable_compare"],
      },
      { id: "if", label: "用“如果…那么”做判断", anyOf: ["kids_if"] },
      { id: "say", label: "判断成立后说一句话", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "运行后程序说出比较的结果",
      check: (report) => finished(report) && anyVariableTracked(report),
    },
    hints: [
      "单独一个数字没有意义，两个数字放一起才有意思。",
      "“如果…那么”在“判断”分类，“… 的值 > …”在“变量”分类。",
      "把“数据 > 3”塞进“如果”的菱形空位，再把“说”放进“那么”里面。",
    ],
  },
  {
    taskId: "data_label",
    chapter: "数据小侦探",
    title: "给数据贴标签",
    description:
      "记录 3 次数据后，如果“数据”大于 2 就说“够了”，否则说“还要再记”。给数据贴标签，就是在教程序做分类。",
    projectMode: "coin-template",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 3 次", category: "control", shape: "loop" },
      { label: "将 数据 增加 1", category: "variable" },
      { label: "如果 那么 否则", category: "condition", shape: "condition" },
      { label: "说 够了 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "先连续记录数据", anyOf: ["control_repeat"] },
      {
        id: "increase",
        label: "循环里把数据加 1",
        anyOf: ["kids_variable_increase"],
      },
      {
        id: "compare",
        label: "用变量比较当分界线",
        anyOf: ["kids_variable_compare"],
      },
      {
        id: "ifElse",
        label: "两种情况都给出回答",
        anyOf: ["kids_if_else"],
      },
      { id: "say", label: "说出贴好的标签", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "数据累积到 3，并且两种情况都有回答",
      check: (report) => finished(report) && anyVariableAtLeast(report, 3),
    },
    hints: [
      "光有数字还不够，还要告诉程序这个数字算“多”还是“少”。",
      "“如果…那么…否则”在“判断”分类，它比“如果…那么”多一个“否则”。",
      "循环结束后接上：如果 数据 > 2 那么 说“够了” 否则 说“还要再记”。",
    ],
  },
  {
    taskId: "data_sort",
    chapter: "数据小侦探",
    title: "把数据分成两堆",
    description:
      "点击角色时随机记一个 1 到 6 的数字，大于 3 就说“放进大堆”，否则说“放进小堆”。这就是最简单的分类器。",
    projectMode: "coin-template",
    blockGuide: [
      { label: "点击这个角色时", category: "event", shape: "hat" },
      { label: "将 数据 设为 随机数 1 到 6", category: "variable" },
      { label: "如果 那么 否则", category: "condition", shape: "condition" },
      { label: "说 放进大堆 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "click",
        label: "点击角色时开始一次分类",
        anyOf: ["event_whenthisspriteclicked"],
      },
      {
        id: "random",
        label: "用随机数产生一份新数据",
        anyOf: ["kids_random_number"],
      },
      { id: "set", label: "把随机数存进数据", anyOf: ["kids_variable_set"] },
      {
        id: "compare",
        label: "用 3 当作分界线比较",
        anyOf: ["kids_variable_compare"],
      },
      {
        id: "ifElse",
        label: "大堆和小堆都要有说法",
        anyOf: ["kids_if_else"],
      },
      { id: "say", label: "说出分到哪一堆", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "点一次角色，程序就给出一次分类",
      check: (report) => finished(report) && anyVariableTracked(report),
    },
    hints: [
      "分类器做的事情其实很简单：看一眼数字，然后决定放进哪一堆。",
      "“随机数…到…”在“运算”分类，可以拖进“将…设为…”的圆孔里。",
      "如果 数据 > 3 那么 说“放进大堆” 否则 说“放进小堆”。",
    ],
  },
  {
    taskId: "data_chart",
    chapter: "数据小侦探",
    title: "数据越长越高",
    description:
      "重复 5 次，每次把“数据”增加 1，同时把自己变大 10。数字换成图形，一眼就能看出谁多谁少。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 5 次", category: "control", shape: "loop" },
      { label: "将 数据 增加 1", category: "variable" },
      { label: "将大小增加 10", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "重复五次长高", anyOf: ["control_repeat"] },
      {
        id: "increase",
        label: "每次把数据加 1",
        anyOf: ["kids_variable_increase"],
      },
      {
        id: "size",
        label: "用变大表示数据变多",
        anyOf: ["looks_changesizeby"],
      },
    ],
    runtimeGoal: {
      label: "数据累积到 5，角色也明显变大",
      check: (report) => finished(report) && anyVariableAtLeast(report, 5),
    },
    hints: [
      "数字画成图形，比一行行数字好懂多了——这叫可视化。",
      "“将大小增加…”在“外观”分类，数字可以是 10 或 20。",
      "在“重复 5 次”里依次放“将 数据 增加 1”和“将大小增加 10”。",
    ],
  },
  {
    taskId: "pattern_beat",
    chapter: "规律与模式",
    title: "找出重复的节拍",
    description:
      "重复 4 次：播放一个声音，再等待 1 秒。凡是“一遍又一遍”的东西，都可以交给重复积木。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 4 次", category: "control", shape: "loop" },
      { label: "播放声音 鼓声", category: "sound" },
      { label: "等待 1 秒", category: "control" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "用重复积木表达节拍", anyOf: ["control_repeat"] },
      { id: "sound", label: "循环里播放声音", anyOf: ["sound_play"] },
      { id: "wait", label: "每个节拍之间停一下", anyOf: ["control_wait"] },
    ],
    runtimeGoal: {
      label: "听清四个稳定的节拍",
      check: finished,
    },
    hints: [
      "先数一数：这个声音一共响了几次？中间隔了多久？",
      "“播放声音”在“声音”分类，“等待…秒”在“控制”分类。",
      "把这两块放进“重复 4 次”的肚子里，再接到“点击开始”下面。",
    ],
  },
  {
    taskId: "pattern_square",
    chapter: "规律与模式",
    title: "走出一个正方形",
    description:
      "重复 4 次：向右移动 3 格，再右转 90 度。找出“一直在重复的动作”，就能用很少的积木画出形状。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 4 次", category: "control", shape: "loop" },
      { label: "向右移动 3 格", category: "motion" },
      { label: "右转 90 度", category: "motion" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      {
        id: "repeat",
        label: "把四条边合成一次循环",
        anyOf: ["control_repeat"],
      },
      { id: "move", label: "循环里向前走", anyOf: ["motion_movesteps"] },
      {
        id: "turn",
        label: "每条边之后转弯",
        anyOf: ["motion_turnright", "kids_turn_left"],
      },
    ],
    runtimeGoal: {
      label: "角色沿四条边走回出发点",
      check: finished,
    },
    hints: [
      "正方形有四条边，而且每一条都长得一模一样。",
      "“向右移动…格”和“右转…度”都在“动作”分类。",
      "这两块放进“重复 4 次”里，转的角度选 90 度。",
    ],
  },
  {
    taskId: "pattern_spin",
    chapter: "规律与模式",
    title: "转圈圈的秘密",
    description:
      "重复 3 次：左转 90 度，再等待 0.5 秒。转的角度和次数合起来，就是一种看得见的规律。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 3 次", category: "control", shape: "loop" },
      { label: "左转 90 度", category: "motion" },
      { label: "等待 0.5 秒", category: "control" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "用循环重复转动", anyOf: ["control_repeat"] },
      {
        id: "turn",
        label: "循环里改变朝向",
        anyOf: ["kids_turn_left", "motion_turnright"],
      },
      { id: "wait", label: "转一下停一下", anyOf: ["control_wait"] },
    ],
    runtimeGoal: {
      label: "运行结束时角色的朝向和开始时不同",
      check: (report) => finished(report) && turnedAway(report),
    },
    hints: [
      "一直往一个方向转，转几次就停在哪里？",
      "“左转…度”在“动作”分类，角度可以选 90 度。",
      "重复 3 次、每次 90 度，最后会停在侧面，正好看得出来。",
    ],
  },
  {
    taskId: "pattern_grow",
    chapter: "规律与模式",
    title: "越变越大的规律",
    description:
      "重复 4 次：把大小增加 10，再等待 0.5 秒。一步一步变大，就是一种会增长的规律。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 4 次", category: "control", shape: "loop" },
      { label: "将大小增加 10", category: "looks" },
      { label: "等待 0.5 秒", category: "control" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "用循环重复变大", anyOf: ["control_repeat"] },
      {
        id: "size",
        label: "每次把大小增加一点",
        anyOf: ["looks_changesizeby"],
      },
      { id: "wait", label: "变大之后停一下", anyOf: ["control_wait"] },
    ],
    runtimeGoal: {
      label: "角色分四次一点点变大",
      check: finished,
    },
    hints: [
      "每次都加同样多，结果就会像楼梯一样往上走。",
      "“将大小增加…”在“外观”分类，可以选 10 或 20。",
      "把变大和等待放进“重复 4 次”里，看角色慢慢长高。",
    ],
  },
  {
    taskId: "pattern_forever",
    chapter: "规律与模式",
    title: "让循环自己停下",
    description:
      "用“重复执行”一直加分，但加一次就检查一次：得分超过 4 就停止全部。一直跑的循环，也需要一个停下来的条件。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复执行", category: "control", shape: "loop" },
      { label: "将得分增加 1", category: "game" },
      { label: "如果 那么", category: "condition", shape: "condition" },
      { label: "停止 全部", category: "control" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      {
        id: "forever",
        label: "用“重复执行”一直跑",
        anyOf: ["control_forever"],
      },
      { id: "score", label: "每圈把得分加 1", anyOf: ["kids_score_change"] },
      { id: "if", label: "每圈检查一次条件", anyOf: ["kids_if"] },
      {
        id: "compare",
        label: "用得分比较当条件",
        anyOf: ["kids_score_compare"],
      },
      { id: "stop", label: "满足条件就停止", anyOf: ["kids_stop"] },
    ],
    runtimeGoal: {
      label: "程序自己停下来，并且至少加过一次分",
      check: (report) => finished(report) && report.score >= 1,
    },
    hints: [
      "“重复执行”不会自己结束，得给它一个“到这儿就停”的理由。",
      "“停止”在“控制”分类，记得选“全部”，不然只停这一段。",
      "在“重复执行”里放“将得分增加 1”，再放：如果 得分 > 4 那么 停止 全部。",
    ],
  },
  {
    taskId: "pattern_tempo",
    chapter: "规律与模式",
    title: "有节奏的舞蹈",
    description:
      "重复 4 次：右转 90 度、播放声音、等待 0.5 秒。动作和声音按固定顺序出现，就变成了舞蹈。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 4 次", category: "control", shape: "loop" },
      { label: "右转 90 度", category: "motion" },
      { label: "播放声音 鼓声", category: "sound" },
      { label: "等待 0.5 秒", category: "control" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "用循环重复舞步", anyOf: ["control_repeat"] },
      {
        id: "turn",
        label: "每一拍转一下",
        anyOf: ["motion_turnright", "kids_turn_left"],
      },
      { id: "sound", label: "每一拍响一声", anyOf: ["sound_play"] },
      { id: "wait", label: "控制每一拍的长短", anyOf: ["control_wait"] },
    ],
    runtimeGoal: {
      label: "转身、声音和停顿连成一串",
      check: finished,
    },
    hints: [
      "舞蹈就是“动作 + 声音 + 停顿”按同样的顺序重复。",
      "把等待改成 0.5 秒会变快，改成 2 秒会变慢，你试试。",
      "三块积木按顺序放进“重复 4 次”里：转、响、等。",
    ],
  },
  {
    taskId: "pattern_swap",
    chapter: "规律与模式",
    title: "一闪一闪的规律",
    description:
      "重复 3 次：先隐藏，等待 1 秒；再显示，等待 1 秒。两个相反的动作交替出现，也是一种规律。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 3 次", category: "control", shape: "loop" },
      { label: "隐藏", category: "looks" },
      { label: "等待 1 秒", category: "control" },
      { label: "显示", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "用循环重复闪烁", anyOf: ["control_repeat"] },
      { id: "hide", label: "先把自己藏起来", anyOf: ["looks_hide"] },
      { id: "show", label: "再把自己显示出来", anyOf: ["looks_show"] },
      { id: "wait", label: "每次变化后停一下", anyOf: ["control_wait"] },
    ],
    runtimeGoal: {
      label: "角色一闪一闪地出现三次",
      check: finished,
    },
    hints: [
      "藏起来、再出现、藏起来、再出现……这就是交替。",
      "“显示”和“隐藏”都在“外观”分类，是好朋友。",
      "顺序是：隐藏 → 等待 → 显示 → 等待，放进“重复 3 次”里。",
    ],
  },
  {
    taskId: "pattern_predict",
    chapter: "规律与模式",
    title: "猜不到的规律",
    description:
      "重复 3 次：把“数据”设成一个 1 到 6 的随机数，等待 1 秒。随机数没有规律可循，所以只能猜个大概。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 3 次", category: "control", shape: "loop" },
      { label: "将 数据 设为 随机数 1 到 6", category: "variable" },
      { label: "等待 1 秒", category: "control" },
      { label: "显示变量 数据", category: "variable" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "用循环多抽几次", anyOf: ["control_repeat"] },
      {
        id: "random",
        label: "用随机数产生不确定",
        anyOf: ["kids_random_number"],
      },
      { id: "set", label: "把结果存进变量", anyOf: ["kids_variable_set"] },
      { id: "show", label: "把结果显示出来", anyOf: ["kids_variable_show"] },
    ],
    runtimeGoal: {
      label: "运行三次，每次的数据都可能不一样",
      check: (report) => finished(report) && anyVariableTracked(report),
    },
    hints: [
      "有些事情有规律，有些没有——随机数就是没有规律的那种。",
      "“随机数…到…”在“运算”分类，拖进“将…设为…”的圆孔。",
      "把它放进“重复 3 次”里，每次运行的结果都会变。",
    ],
  },
  {
    taskId: "think_if",
    chapter: "会判断的程序",
    title: "用如果做第一个判断",
    description:
      "把“数据”设为 5，如果它大于 3 就说“数据够多了”。这就是人工智能做决定的最小单位：看特征，下结论。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "将 数据 设为 5", category: "variable" },
      { label: "如果 那么", category: "condition", shape: "condition" },
      { label: "数据 > 3", category: "variable" },
      { label: "说 数据够多了 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "set", label: "先准备一个特征值", anyOf: ["kids_variable_set"] },
      {
        id: "compare",
        label: "用变量比较当条件",
        anyOf: ["kids_variable_compare"],
      },
      { id: "if", label: "用“如果…那么”判断", anyOf: ["kids_if"] },
      { id: "say", label: "条件成立时说一句话", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "运行后程序说出它的判断",
      check: (report) => finished(report) && anyVariableTracked(report),
    },
    hints: [
      "判断只需要两样东西：一个可以观察的特征，一条分界线。",
      "“如果…那么”在“判断”分类，菱形空位放条件。",
      "如果 数据 > 3 那么 说“数据够多了”，把“说”放进“那么”里面。",
    ],
  },
  {
    taskId: "think_else",
    chapter: "会判断的程序",
    title: "两种结果都要有",
    description:
      "把“数据”设为 1，如果它大于 3 就说“够多了”，否则说“还要再收集”。少了“否则”，程序在另一种情况下就会沉默。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "将 数据 设为 1", category: "variable" },
      { label: "如果 那么 否则", category: "condition", shape: "condition" },
      { label: "数据 > 3", category: "variable" },
      { label: "说 还要再收集 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "set", label: "先准备一个特征值", anyOf: ["kids_variable_set"] },
      {
        id: "compare",
        label: "用变量比较当条件",
        anyOf: ["kids_variable_compare"],
      },
      {
        id: "ifElse",
        label: "用“如果…那么…否则”",
        anyOf: ["kids_if_else"],
      },
      { id: "say", label: "两种结果都要说话", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "数据不满足条件时，程序也能给出回答",
      check: (report) => finished(report) && anyVariableTracked(report),
    },
    hints: [
      "只写“如果”，另一种情况就没人管了；加上“否则”才完整。",
      "“如果…那么…否则”比“如果…那么”多一个“否则”出口。",
      "把“说”放进“否则”里面，这样数据小的时候也有反应。",
    ],
  },
  {
    taskId: "think_touch",
    chapter: "会判断的程序",
    title: "用“碰到”当特征",
    description:
      "点击开始后向右走 3 格，如果碰到宝箱就说“找到了”。位置、距离、有没有碰到，都可以当作判断的特征。",
    projectMode: "treasure-template",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "向右移动 3 格", category: "motion" },
      { label: "如果碰到 宝箱", category: "condition", shape: "condition" },
      { label: "说 找到了 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "move", label: "先向宝箱走过去", anyOf: ["motion_movesteps"] },
      {
        id: "ifTouching",
        label: "用“如果碰到”判断",
        anyOf: ["kids_if_touching"],
      },
      { id: "say", label: "碰到时说一句话", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "走到宝箱那里并说出找到啦",
      check: (report) =>
        finished(report) && (report.touchedPairs?.length ?? 0) >= 1,
    },
    hints: [
      "“有没有碰到某个东西”也是一个很常用的特征。",
      "“如果碰到…”在“判断”分类，下拉框里可以选宝箱。",
      "先移动再判断：移动积木要放在“如果碰到”的上面。",
    ],
  },
  {
    taskId: "think_two",
    chapter: "会判断的程序",
    title: "两个特征一起看",
    description:
      "只有同时“碰到宝箱”并且“得分大于 2”时才说“完美”。看得的特征越多，判断就越准确。",
    projectMode: "treasure-template",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "将得分增加 3", category: "game" },
      { label: "向右移动 3 格", category: "motion" },
      { label: "如果 那么", category: "condition", shape: "condition" },
      { label: "碰到 宝箱？ 并且 得分 > 2", category: "condition" },
      { label: "说 完美 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "score", label: "先把得分准备好", anyOf: ["kids_score_change"] },
      { id: "move", label: "向宝箱走过去", anyOf: ["motion_movesteps"] },
      { id: "if", label: "用“如果…那么”判断", anyOf: ["kids_if"] },
      {
        id: "and",
        label: "把两个条件用“并且”连起来",
        anyOf: ["kids_logic_and"],
      },
      {
        id: "touching",
        label: "第一个特征：碰到宝箱",
        anyOf: ["kids_touching_condition"],
      },
      {
        id: "scoreCompare",
        label: "第二个特征：得分够高",
        anyOf: ["kids_score_compare"],
      },
      { id: "say", label: "两个条件都满足时说话", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "同时满足两个条件，程序说出“完美”",
      check: (report) =>
        finished(report) &&
        report.score >= 1 &&
        (report.touchedPairs?.length ?? 0) >= 1,
    },
    hints: [
      "一个特征容易看走眼，两个特征一起看更稳。",
      "“并且”在“判断”分类，它有两个菱形空位可以各放一个条件。",
      "把“碰到 宝箱？”放左边，“得分 > 2”放右边，再整体塞进“如果”。",
    ],
  },
  {
    taskId: "think_or",
    chapter: "会判断的程序",
    title: "满足一个就够了",
    description:
      "只要“碰到宝箱”或者“得分大于 5”其中一个成立，就说“过关”。“或者”比“并且”宽松很多。",
    projectMode: "treasure-template",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "将得分增加 1", category: "game" },
      { label: "向右移动 3 格", category: "motion" },
      { label: "如果 那么", category: "condition", shape: "condition" },
      { label: "碰到 宝箱？ 或者 得分 > 5", category: "condition" },
      { label: "说 过关 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "score", label: "先让得分有变化", anyOf: ["kids_score_change"] },
      { id: "move", label: "向宝箱走过去", anyOf: ["motion_movesteps"] },
      { id: "if", label: "用“如果…那么”判断", anyOf: ["kids_if"] },
      { id: "or", label: "用“或者”放宽条件", anyOf: ["kids_logic_or"] },
      {
        id: "touching",
        label: "条件一：碰到宝箱",
        anyOf: ["kids_touching_condition"],
      },
      {
        id: "scoreCompare",
        label: "条件二：得分够高",
        anyOf: ["kids_score_compare"],
      },
      { id: "say", label: "任一条件满足就说话", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "两个条件满足其一，程序就回应",
      check: (report) => finished(report) && report.score >= 1,
    },
    hints: [
      "“并且”要求两个都成立，“或者”只要一个就够了。",
      "“或者”也在“判断”分类，长得和“并且”很像，别拿错。",
      "碰到宝箱时条件就成立了，不用等到得分超过 5。",
    ],
  },
  {
    taskId: "think_threshold",
    chapter: "会判断的程序",
    title: "调一调分界线",
    description:
      "把“数据”设为 4，如果它大于 2 就说“大”，否则说“小”。再试着把 2 改成别的数字，看看判断会不会变。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "将 数据 设为 4", category: "variable" },
      { label: "如果 那么 否则", category: "condition", shape: "condition" },
      { label: "数据 > 2", category: "variable" },
      { label: "说 大 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "set", label: "先准备一个特征值", anyOf: ["kids_variable_set"] },
      {
        id: "compare",
        label: "用变量比较当条件",
        anyOf: ["kids_variable_compare"],
      },
      {
        id: "ifElse",
        label: "两种情况都要回答",
        anyOf: ["kids_if_else"],
      },
      { id: "say", label: "说出判断结果", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "程序按分界线给出“大”或“小”",
      check: (report) => finished(report) && anyVariableTracked(report),
    },
    hints: [
      "分界线往左挪，被判成“大”的就会变多；往右挪就会变少。",
      "条件积木里那个数字就是分界线，点一下就能改。",
      "把 2 改成 5 再运行一次，答案会从“大”变成“小”。",
    ],
  },
  {
    taskId: "think_train",
    chapter: "会判断的程序",
    title: "用三次练习定规则",
    description:
      "重复 3 次把“数据”加 1，练完之后如果数据大于 2 就说“我学会了”，否则说“还要练习”。练得越多，规则越可信。",
    projectMode: "coin-template",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 3 次", category: "control", shape: "loop" },
      { label: "将 数据 增加 1", category: "variable" },
      { label: "如果 那么 否则", category: "condition", shape: "condition" },
      { label: "数据 > 2", category: "variable" },
      { label: "说 我学会了 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "先练习三次", anyOf: ["control_repeat"] },
      {
        id: "increase",
        label: "每次练习把数据加 1",
        anyOf: ["kids_variable_increase"],
      },
      {
        id: "compare",
        label: "练完后用分界线判断",
        anyOf: ["kids_variable_compare"],
      },
      {
        id: "ifElse",
        label: "学会和没学会都要说",
        anyOf: ["kids_if_else"],
      },
      { id: "say", label: "说出练习结果", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "数据累积到 3，并给出学会或继续练习",
      check: (report) => finished(report) && anyVariableAtLeast(report, 3),
    },
    hints: [
      "练一遍不够，练三遍才算数——练习的次数就是数据量。",
      "循环要放在判断的前面，先收集再下结论。",
      "重复 3 次放在上面，下面接：如果 数据 > 2 那么 说“我学会了” 否则 说“还要练习”。",
    ],
  },
  {
    taskId: "think_check",
    chapter: "会判断的程序",
    title: "检查判断对不对",
    description:
      "重复 3 次把“数据”加 1，然后如果数据大于等于 3 就宣布成功，否则宣布失败。做完判断，还要验收结果。",
    projectMode: "coin-template",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 3 次", category: "control", shape: "loop" },
      { label: "将 数据 增加 1", category: "variable" },
      { label: "如果 那么 否则", category: "condition", shape: "condition" },
      { label: "数据 > 2", category: "variable" },
      { label: "游戏 成功", category: "game" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "先收集三轮数据", anyOf: ["control_repeat"] },
      {
        id: "increase",
        label: "每轮把数据加 1",
        anyOf: ["kids_variable_increase"],
      },
      {
        id: "compare",
        label: "用分界线判断成败",
        anyOf: ["kids_variable_compare"],
      },
      { id: "ifElse", label: "成功和失败都要处理", anyOf: ["kids_if_else"] },
      { id: "result", label: "用结果积木宣布成绩", anyOf: ["kids_result"] },
    ],
    runtimeGoal: {
      label: "数据达标后宣布成功",
      check: (report) =>
        finished(report) &&
        anyVariableAtLeast(report, 3) &&
        report.result === "success",
    },
    hints: [
      "判断完要验收：到底成功还是失败，得让程序自己说出来。",
      "“游戏 成功”在“游戏”分类，它还有一个“失败”的版本。",
      "成功放“那么”里，失败放“否则”里，两个都要填上。",
    ],
  },
  {
    taskId: "ai_helper",
    chapter: "AI 小创客",
    title: "做一个提醒小助手",
    description:
      "重复 3 次把得分加 1，加完后如果得分大于 2 就播放成功声音。会观察、会提醒，这就是一个小助手。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 3 次", category: "control", shape: "loop" },
      { label: "将得分增加 1", category: "game" },
      { label: "如果 那么", category: "condition", shape: "condition" },
      { label: "得分 > 2", category: "game" },
      { label: "播放声音 成功", category: "sound" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "连续记录三次", anyOf: ["control_repeat"] },
      { id: "score", label: "每次把得分加 1", anyOf: ["kids_score_change"] },
      { id: "if", label: "记录完做一次判断", anyOf: ["kids_if"] },
      {
        id: "compare",
        label: "用得分比较当条件",
        anyOf: ["kids_score_compare"],
      },
      { id: "sound", label: "达标了就提醒一下", anyOf: ["sound_play"] },
    ],
    runtimeGoal: {
      label: "得分累计到 3，小助手发出提醒",
      check: (report) => finished(report) && report.score >= 3,
    },
    hints: [
      "小助手的工作流程是：先记录，再判断，最后提醒。",
      "“将得分增加…”在“游戏”分类，“播放声音”在“声音”分类。",
      "循环放在上面，下面接：如果 得分 > 2 那么 播放声音。",
    ],
  },
  {
    taskId: "ai_quiz",
    chapter: "AI 小创客",
    title: "会回答问题的机器人",
    description:
      "点击角色时随机抽一个 1 到 3 的数字，等于 1 就说“答案是 A”，否则说“再想想”。用随机数让机器人每次给出不同回答。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击这个角色时", category: "event", shape: "hat" },
      { label: "将 数据 设为 随机数 1 到 3", category: "variable" },
      { label: "如果 那么 否则", category: "condition", shape: "condition" },
      { label: "数据 = 1", category: "variable" },
      { label: "说 答案是 A 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "click",
        label: "点击角色时提问",
        anyOf: ["event_whenthisspriteclicked"],
      },
      { id: "random", label: "随机抽一个答案", anyOf: ["kids_random_number"] },
      { id: "set", label: "把抽到的结果存起来", anyOf: ["kids_variable_set"] },
      {
        id: "compare",
        label: "判断抽到了哪一个",
        anyOf: ["kids_variable_compare"],
      },
      { id: "ifElse", label: "每种结果都有回应", anyOf: ["kids_if_else"] },
      { id: "say", label: "说出机器人的回答", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "每次点击都能得到一个回答",
      check: (report) => finished(report) && anyVariableTracked(report),
    },
    hints: [
      "机器人不一定每次都答一样，随机就是它的“想法”。",
      "“随机数 1 到 3”拖进“将 数据 设为 …”的圆孔里。",
      "如果 数据 = 1 那么 说“答案是 A” 否则 说“再想想”。",
    ],
  },
  {
    taskId: "ai_sort",
    chapter: "AI 小创客",
    title: "用消息传递建议",
    description:
      "点击角色时广播一条消息，收到消息的角色说出自己的建议。像小助手那样“把话说给别人听”，靠的就是消息。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击这个角色时", category: "event", shape: "hat" },
      { label: "广播消息 建议", category: "event" },
      { label: "收到消息 建议 时", category: "event", shape: "hat" },
      { label: "说 我建议你再试一次 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "click",
        label: "点击角色时发出消息",
        anyOf: ["event_whenthisspriteclicked"],
      },
      { id: "broadcast", label: "广播一条消息", anyOf: ["kids_broadcast"] },
      {
        id: "receive",
        label: "用“收到消息时”接住它",
        anyOf: ["kids_when_message"],
      },
      { id: "say", label: "收到消息后给出建议", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "点击角色后，消息被接住并给出建议",
      check: finished,
    },
    hints: [
      "消息就像传小纸条：一端写，另一端收。",
      "“广播消息”和“收到消息…时”都在“事件”分类，名字要选一样的。",
      "两段脚本分开摆：一段负责广播，一段负责收到后说话。",
    ],
  },
  {
    taskId: "ai_music",
    chapter: "AI 小创客",
    title: "会作曲的小音乐家",
    description:
      "点击开始后广播“演奏”，收到消息就重复 4 次交替播放两种声音，最后宣布成功。把动作排好队，就是一段作品。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "广播消息 演奏", category: "event" },
      { label: "收到消息 演奏 时", category: "event", shape: "hat" },
      { label: "重复 4 次", category: "control", shape: "loop" },
      { label: "播放声音 鼓声", category: "sound" },
      { label: "游戏 成功", category: "game" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "broadcast", label: "广播开始演奏", anyOf: ["kids_broadcast"] },
      {
        id: "receive",
        label: "收到消息才开始演奏",
        anyOf: ["kids_when_message"],
      },
      { id: "repeat", label: "重复四段旋律", anyOf: ["control_repeat"] },
      { id: "sound", label: "循环里播放声音", anyOf: ["sound_play"] },
      { id: "result", label: "演奏完宣布成功", anyOf: ["kids_result"] },
    ],
    runtimeGoal: {
      label: "收到消息后演奏四段并宣布成功",
      check: (report) => finished(report) && report.result === "success",
    },
    hints: [
      "作曲其实就是把声音按固定顺序排好队，再重复几遍。",
      "两段脚本：一段只管广播，一段负责“收到消息时”演奏。",
      "“游戏 成功”放在循环后面，等演奏完再宣布。",
    ],
  },
  {
    taskId: "ai_story",
    chapter: "AI 小创客",
    title: "会编故事的程序",
    description:
      "点击开始后先说一句开场白，再切换到下一个场景；场景开始时说出那里的故事。场景一换，故事就翻页了。",
    projectMode: "dialogue-template",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "说 从前有座森林 2 秒", category: "looks" },
      { label: "切换到下一个场景", category: "game" },
      { label: "场景开始时", category: "event", shape: "hat" },
      { label: "说 故事翻页啦 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "say", label: "先说一句开场白", anyOf: ["looks_sayforsecs"] },
      {
        id: "nextScene",
        label: "换到下一个场景",
        anyOf: ["kids_next_scene", "kids_switch_scene"],
      },
      {
        id: "sceneStart",
        label: "用“场景开始时”接住换场",
        anyOf: ["kids_when_scene_starts"],
      },
    ],
    runtimeGoal: {
      label: "至少换一次场景，并在新场景继续说故事",
      check: (report) => finished(report) && (report.sceneChanges ?? 0) > 0,
    },
    hints: [
      "故事要有场景：说完这一页，就翻到下一页。",
      "“切换到下一个场景”在“游戏”分类，“场景开始时”在“事件”分类。",
      "两段脚本分开：一段负责开场和换场，一段负责新场景里的台词。",
    ],
  },
  {
    taskId: "ai_limit",
    chapter: "AI 小创客",
    title: "人工智能也会答错",
    description:
      "把“数据”设为 5，如果它大于 3 就说“数据够多”。现在把 5 改成 1 再运行一次——你会发现程序一句话都不说，这就是漏掉情况的样子。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "将 数据 设为 5", category: "variable" },
      { label: "如果 那么", category: "condition", shape: "condition" },
      { label: "数据 > 3", category: "variable" },
      { label: "说 数据够多啦 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "set", label: "把数据设为 5", anyOf: ["kids_variable_set"] },
      {
        id: "compare",
        label: "用变量比较当条件",
        anyOf: ["kids_variable_compare"],
      },
      { id: "if", label: "只写“如果…那么”", anyOf: ["kids_if"] },
      { id: "say", label: "条件成立时说话", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "按提示先跑通，再把 5 改成 1 观察一下",
      check: (report) => finished(report) && anyVariableAtLeast(report, 5),
    },
    hints: [
      "这一关故意只给“如果”，没给“否则”——看看会发生什么。",
      "先把数据设成 5 让条件成立，跑通这一关。",
      "然后把 5 改成 1 再运行：程序一声不吭，这就是人工智能漏掉情况时的样子。",
    ],
  },
  {
    taskId: "ai_fair",
    chapter: "AI 小创客",
    title: "把漏掉的情况补上",
    description:
      "把上一关改成“如果…那么…否则”：数据设为 1 时也能说“还要再收集”。补上没考虑到的情况，判断才更公平。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "将 数据 设为 1", category: "variable" },
      { label: "如果 那么 否则", category: "condition", shape: "condition" },
      { label: "数据 > 3", category: "variable" },
      { label: "说 还要再收集 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "set", label: "把数据设为 1", anyOf: ["kids_variable_set"] },
      {
        id: "compare",
        label: "用变量比较当条件",
        anyOf: ["kids_variable_compare"],
      },
      { id: "ifElse", label: "改成“如果…那么…否则”", anyOf: ["kids_if_else"] },
      { id: "say", label: "两种数据都要有回答", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "数据小的时候，程序也要给出回答",
      check: (report) => finished(report) && anyVariableTracked(report),
    },
    hints: [
      "上一关的漏洞就在这里补：给另一种情况也留一句话。",
      "把“如果…那么”换成“如果…那么…否则”，多出来的出口就是补漏的地方。",
      "把“说”放进“否则”里，这样数据是 1 的时候也有回应。",
    ],
  },
  {
    taskId: "ai_final",
    chapter: "AI 小创客",
    title: "毕业作品：我的智能小世界",
    description:
      "综合所学：重复 3 次收集得分，然后判断得分是否达标——达标就宣布成功并播放声音，否则宣布失败。做出属于你的智能小作品。",
    projectMode: "treasure-template",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 3 次", category: "control", shape: "loop" },
      { label: "将得分增加 1", category: "game" },
      { label: "如果 那么 否则", category: "condition", shape: "condition" },
      { label: "得分 > 2", category: "game" },
      { label: "游戏 成功", category: "game" },
      { label: "播放声音 成功", category: "sound" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "用循环收集三次", anyOf: ["control_repeat"] },
      { id: "score", label: "每次把得分加 1", anyOf: ["kids_score_change"] },
      {
        id: "compare",
        label: "用得分比较当条件",
        anyOf: ["kids_score_compare"],
      },
      { id: "ifElse", label: "成功和失败都要处理", anyOf: ["kids_if_else"] },
      { id: "result", label: "宣布最终结果", anyOf: ["kids_result"] },
      { id: "sound", label: "成功时播放声音", anyOf: ["sound_play"] },
    ],
    runtimeGoal: {
      label: "得分达标，宣布成功并播放声音",
      check: (report) =>
        finished(report) && report.score >= 3 && report.result === "success",
    },
    hints: [
      "毕业作品把四件事串起来：收集数据 → 判断 → 宣布结果 → 给反馈。",
      "循环在最上面，判断在中间，结果和声音放在“那么”“否则”里。",
      "如果 得分 > 2 那么「游戏 成功」+「播放声音」 否则「游戏 失败」。",
    ],
  },
];
