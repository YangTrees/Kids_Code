import type { RuntimeReport } from "@kids-code/runtime";
import type { Project } from "@kids-code/domain";
import type { CreationTask, TaskId } from "../task-types";
import {
  hasBranch,
  hasExecutions,
  hasLoop,
  hasMessageResponse,
} from "./task-program-v2";

const observedSix = (report: RuntimeReport) =>
  (report.variableHistory?.var_1 ?? []).slice(-6).join(",") === "1,2,3,4,5,6" &&
  report.variables.var_1 === 6;

const answersMatch = (report: RuntimeReport, answers: string[]) =>
  report.spokenTexts?.length === answers.length &&
  answers.every(
    (answer, index) =>
      report.spokenTexts?.[index]?.replace(/[\s。，！？,.!?]/g, "") ===
      answer.replace(/[\s。，！？,.!?]/g, ""),
  );

const finished = (report: RuntimeReport) => report.status === "COMPLETED";

const anyVariableAtLeast = (report: RuntimeReport, min: number) =>
  Object.values(report.variables ?? {}).some((value) => value >= min);

const anyVariableTracked = (report: RuntimeReport) =>
  Object.keys(report.variables ?? {}).length > 0;

const saidSomething = (report: RuntimeReport) =>
  (report.spokenTexts?.length ?? 0) > 0;

const playedSound = (report: RuntimeReport) =>
  (report.playedSounds?.length ?? 0) > 0;

/** Later lessons test a series of inputs instead of one preselected true condition. */
function sampleLesson(options: {
  title: string;
  threshold: number;
  low?: string;
  high: string;
  score?: boolean;
  result?: boolean;
  difficulty: 3 | 4 | 5;
}): Partial<CreationTask> {
  const { threshold, low, high, score, result, difficulty } = options;
  const branchType = low ? "kids_if_else" : "kids_if";
  const expected = Array.from({ length: 6 }, (_, index) => index + 1).flatMap(
    (value) => (value > threshold ? [high] : low ? [low] : []),
  );
  return {
    title: options.title,
    difficulty,
    description: `从数据 0 开始，重复 6 次，每次先加 1，再判断是否大于 ${threshold}：成立说“${high}”${low ? `，否则说“${low}”` : ""}。${score ? "只有条件成立才把得分加 1。" : ""}${result ? "最后检查得分，达到 3 分才宣布成功，否则失败。" : "观察分界线两侧的结果。"}`,
    blockGuide: [
      { label: "点击绿旗时", category: "event", shape: "hat" },
      { label: "将 数据 设为 0", category: "variable" },
      ...(score ? [{ label: "将得分设为 0", category: "game" as const }] : []),
      { label: "重复 6 次", category: "control", shape: "loop" },
      { label: "将 数据 增加 1", category: "variable" },
      {
        label: `如果 数据 > ${threshold}${low ? " 那么 否则" : " 那么"}`,
        category: "condition",
        shape: "condition",
      },
      {
        label: `说 ${high}${low ? ` / ${low}` : ""} 0.5 秒`,
        category: "looks",
      },
      ...(score
        ? [{ label: "将得分增加 1（仅达标时）", category: "game" as const }]
        : []),
      ...(result
        ? [
            {
              label: "如果 得分 > 2 那么 否则",
              category: "condition" as const,
              shape: "condition" as const,
            },
            { label: "游戏 成功 / 失败", category: "game" as const },
          ]
        : []),
    ],
    rules: [
      { id: "start", label: "用绿旗开始", anyOf: ["event_whenflagclicked"] },
      { id: "set", label: "归零后开始新一轮", anyOf: ["kids_variable_set"] },
      { id: "repeat", label: "循环检查六份数据", anyOf: ["control_repeat"] },
      {
        id: "increase",
        label: "每轮数据增加 1",
        anyOf: ["kids_variable_increase"],
      },
      {
        id: "compare",
        label: "用变量比较划分数据",
        anyOf: ["kids_variable_compare"],
      },
      {
        id: "branch",
        label: low ? "两种情况都有回应" : "只有满足条件才回应",
        anyOf: [branchType],
      },
      { id: "say", label: "在对应分支给出回答", anyOf: ["looks_sayforsecs"] },
      ...(score
        ? [
            {
              id: "reset-score",
              label: "先把得分归零",
              anyOf: ["kids_score_set"],
            },
            {
              id: "score",
              label: "只给达标样本计分",
              anyOf: ["kids_score_change"],
            },
          ]
        : []),
      ...(result
        ? [
            {
              id: "score-compare",
              label: "检查累计的达标数量",
              anyOf: ["kids_score_compare"],
            },
            { id: "result", label: "验收成功或失败", anyOf: ["kids_result"] },
          ]
        : []),
    ],
    runtimeGoal: {
      label: `按顺序检查 1–6，正确输出 ${expected.length} 次${score ? `，得分等于 ${6 - threshold}` : ""}${result ? "并验收成功" : ""}`,
      check: (report) =>
        finished(report) &&
        observedSix(report) &&
        answersMatch(report, expected) &&
        (!score || report.score === 6 - threshold) &&
        (!result || report.result === "success"),
    },
    programGoal: {
      label: "先更新数据，再在循环中判断；回答和加分放进正确分支",
      check: (project) =>
        hasLoop(project, ["kids_variable_increase", branchType]) &&
        hasBranch(
          project,
          "kids_variable_compare",
          score
            ? ["looks_sayforsecs", "kids_score_change"]
            : ["looks_sayforsecs"],
          low ? ["looks_sayforsecs"] : [],
        ) &&
        (!result ||
          hasBranch(
            project,
            "kids_score_compare",
            ["kids_result"],
            ["kids_result"],
          )),
    },
    hints: [
      "先处理一份数据，再把更新和判断一起放进循环。不要直接把数据设为 6。",
      `数据设为 0 → 重复 6 次：数据增加 1 → 如果 数据 > ${threshold} 说“${high}”${low ? `，否则说“${low}”` : ""}。`,
      score
        ? `得分也先归零；加分只放在“那么”里。${result ? "循环结束后再判断得分 > 2，分别放成功和失败。" : "逐个数出达标样本，检查总分。"}`
        : "用 0.5 秒的说话时间观察输出；边界值本身不满足“大于”，别把它算进去。",
    ],
  };
}

const completedSquare = (report: RuntimeReport) => {
  const trail = report.spriteTrails?.spr_liji;
  if (!trail || trail.length !== 5) return false;
  const [start, right, down, left, end] = trail;
  if (!start || !right || !down || !left || !end) return false;
  const near = (a: number, b: number) => Math.abs(a - b) <= 2;
  return (
    near(right.x - start.x, 120) &&
    near(right.y, start.y) &&
    near(down.x, right.x) &&
    near(down.y - right.y, 120) &&
    near(left.x - down.x, -120) &&
    near(left.y, down.y) &&
    near(end.x, start.x) &&
    near(end.y, start.y)
  );
};

const turnedAway = (report: RuntimeReport) =>
  Math.abs((report.spriteRotations?.spr_liji ?? 0) % 360) > 1;

/**
 * 后四个单元参考 Hour of AI 的学习路径设计：
 * 先认识数据，再发现规律，然后用规则做判断，最后做出自己的智能小作品。
 * 平台上没有真实的模型训练，全部用变量、循环和条件把 AI 的思维方式拆开演示。
 */
const tasks: CreationTask[] = [
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
      check: (report) =>
        finished(report) && (report.visibleVariables?.length ?? 0) > 0,
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
      check: (report) =>
        finished(report) && anyVariableTracked(report) && saidSomething(report),
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
      label: "数据累积到 3，两种情况都写好回答并说出当前结果",
      check: (report) =>
        finished(report) &&
        anyVariableAtLeast(report, 3) &&
        saidSomething(report),
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
      "先把 1–6 的数字卡拖进正确的两堆，再编程分类一份新数据：大于 3 进大堆，否则进小堆。",
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
      check: (report) => {
        const value = report.variables.var_1;
        const answer = report.spokenTexts?.at(-1) ?? "";
        return (
          finished(report) &&
          value !== undefined &&
          Number.isInteger(value) &&
          value >= 1 &&
          value <= 6 &&
          answer.includes(value > 3 ? "大堆" : "小堆")
        );
      },
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
    title: "画出五次观察",
    description:
      "重复 5 次，每次把“数据”增加 1。让五次记录画成柱状图，再找出最高的一根。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 5 次", category: "control", shape: "loop" },
      { label: "将 数据 增加 1", category: "variable" },
      { label: "显示变量 数据", category: "variable" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "重复五次观察", anyOf: ["control_repeat"] },
      {
        id: "increase",
        label: "每次把数据加 1",
        anyOf: ["kids_variable_increase"],
      },
      {
        id: "show",
        label: "让数据在舞台上可见",
        anyOf: ["kids_variable_show"],
      },
    ],
    runtimeGoal: {
      label: "本次运行依次记录 1、2、3、4、5",
      check: (report) => finished(report) && anyVariableAtLeast(report, 5),
    },
    hints: [
      "每记录一次数据，图表就会多一根柱子，这叫可视化。",
      "先显示“数据”变量，再把“将 数据 增加 1”放进重复积木里。",
      "重复次数改成 5；运行后比较五根柱，点击最高的一根。",
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
      check: (report) =>
        finished(report) && (report.playedSounds?.length ?? 0) >= 4,
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
      "重复 4 次：朝面向方向前进 3 格，再右转 90 度。每转一次，前进的方向也跟着改变。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 4 次", category: "control", shape: "loop" },
      { label: "朝面向方向前进 3 格", category: "motion" },
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
      { id: "move", label: "循环里向前走", anyOf: ["kids_move_forward"] },
      {
        id: "turn",
        label: "每条边之后转弯",
        anyOf: ["motion_turnright", "kids_turn_left"],
      },
    ],
    runtimeGoal: {
      label: "角色沿四条边走回出发点",
      check: (report) => finished(report) && completedSquare(report),
    },
    hints: [
      "正方形有四条边，而且每一条都长得一模一样。",
      "要选“朝面向方向前进”，不能用始终向屏幕右侧移动的积木。",
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
      label: "累计左转 270 度，最后朝向等效为右转 90 度",
      check: (report) =>
        finished(report) &&
        turnedAway(report) &&
        Math.abs((((report.spriteRotations?.spr_liji ?? 0) + 360) % 360) - 90) <
          1,
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
      check: (report) =>
        finished(report) && (report.spriteScales?.spr_liji ?? 1) >= 1.35,
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
      { label: "停止 当前脚本", category: "control" },
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
      label: "分数超过 4 后，当前脚本自己停下来",
      check: (report) => finished(report) && report.score >= 5,
    },
    hints: [
      "“重复执行”不会自己结束，得给它一个“到这儿就停”的理由。",
      "“停止”在“控制”分类，选“当前脚本”，让这一段循环正常结束。",
      "在“重复执行”里放“将得分增加 1”，再放：如果 得分 > 4 那么 停止 当前脚本。",
    ],
  },
  {
    taskId: "pattern_tempo",
    chapter: "规律与模式",
    title: "有节奏的舞蹈",
    description:
      "编排两轮四拍舞蹈：外层重复 2 次，内层重复 4 次，每拍右转 90 度、播放声音、等待 0.5 秒。用嵌套循环表达整段再来一遍。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 2 次（整段）", category: "control", shape: "loop" },
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
      label: "两层循环演奏八拍，最后恢复初始朝向",
      check: (report) =>
        finished(report) &&
        report.playedSounds?.length === 8 &&
        Math.abs((report.spriteRotations?.spr_liji ?? 0) % 360) < 1,
    },
    programGoal: {
      label: "四拍循环放进两轮循环，转身、声音和停顿都在内层",
      check: (project) =>
        hasLoop(project, ["motion_turnright", "sound_play", "control_wait"], 2),
    },
    hints: [
      "先做好四拍，再让整段四拍重复两轮，不需要复制八套动作。",
      "外层重复 2 次的肚子里，放一个重复 4 次。",
      "内层放：右转 90 度 → 播放声音 → 等待 0.5 秒。2 × 4 = 8 拍。",
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
      "抽六次 1–6 的随机数，每次立即分类：大于 3 说“大”，否则说“小”，再等待。循环中加入判断，验证每次输出是否匹配抽到的数。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 6 次", category: "control", shape: "loop" },
      { label: "将 数据 设为 随机数 1 到 6", category: "variable" },
      { label: "等待 1 秒", category: "control" },
      { label: "显示变量 数据", category: "variable" },
      {
        label: "如果 数据 > 3 那么 否则",
        category: "condition",
        shape: "condition",
      },
      { label: "说 大 / 小 0.5 秒", category: "looks" },
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
      label: "六次抽样，每次答案匹配当前随机数，不要求随机结果各不相同",
      check: (report) => {
        const samples = (report.variableHistory?.var_1 ?? []).slice(1);
        return (
          finished(report) &&
          samples.length === 6 &&
          samples.every(
            (value) => Number.isInteger(value) && value >= 1 && value <= 6,
          ) &&
          answersMatch(
            report,
            samples.map((value) => (value > 3 ? "大" : "小")),
          ) &&
          Boolean(report.visibleVariables?.includes("var_1"))
        );
      },
    },
    programGoal: {
      label: "随机抽样、双分支判断和等待都放在循环内",
      check: (project) =>
        hasLoop(project, [
          "kids_variable_set",
          "kids_random_number",
          "kids_if_else",
          "control_wait",
        ]) &&
        hasBranch(
          project,
          "kids_variable_compare",
          ["looks_sayforsecs"],
          ["looks_sayforsecs"],
        ),
    },
    hints: [
      "抽到相同数字也正常；要检查的是每次分类是否正确。",
      "把随机数放进设置数据的圆孔；抽一次，就紧接着判断一次。",
      "重复 6 次：数据设为随机 1–6 → 如果 数据 > 3 说“大”否则说“小” → 等待 0.5 秒。",
    ],
  },
  {
    taskId: "think_if",
    chapter: "会判断的程序",
    title: "用如果做第一个判断",
    description:
      "把“数据”设为 5，如果它大于 3 就说“数据够多了”。这是规则程序做决定的一种方式：看数值，下结论。",
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
      check: (report) =>
        finished(report) && anyVariableTracked(report) && saidSomething(report),
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
      check: (report) =>
        finished(report) && anyVariableTracked(report) && saidSomething(report),
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
        finished(report) &&
        (report.touchedPairs?.length ?? 0) >= 1 &&
        saidSomething(report),
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
        (report.touchedPairs?.length ?? 0) >= 1 &&
        saidSomething(report),
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
      check: (report) =>
        finished(report) && report.score >= 1 && saidSomething(report),
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
      check: (report) =>
        finished(report) && anyVariableTracked(report) && saidSomething(report),
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
    title: "数够三次再判断",
    description:
      "重复 3 次把“数据”加 1，再判断是否超过 2。这里记录的是练习次数，并不表示程序真的学会了。",
    projectMode: "coin-template",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "重复 3 次", category: "control", shape: "loop" },
      { label: "将 数据 增加 1", category: "variable" },
      { label: "如果 那么 否则", category: "condition", shape: "condition" },
      { label: "数据 > 2", category: "variable" },
      { label: "说 次数够了 2 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "repeat", label: "先记录三次", anyOf: ["control_repeat"] },
      {
        id: "increase",
        label: "每次记录把数据加 1",
        anyOf: ["kids_variable_increase"],
      },
      {
        id: "compare",
        label: "记录完后用分界线判断",
        anyOf: ["kids_variable_compare"],
      },
      {
        id: "ifElse",
        label: "达标和未达标都要说",
        anyOf: ["kids_if_else"],
      },
      { id: "say", label: "说出记录结果", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "数据累积到 3，并说出是否达标",
      check: (report) =>
        finished(report) &&
        anyVariableAtLeast(report, 3) &&
        saidSomething(report),
    },
    hints: [
      "先记录三次，再根据记录的次数做判断。",
      "循环要放在判断的前面，先收集再下结论。",
      "重复 3 次放在上面，下面接：如果 数据 > 2 那么 说“次数够了” 否则 说“还要再记录”。",
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
      check: (report) =>
        finished(report) && report.score >= 3 && playedSound(report),
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
    title: "随机回答实验",
    description:
      "点击角色时随机抽一个 1 到 3 的数字，等于 1 就说“答案是 A”，否则说“再想想”。比较随机回答与真正理解问题有什么不同。",
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
      label: "点击后根据随机结果给出一句回答",
      check: (report) =>
        finished(report) && anyVariableTracked(report) && saidSomething(report),
    },
    hints: [
      "随机回答会变化，但它没有理解问题；这和真正的智能问答不同。",
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
    title: "编排重复旋律",
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
      check: (report) =>
        finished(report) &&
        report.result === "success" &&
        (report.playedSounds?.length ?? 0) >= 8 &&
        new Set(report.playedSounds).size >= 2,
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
    title: "场景接力故事",
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
      check: (report) =>
        finished(report) &&
        (report.sceneChanges ?? 0) > 0 &&
        (report.spokenTexts?.length ?? 0) >= 2,
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
    title: "规则也会漏掉情况",
    description:
      "先把数据设为 5，再重复检查 2 次：大于 3 就说“数据够多”，每次检查后把数据改成 1。第二次检查会安静下来，找找为什么。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "将 数据 设为 5", category: "variable" },
      { label: "重复 2 次", category: "control", shape: "loop" },
      { label: "如果 那么", category: "condition", shape: "condition" },
      { label: "数据 > 3", category: "variable" },
      { label: "说 数据够多啦 2 秒", category: "looks" },
      { label: "将 数据 设为 1", category: "variable" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "set", label: "把数据设为 5", anyOf: ["kids_variable_set"] },
      { id: "repeat", label: "连续检查两次", anyOf: ["control_repeat"] },
      {
        id: "compare",
        label: "用变量比较当条件",
        anyOf: ["kids_variable_compare"],
      },
      { id: "if", label: "只写“如果…那么”", anyOf: ["kids_if"] },
      { id: "say", label: "条件成立时说话", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "同一次运行先检查 5、再检查 1，只有第一次得到回答",
      check: (report) => {
        const history = report.variableHistory?.var_1 ?? [];
        return (
          finished(report) &&
          history.indexOf(5) >= 0 &&
          history.indexOf(1) > history.indexOf(5) &&
          report.variables.var_1 === 1 &&
          report.spokenTexts?.length === 1
        );
      },
    },
    hints: [
      "这一关故意只给“如果”，没给“否则”——看看会发生什么。",
      "先设为 5，再把“如果 数据 > 3 那么 说话”和“将 数据 设为 1”一起放进重复 2 次里。",
      "第一次会说话，第二次数据已经变成 1，就没有回答；这是规则漏掉情况，不代表真正的人工智能出错。",
    ],
  },
  {
    taskId: "ai_fair",
    chapter: "AI 小创客",
    title: "把漏掉的情况补上",
    description:
      "重新搭建上一关的两次检查，加上“否则”：先检查 5，再检查 1，两次都要得到回答。补上没考虑到的情况，判断才更完整。",
    projectMode: "blank",
    blockGuide: [
      { label: "点击 ⚑ 时", category: "event", shape: "hat" },
      { label: "将 数据 设为 5", category: "variable" },
      { label: "重复 2 次", category: "control", shape: "loop" },
      { label: "如果 那么 否则", category: "condition", shape: "condition" },
      { label: "数据 > 3", category: "variable" },
      { label: "说 还要再收集 2 秒", category: "looks" },
      { label: "将 数据 设为 1", category: "variable" },
    ],
    rules: [
      {
        id: "start",
        label: "用点击开始启动",
        anyOf: ["event_whenflagclicked"],
      },
      {
        id: "set",
        label: "准备 5 和 1 两种数据",
        anyOf: ["kids_variable_set"],
      },
      { id: "repeat", label: "连续检查两次", anyOf: ["control_repeat"] },
      {
        id: "compare",
        label: "用变量比较当条件",
        anyOf: ["kids_variable_compare"],
      },
      { id: "ifElse", label: "改成“如果…那么…否则”", anyOf: ["kids_if_else"] },
      { id: "say", label: "两种数据都要有回答", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "同一次运行先检查 5、再检查 1，两次都有回答",
      check: (report) => {
        const history = report.variableHistory?.var_1 ?? [];
        return (
          finished(report) &&
          history.indexOf(5) >= 0 &&
          history.indexOf(1) > history.indexOf(5) &&
          report.variables.var_1 === 1 &&
          (report.spokenTexts?.length ?? 0) >= 2
        );
      },
    },
    hints: [
      "上一关的漏洞就在这里补：给另一种情况也留一句话。",
      "把“如果…那么”换成“如果…那么…否则”，多出来的出口就是补漏的地方。",
      "把两种“说”分别放进“那么”和“否则”；检查完 5 后把数据设为 1，再检查一遍。",
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
        finished(report) &&
        report.score >= 3 &&
        report.result === "success" &&
        playedSound(report),
    },
    hints: [
      "毕业作品把四件事串起来：收集数据 → 判断 → 宣布结果 → 给反馈。",
      "循环在最上面，判断在中间，结果和声音放在“那么”“否则”里。",
      "如果 得分 > 2 那么「游戏 成功」+「播放声音」 否则「游戏 失败」。",
    ],
  },
];

// Course revision: retain stable task IDs so local assignments and completed work stay valid.
const upgrades: Partial<Record<TaskId, Partial<CreationTask>>> = {
  think_two: {
    title: "并且：缺一个条件都不行",
    difficulty: 4,
    description:
      "测试三种情况：走到宝箱但得分为 0；仍在宝箱处把得分加到 3；再向左退 1 格。每次都检查“碰到宝箱并且得分 > 2”，成立说“完美”，否则说“条件不足”。",
    blockGuide: [
      { label: "点击绿旗时 → 得分设为 0", category: "event", shape: "hat" },
      { label: "向右 3 格 → 第一次判断", category: "motion" },
      { label: "得分增加 3 → 第二次判断", category: "game" },
      { label: "向左 1 格 → 第三次判断", category: "motion" },
      {
        label: "碰到 宝箱？ 并且 得分 > 2",
        category: "operator",
        shape: "condition",
      },
      {
        label: "如果 那么说 完美 否则说 条件不足",
        category: "condition",
        shape: "condition",
      },
    ],
    rules: [
      {
        id: "start",
        label: "绿旗开始并归零得分",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "reset", label: "得分归零", anyOf: ["kids_score_set"] },
      { id: "move", label: "走到宝箱", anyOf: ["motion_movesteps"] },
      { id: "back", label: "退开测试位置条件", anyOf: ["kids_move_left"] },
      { id: "score", label: "改变得分再测试", anyOf: ["kids_score_change"] },
      { id: "branch", label: "两种结果都有回答", anyOf: ["kids_if_else"] },
      { id: "and", label: "连接两个条件", anyOf: ["kids_logic_and"] },
      {
        id: "touch",
        label: "检查宝箱接触",
        anyOf: ["kids_touching_condition"],
      },
      { id: "compare", label: "检查得分", anyOf: ["kids_score_compare"] },
      { id: "say", label: "每次检查都反馈", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "三种情况输出：条件不足、完美、条件不足",
      check: (report) =>
        finished(report) &&
        report.score === 3 &&
        Boolean(
          report.touchedPairs?.some((pair) => pair.includes("spr_box")),
        ) &&
        answersMatch(report, ["条件不足", "完美", "条件不足"]),
    },
    programGoal: {
      label: "并且条件放进如果否则，两个分支都有反馈",
      check: (project) =>
        hasBranch(
          project,
          "kids_logic_and",
          ["looks_sayforsecs"],
          ["looks_sayforsecs"],
        ),
    },
    hints: [
      "只满足位置或只满足得分都不够。需要亲手测试这两种失败。",
      "第一次：得分 0、向右 3 格；第二次：加 3 分；第三次：向左 1 格。每次变化后立即判断。",
      "每次都用同一规则：如果 碰到宝箱 并且 得分 > 2，说“完美”；否则说“条件不足”。",
    ],
  },
  think_or: {
    title: "或者：也要检查两个都不满足",
    difficulty: 4,
    description:
      "得分归零后向右 3 格到宝箱，检查一次；向左退 1 格，再检查；得分增加 6，最后检查。条件为“碰到宝箱或者得分 > 5”，成立说“通过”，否则说“不通过”。",
    blockGuide: [
      { label: "点击绿旗时 → 得分设为 0", category: "event", shape: "hat" },
      { label: "向右 3 格 → 判断", category: "motion" },
      { label: "向左 1 格 → 判断", category: "motion" },
      { label: "得分增加 6 → 判断", category: "game" },
      {
        label: "碰到 宝箱？ 或者 得分 > 5",
        category: "operator",
        shape: "condition",
      },
      {
        label: "如果 那么说 通过 否则说 不通过",
        category: "condition",
        shape: "condition",
      },
    ],
    rules: [
      { id: "start", label: "用绿旗启动", anyOf: ["event_whenflagclicked"] },
      { id: "reset", label: "得分先归零", anyOf: ["kids_score_set"] },
      { id: "move", label: "测试只有接触成立", anyOf: ["motion_movesteps"] },
      { id: "back", label: "测试两个条件都不成立", anyOf: ["kids_move_left"] },
      { id: "score", label: "测试只有得分成立", anyOf: ["kids_score_change"] },
      { id: "branch", label: "两个出口都有回答", anyOf: ["kids_if_else"] },
      { id: "or", label: "使用或者组合", anyOf: ["kids_logic_or"] },
      { id: "touch", label: "检查接触", anyOf: ["kids_touching_condition"] },
      { id: "compare", label: "检查得分", anyOf: ["kids_score_compare"] },
      { id: "say", label: "每次都回应", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "三种情况输出：通过、不通过、通过",
      check: (report) =>
        finished(report) &&
        report.score === 6 &&
        Boolean(
          report.touchedPairs?.some((pair) => pair.includes("spr_box")),
        ) &&
        answersMatch(report, ["通过", "不通过", "通过"]),
    },
    programGoal: {
      label: "或者条件放进如果否则，两个分支都有反馈",
      check: (project) =>
        hasBranch(
          project,
          "kids_logic_or",
          ["looks_sayforsecs"],
          ["looks_sayforsecs"],
        ),
    },
    hints: [
      "或者不是永远成立：两边都不满足时仍然要走否则。",
      "先得分归零，分别在到达宝箱、退开宝箱、得到 6 分后判断一次。",
      "如果 碰到宝箱 或者 得分 > 5，说“通过”；否则说“不通过”。三个输出应该有一次失败。",
    ],
  },
  ai_music: {
    blockGuide: [
      { label: "点击绿旗时 → 广播 演奏", category: "event", shape: "hat" },
      { label: "收到消息 演奏 时", category: "event", shape: "hat" },
      { label: "重复 4 次", category: "control", shape: "loop" },
      {
        label: "声音 A → 等待 0.5 秒 → 声音 B → 等待 0.5 秒",
        category: "sound",
      },
      { label: "游戏成功（循环结束后）", category: "game" },
    ],
    runtimeGoal: {
      label: "接到消息后演奏四组交替双音效，最后成功",
      check: (report) =>
        finished(report) &&
        report.result === "success" &&
        report.playedSounds?.length === 8 &&
        new Set(report.playedSounds).size === 2 &&
        report.playedSounds.every(
          (sound, index, sounds) => sound === sounds[index % 2],
        ),
    },
    programGoal: {
      label: "循环演奏和宣布成功由消息接收脚本完成",
      check: (project) =>
        hasLoop(project, ["sound_play", "control_wait"]) &&
        hasMessageResponse(project, [
          "control_repeat",
          "sound_play",
          "kids_result",
        ]),
    },
  },
  pattern_swap: {
    title: "用状态控制交替信号",
    description:
      "数据先设为 0，循环 6 次：如果数据等于 0，就隐藏并把数据设为 1；否则显示并把数据设为 0。每轮等待 0.5 秒，用变量控制交替闪烁。",
    blockGuide: [
      { label: "点击绿旗时 → 将 数据 设为 0", category: "event", shape: "hat" },
      { label: "重复 6 次", category: "control", shape: "loop" },
      {
        label: "如果 数据 = 0 那么 否则",
        category: "condition",
        shape: "condition",
      },
      { label: "隐藏 → 将 数据 设为 1", category: "looks" },
      { label: "否则：显示 → 将 数据 设为 0", category: "looks" },
      { label: "等待 0.5 秒", category: "control" },
    ],
    rules: [
      { id: "start", label: "用绿旗启动", anyOf: ["event_whenflagclicked"] },
      {
        id: "state",
        label: "用数据记录开关状态",
        anyOf: ["kids_variable_set"],
      },
      { id: "loop", label: "循环切换状态", anyOf: ["control_repeat"] },
      { id: "if", label: "根据状态选择分支", anyOf: ["kids_if_else"] },
      {
        id: "compare",
        label: "检查当前状态",
        anyOf: ["kids_variable_compare"],
      },
      { id: "hide", label: "关灯时隐藏", anyOf: ["looks_hide"] },
      { id: "show", label: "开灯时显示", anyOf: ["looks_show"] },
      { id: "wait", label: "每轮停顿", anyOf: ["control_wait"] },
    ],
    runtimeGoal: {
      label: "状态依次为 1、0、1、0、1、0，完成三次完整闪烁",
      check: (report) =>
        finished(report) &&
        report.variables.var_1 === 0 &&
        (report.variableHistory?.var_1 ?? []).slice(-6).join(",") ===
          "1,0,1,0,1,0",
    },
    programGoal: {
      label: "状态判断放进循环；两个分支分别更新状态和外观",
      check: (project) =>
        hasLoop(project, ["kids_if_else", "control_wait"]) &&
        hasBranch(
          project,
          "kids_variable_compare",
          ["looks_hide", "kids_variable_set"],
          ["looks_show", "kids_variable_set"],
        ),
    },
    hints: [
      "数据只用 0 和 1 两个值，就像开关；每轮翻转一次。",
      "先设为 0。循环中如果 数据 = 0：隐藏并设为 1；否则：显示并设为 0。",
      "等待放在判断后，仍然在循环里。重复 6 次等于三次关灯和三次开灯。",
    ],
  },
  data_show: {
    title: "开始归零，点击记录",
    description:
      "先用绿旗将数据归零并隐藏；点击金币时数据加 1、显示数据并说“记录好了”。点击三次，检验新一轮的记录。",
    blockGuide: [
      {
        label: "点击绿旗时 → 数据设为 0 → 隐藏变量",
        category: "event",
        shape: "hat",
      },
      { label: "点击这个角色时", category: "event", shape: "hat" },
      { label: "将 数据 增加 1", category: "variable" },
      { label: "显示变量 数据", category: "variable" },
      { label: "说 记录好了 0.5 秒", category: "looks" },
    ],
    rules: [
      {
        id: "start",
        label: "绿旗启动新一轮",
        anyOf: ["event_whenflagclicked"],
      },
      { id: "reset", label: "数据归零", anyOf: ["kids_variable_set"] },
      { id: "hide", label: "准备阶段隐藏数据", anyOf: ["kids_variable_hide"] },
      {
        id: "click",
        label: "点击金币开始记录",
        anyOf: ["event_whenthisspriteclicked"],
      },
      {
        id: "increase",
        label: "每次点击记录一次",
        anyOf: ["kids_variable_increase"],
      },
      { id: "show", label: "显示记录结果", anyOf: ["kids_variable_show"] },
      { id: "say", label: "记录后给出反馈", anyOf: ["looks_sayforsecs"] },
    ],
    runtimeGoal: {
      label: "三次点击依次记录 1、2、3，数据可见并回应三次",
      check: (report) =>
        finished(report) &&
        report.variables.var_1 === 3 &&
        (report.variableHistory?.var_1 ?? []).slice(-3).join(",") === "1,2,3" &&
        Boolean(report.visibleVariables?.includes("var_1")) &&
        answersMatch(report, ["记录好了", "记录好了", "记录好了"]),
    },
    hints: [
      "两段程序分工：开始时清理，点击时记录。",
      "栗奇：点击绿旗 → 数据设为 0 → 隐藏变量；金币：点击角色 → 数据加 1 → 显示变量 → 说话。",
      "先运行，再等上一次说完后点下一次；点击金币三次，每次说“记录好了”，数据最后为 3。",
    ],
  },
  think_if: sampleLesson({
    title: "筛出符合条件的数据",
    threshold: 3,
    high: "够多",
    difficulty: 3,
  }),
  think_else: sampleLesson({
    title: "六份数据两种回答",
    threshold: 3,
    high: "大",
    low: "小",
    difficulty: 3,
  }),
  think_threshold: sampleLesson({
    title: "边界值也要测试",
    threshold: 4,
    high: "大",
    low: "小",
    score: true,
    difficulty: 4,
  }),
  think_train: sampleLesson({
    title: "只给达标样本计数",
    threshold: 3,
    high: "达标",
    low: "未达标",
    score: true,
    difficulty: 4,
  }),
  think_check: sampleLesson({
    title: "分类、计数与验收",
    threshold: 3,
    high: "达标",
    low: "未达标",
    score: true,
    result: true,
    difficulty: 4,
  }),
  ai_helper: {
    title: "每次观察都检查",
    description:
      "得分先归零，再循环 5 次：得分加 1，立刻判断是否大于 2；达标时播放提醒音。提醒要在第 3、4、5 次发生。",
    blockGuide: [
      { label: "点击绿旗时", category: "event", shape: "hat" },
      { label: "将得分设为 0", category: "game" },
      { label: "重复 5 次", category: "control", shape: "loop" },
      { label: "将得分增加 1", category: "game" },
      {
        label: "如果 得分 > 2 那么",
        category: "condition",
        shape: "condition",
      },
      { label: "播放声音 成功", category: "sound" },
    ],
    runtimeGoal: {
      label: "循环结束得到 5 分，提醒音恰好响 3 次",
      check: (report) =>
        finished(report) &&
        report.score === 5 &&
        report.playedSounds?.length === 3,
    },
    programGoal: {
      label: "加分与检查都在循环内，提醒放在判断的那么分支",
      check: (project) =>
        hasLoop(project, ["kids_score_change", "kids_if"]) &&
        hasBranch(project, "kids_score_compare", ["sound_play"]),
    },
    hints: [
      "不要等循环结束才检查；每次发生变化就检查一次。",
      "先得分设为 0，再把“加 1”和“如果 得分 > 2”放进重复 5 次。",
      "声音放在那么分支；分数 1、2 不响，3、4、5 各响一次。",
    ],
  },
  ai_quiz: {
    title: "三种答案的规则树",
    description:
      "循环抽三次 1–3 的数字：1 回答 A，2 回答 B，3 回答 C。把第二个如果否则放进第一个否则，覆盖三种结果。",
    blockGuide: [
      { label: "点击这个角色时", category: "event", shape: "hat" },
      { label: "重复 3 次", category: "control", shape: "loop" },
      { label: "将 数据 设为 随机数 1 到 3", category: "variable" },
      {
        label: "如果 数据 = 1 那么 否则",
        category: "condition",
        shape: "condition",
      },
      {
        label: "否则中：如果 数据 = 2 那么 否则",
        category: "condition",
        shape: "condition",
      },
      { label: "说 A / B / C 0.5 秒", category: "looks" },
    ],
    runtimeGoal: {
      label: "三次随机回答分别匹配 1→A、2→B、3→C",
      check: (report) => {
        const samples = (report.variableHistory?.var_1 ?? []).slice(1);
        return (
          finished(report) &&
          samples.length === 3 &&
          samples.every(
            (value) => Number.isInteger(value) && value >= 1 && value <= 3,
          ) &&
          answersMatch(
            report,
            samples.map((value) => ["A", "B", "C"][value - 1]!),
          )
        );
      },
    },
    programGoal: {
      label: "循环中抽样，并用嵌套的否则处理第二、第三种答案",
      check: (project) =>
        hasLoop(project, ["kids_random_number", "kids_if_else"]) &&
        hasBranch(
          project,
          "kids_variable_compare",
          ["looks_sayforsecs"],
          ["kids_if_else"],
        ) &&
        hasBranch(
          project,
          "kids_variable_compare",
          ["looks_sayforsecs"],
          ["looks_sayforsecs"],
        ),
    },
    hints: [
      "两个出口只能直接处理两类；第三类要在否则里再判断一次。",
      "外层：数据 = 1 说 A；否则里放：数据 = 2 说 B，否则说 C。",
      "把抽随机数与整棵判断树放进重复 3 次；随机可能重复，它并没有理解问题。",
    ],
  },
  ai_sort: {
    title: "分类消息流水线",
    description:
      "依次检查数据 1–6，大于 3 广播“大堆”，否则广播“小堆”。两段消息接收程序分别说出标签，实现记录、分类、反馈的协作。",
    projectMode: "dialogue-template",
    blockGuide: [
      { label: "点击这个角色时", category: "event", shape: "hat" },
      { label: "将 数据 设为 0", category: "variable" },
      { label: "重复 6 次", category: "control", shape: "loop" },
      { label: "将 数据 增加 1", category: "variable" },
      {
        label: "如果 数据 > 3 那么 否则",
        category: "condition",
        shape: "condition",
      },
      { label: "广播消息 大堆 / 小堆", category: "event" },
      { label: "收到消息 大堆 / 小堆 时", category: "event", shape: "hat" },
      { label: "说 大堆 / 小堆 0.5 秒", category: "looks" },
      { label: "等待 1 秒（下一份数据前）", category: "control" },
    ],
    rules: [
      {
        id: "click",
        label: "点击时启动分类",
        anyOf: ["event_whenthisspriteclicked"],
      },
      { id: "reset", label: "归零后重新记录", anyOf: ["kids_variable_set"] },
      {
        id: "increase",
        label: "依次产生六份数据",
        anyOf: ["kids_variable_increase"],
      },
      { id: "repeat", label: "循环分类", anyOf: ["control_repeat"] },
      {
        id: "compare",
        label: "按分界线比较",
        anyOf: ["kids_variable_compare"],
      },
      { id: "branch", label: "两种消息分开处理", anyOf: ["kids_if_else"] },
      { id: "broadcast", label: "传递分类结果", anyOf: ["kids_broadcast"] },
      { id: "receive", label: "接收分类消息", anyOf: ["kids_when_message"] },
      { id: "say", label: "接收后显示标签", anyOf: ["looks_sayforsecs"] },
      { id: "wait", label: "给消息处理留出时间", anyOf: ["control_wait"] },
    ],
    runtimeGoal: {
      label: "六份数据通过消息得到小堆、小堆、小堆、大堆、大堆、大堆",
      check: (report) =>
        finished(report) &&
        observedSix(report) &&
        answersMatch(report, ["小堆", "小堆", "小堆", "大堆", "大堆", "大堆"]),
    },
    programGoal: {
      label: "判断中广播，收到消息的程序负责回应",
      check: (project) =>
        hasLoop(project, [
          "kids_variable_increase",
          "kids_if_else",
          "control_wait",
        ]) &&
        hasBranch(
          project,
          "kids_variable_compare",
          ["kids_broadcast"],
          ["kids_broadcast"],
        ) &&
        hasMessageResponse(project, ["looks_sayforsecs"]),
    },
    hints: [
      "这关不是直接说答案；先发送分类消息，再由接收程序显示标签。",
      "主程序：数据归零 → 重复 6 次：加 1 → 比较并广播 → 等待 1 秒。",
      "再分别搭两段：收到“小堆”→说“小堆”；收到“大堆”→说“大堆”。消息名要一致。",
    ],
  },
  ai_final: {
    ...sampleLesson({
      title: "毕业作品：数据宝箱守卫",
      threshold: 3,
      high: "达标",
      low: "未达标",
      score: true,
      difficulty: 5,
    }),
    description:
      "循环检查 1–6，只有大于 3 才加分。再向宝箱走 3 格；只有碰到宝箱并且得分大于 2，才广播“验收”。接收消息后播放成功音并宣布成功，否则失败。",
    rules: [
      ...sampleLesson({
        title: "",
        threshold: 3,
        high: "达标",
        low: "未达标",
        score: true,
        difficulty: 5,
      }).rules!,
      { id: "move", label: "分类后走向宝箱", anyOf: ["motion_movesteps"] },
      { id: "and", label: "同时验证位置和得分", anyOf: ["kids_logic_and"] },
      {
        id: "touch",
        label: "检查是否碰到宝箱",
        anyOf: ["kids_touching_condition"],
      },
      {
        id: "score-check",
        label: "检查达标数量",
        anyOf: ["kids_score_compare"],
      },
      { id: "send", label: "广播验收消息", anyOf: ["kids_broadcast"] },
      {
        id: "receive",
        label: "收到验收消息后反馈",
        anyOf: ["kids_when_message"],
      },
      { id: "sound", label: "成功时播放声音", anyOf: ["sound_play"] },
      { id: "result", label: "宣布结果", anyOf: ["kids_result"] },
    ],
    blockGuide: [
      ...sampleLesson({
        title: "",
        threshold: 3,
        high: "达标",
        low: "未达标",
        score: true,
        difficulty: 5,
      }).blockGuide!,
      { label: "向右移动 3 格（循环后）", category: "motion" },
      {
        label: "碰到 宝箱？ 并且 得分 > 2",
        category: "operator",
        shape: "condition",
      },
      { label: "广播消息 验收 / 否则 游戏失败", category: "event" },
      { label: "收到消息 验收 时", category: "event", shape: "hat" },
      { label: "播放成功音 → 游戏成功", category: "game" },
    ],
    runtimeGoal: {
      label: "六份数据分类正确、得到 3 分、碰到宝箱并由接收程序验收成功",
      check: (report) =>
        finished(report) &&
        observedSix(report) &&
        report.score === 3 &&
        answersMatch(report, [
          "未达标",
          "未达标",
          "未达标",
          "达标",
          "达标",
          "达标",
        ]) &&
        Boolean(
          report.touchedPairs?.some(
            (pair) => pair.includes("spr_liji") && pair.includes("spr_box"),
          ),
        ) &&
        report.result === "success" &&
        report.playedSounds?.length === 1,
    },
    programGoal: {
      label: "循环分类、双条件验收、消息接力三部分正确连接",
      check: (project) =>
        hasLoop(project, ["kids_variable_increase", "kids_if_else"]) &&
        hasBranch(
          project,
          "kids_variable_compare",
          ["looks_sayforsecs", "kids_score_change"],
          ["looks_sayforsecs"],
        ) &&
        hasBranch(
          project,
          "kids_logic_and",
          ["kids_broadcast"],
          ["kids_result"],
        ) &&
        hasMessageResponse(project, ["sound_play", "kids_result"]),
    },
    hints: [
      "先分类并计分，再走向宝箱，最后验收；循环里不要提前宣布成功。",
      "数据和得分都归零；循环中加数据、判断、回答，达标分支才加分。循环后向右 3 格。",
      "如果 碰到宝箱 并且 得分 > 2：广播“验收”；否则失败。收到“验收”时：播放成功音 → 游戏成功。",
    ],
  },
  ai_story: {
    title: "带着数据翻页的故事",
    difficulty: 5,
    description:
      "先将数据归零，循环 3 次：数据加 1、说“准备”。完成准备才切换场景；新场景开始时判断数据是否大于 2，达标就广播“继续”，收到后说“到达”并宣布成功。",
    blockGuide: [
      { label: "点击绿旗时 → 数据设为 0", category: "event", shape: "hat" },
      { label: "重复 3 次", category: "control", shape: "loop" },
      { label: "将 数据 增加 1 → 说 准备 0.5 秒", category: "variable" },
      { label: "切换到下一个场景（循环后）", category: "game" },
      { label: "场景开始时", category: "event", shape: "hat" },
      {
        label: "如果 数据 > 2 那么 广播 继续",
        category: "condition",
        shape: "condition",
      },
      { label: "收到消息 继续 时", category: "event", shape: "hat" },
      { label: "说 到达 0.5 秒 → 游戏成功", category: "looks" },
    ],
    rules: [
      { id: "start", label: "绿旗启动故事", anyOf: ["event_whenflagclicked"] },
      { id: "reset", label: "数据归零", anyOf: ["kids_variable_set"] },
      { id: "repeat", label: "循环准备", anyOf: ["control_repeat"] },
      {
        id: "increase",
        label: "累计准备次数",
        anyOf: ["kids_variable_increase"],
      },
      { id: "say", label: "说出准备和到达", anyOf: ["looks_sayforsecs"] },
      {
        id: "scene",
        label: "准备后切换场景",
        anyOf: ["kids_next_scene", "kids_switch_scene"],
      },
      {
        id: "scene-start",
        label: "新场景开始时检查",
        anyOf: ["kids_when_scene_starts"],
      },
      { id: "if", label: "达到准备次数才继续", anyOf: ["kids_if"] },
      {
        id: "compare",
        label: "检查准备次数",
        anyOf: ["kids_variable_compare"],
      },
      { id: "send", label: "广播继续消息", anyOf: ["kids_broadcast"] },
      { id: "receive", label: "接收继续消息", anyOf: ["kids_when_message"] },
      { id: "result", label: "故事完成后成功", anyOf: ["kids_result"] },
    ],
    runtimeGoal: {
      label: "准备三次再换场，在新场景回应到达并宣布成功",
      check: (report) =>
        finished(report) &&
        report.variables.var_1 === 3 &&
        (report.sceneChanges ?? 0) === 1 &&
        answersMatch(report, ["准备", "准备", "准备", "到达"]) &&
        report.result === "success",
    },
    programGoal: {
      label: "循环中准备，条件内广播，接收消息后继续故事",
      check: (project) =>
        hasLoop(project, ["kids_variable_increase", "looks_sayforsecs"]) &&
        hasBranch(project, "kids_variable_compare", ["kids_broadcast"]) &&
        hasMessageResponse(project, ["looks_sayforsecs", "kids_result"]),
    },
    hints: [
      "准备、翻页、检查、接力是四步；不要在循环里翻页。",
      "绿旗：数据归零 → 重复 3 次（加 1、说“准备”）→ 下一场景。",
      "场景开始时：如果 数据 > 2 广播“继续”；收到“继续”时：说“到达”→ 游戏成功。",
    ],
  },
};

const progressionOrder: TaskId[] = [
  "data_count",
  "data_show",
  "data_record",
  "data_reset",
  "data_compare",
  "data_label",
  "data_sort",
  "data_chart",
  "pattern_beat",
  "pattern_spin",
  "pattern_grow",
  "pattern_swap",
  "pattern_square",
  "pattern_tempo",
  "pattern_predict",
  "pattern_forever",
  "think_if",
  "think_else",
  "think_touch",
  "think_two",
  "think_or",
  "think_threshold",
  "think_train",
  "think_check",
  "ai_helper",
  "ai_limit",
  "ai_fair",
  "ai_quiz",
  "ai_sort",
  "ai_music",
  "ai_story",
  "ai_final",
];

export const aiTasks: CreationTask[] = progressionOrder.map((id) => {
  const task = tasks.find((item) => item.taskId === id);
  if (!task) throw new Error(`Missing course task: ${id}`);
  const rank = progressionOrder.indexOf(id) % 8;
  const base =
    task.chapter === "数据小侦探" ? 2 : task.chapter === "AI 小创客" ? 4 : 3;
  const repeatedActions: Partial<Record<TaskId, [string[], number]>> = {
    data_record: [["kids_variable_increase", "control_wait"], 3],
    data_reset: [["kids_variable_increase"], 3],
    data_label: [["kids_variable_increase"], 3],
    data_chart: [["kids_variable_increase"], 5],
    pattern_beat: [["sound_play", "control_wait"], 4],
    pattern_spin: [["kids_turn_left", "control_wait"], 3],
    pattern_grow: [["looks_changesizeby", "control_wait"], 4],
    ai_music: [["sound_play"], 4],
    ai_limit: [["kids_if", "kids_variable_set"], 2],
    ai_fair: [["kids_if_else", "kids_variable_set"], 2],
  };
  const repetition = repeatedActions[id];
  return {
    ...task,
    difficulty: Math.min(5, base + (rank >= 4 ? 1 : 0)) as NonNullable<
      CreationTask["difficulty"]
    >,
    ...(repetition
      ? {
          programGoal: {
            label: "把本关重复的动作放在同一循环内，并真正执行指定次数",
            check: (project: Project, report?: RuntimeReport | null) =>
              hasLoop(project, repetition[0]) &&
              (!report ||
                repetition[0].every((type) =>
                  hasExecutions(project, report, type, repetition[1]),
                )),
          },
        }
      : {}),
    ...upgrades[id],
  };
});

/** Frozen lessons from before the difficulty upgrade. */
export const legacyAiTasks: CreationTask[] = tasks;
