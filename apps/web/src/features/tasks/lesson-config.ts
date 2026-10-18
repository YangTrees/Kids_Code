import type { CreationTask, TaskId } from "./task-types";
import type { ToolboxCategory } from "@kids-code/block-adapter";
import { STORY_TASK_VERSION } from "./task-release";
import {
  referenceRoots,
  equivalentRoots,
  lessonStimulus,
} from "./lesson-programs";

export interface LessonConfig {
  allowedBlockTypes: readonly string[];
  categories: readonly ToolboxCategory[];
  editableScopes: readonly ["program", "parameters"];
  guideSteps: readonly string[];
  mentorLines: readonly [string, string];
}
const start = ["event_whenflagclicked"];
const say = ["looks_sayforsecs"];
const move = [
  "motion_movesteps",
  "kids_move_left",
  "kids_move_up",
  "kids_move_down",
  "motion_gotoxy",
];
const dependencies = [
  "math_number",
  "text",
  "kids_step_picker",
  "kids_angle_picker",
  "kids_duration_picker",
  "kids_repeat_picker",
  "kids_size_picker",
];
const config = (
  blocks: string[],
  categories: ToolboxCategory[],
  question: string,
  observation: string,
  steps: string[],
): LessonConfig => ({
  allowedBlockTypes: [...new Set([...blocks, ...dependencies])],
  categories,
  editableScopes: ["program", "parameters"],
  guideSteps: steps,
  mentorLines: [question, observation],
});
/** Explicit teaching choices checked against each real solution, not inferred from guide prose. */
const lessons: Partial<Record<TaskId, LessonConfig>> = {
  speak: config(
    [...start, ...say],
    ["event", "looks"],
    "我想介绍自己，你想让我说什么？",
    "先连接绿旗和说话，再运行，听完你的台词。",
    ["放入绿旗开始事件", "把说话接在绿旗下面", "运行并听完团团说话"],
  ),
  move: config(
    [...start, ...move],
    ["event", "motion"],
    "从我到宝箱有几格？先数一数。",
    "比较起点和终点；向右、向左按屏幕方向移动。",
    ["放入绿旗", "连接移动并选择格数", "运行，观察离宝箱是否更近"],
  ),
  sequence: config(
    [...start, ...say, ...move],
    ["event", "looks", "motion"],
    "出发前，我想先说一句话。",
    "同样的积木，连接先后不同，执行顺序也不同。",
    ["放入绿旗", "先说话，再向右移动", "运行验证先后顺序"],
  ),
  repeat: config(
    [
      ...start,
      ...say,
      ...move,
      "control_repeat",
      "control_forever",
      "motion_turnright",
      "kids_turn_left",
      "control_wait",
    ],
    ["event", "motion", "looks", "control"],
    "同一个动作能不能只搭一次，却做两次？",
    "次数在上面，重复做的动作放进循环肚子里。",
    ["放入绿旗", "循环内放动作", "运行观察至少两次动作"],
  ),
  collision: config(
    [
      ...start,
      ...move,
      ...say,
      "kids_when_touching",
      "kids_while_touching",
      "kids_when_touch_end",
      "kids_if_touching",
      "kids_touching_condition",
      "kids_if",
      "control_forever",
      "control_wait",
      "sound_play",
      "kids_sound_menu",
      "kids_score_change",
    ],
    ["event", "motion", "looks", "control", "sound", "game"],
    "碰到宝箱的那一刻，应该发生什么？",
    "“碰到时”只在进入接触时触发；离开再回来才会再次触发。",
    ["选择宝箱作为碰撞对象", "在碰撞后连接效果", "让团团接近宝箱并观察"],
  ),
  path_turn: config(
    [
      ...start,
      ...move,
      "motion_turnright",
      "kids_turn_left",
      "kids_move_forward",
      "kids_go_start",
    ],
    ["event", "motion"],
    "道路在什么位置拐弯？",
    "转向只改朝向；向前按朝向走，向右和向上按屏幕方向走。",
    ["放入绿旗，观察道路拐点", "连接两个方向的移动", "运行并保持在道路上"],
  ),
  path_repeat: config(
    [...start, ...move, "control_repeat", "control_wait", "kids_go_start"],
    ["event", "motion", "control"],
    "哪一段路重复出现了两次？",
    "把向右和向上作为一组；循环会重做整组动作。",
    ["放入绿旗，寻找重复路段", "循环里连接向右和向上", "运行抵达终点"],
  ),
  data_compare: config(
    [
      ...start,
      ...say,
      "kids_variable_set",
      "kids_variable_value",
      "kids_variable_compare",
      "kids_variable_show",
      "kids_if",
    ],
    ["event", "looks", "control", "variable", "operator"],
    "5 和 3，哪个更多？程序会怎样回答？",
    "柱子与数字来自真实数据；把比较块放进如果的菱形空位。",
    ["设置数据", "把比较放入如果", "成立时说出比较结果"],
  ),
};
const expandedLessons = new Map<TaskId, LessonConfig>();
const categoryFor = (type: string): ToolboxCategory | undefined => {
  if (
    [
      "kids_variable_compare",
      "kids_score_compare",
      "kids_logic_and",
      "kids_logic_or",
      "kids_logic_not",
      "kids_random_number",
    ].includes(type)
  )
    return "operator";
  if (type.startsWith("kids_variable_")) return "variable";
  if (
    type.startsWith("event_") ||
    type.startsWith("kids_when") ||
    type === "kids_while_touching" ||
    type === "kids_broadcast"
  )
    return "event";
  if (
    type.startsWith("motion_") ||
    [
      "kids_move_left",
      "kids_move_right",
      "kids_move_up",
      "kids_move_down",
      "kids_move_forward",
      "kids_go_start",
      "kids_turn_left",
    ].includes(type)
  )
    return "motion";
  if (type.startsWith("looks_") || type === "kids_switch_costume")
    return "looks";
  if (type.startsWith("sound_") || type === "kids_sound_menu") return "sound";
  if (
    type.startsWith("control_") ||
    [
      "kids_if",
      "kids_if_else",
      "kids_if_touching",
      "kids_touching_condition",
      "kids_stop",
    ].includes(type)
  )
    return "control";
  if (
    type.startsWith("kids_score") ||
    ["kids_next_scene", "kids_switch_scene", "kids_result"].includes(type)
  )
    return "game";
  return undefined;
};
function expandedLesson(task: CreationTask): LessonConfig {
  const cached = expandedLessons.get(task.taskId);
  if (cached) return cached;
  const types = new Set(task.rules.flatMap((rule) => rule.anyOf));
  // Input dependencies come from the audited real program, not guide prose.
  const visit = (node: ReturnType<typeof referenceRoots>[number]) => {
    types.add(node.type);
    Object.values(node.inputs).forEach((input) => visit(input.block));
    if (node.next) visit(node.next.block);
  };
  referenceRoots(task.taskId).forEach(visit);
  equivalentRoots(task.taskId).forEach(visit);
  if (
    [...types].some(
      (type) => type === "motion_movesteps" || type.startsWith("kids_move_"),
    )
  )
    move.forEach((type) => types.add(type));
  const order: ToolboxCategory[] = [
    "event",
    "motion",
    "looks",
    "sound",
    "control",
    "game",
    "variable",
    "operator",
  ];
  const categories = new Set(
    [...types]
      .map(categoryFor)
      .filter((item): item is ToolboxCategory => Boolean(item)),
  );
  const stimulus = lessonStimulus(task.taskId);
  const runHint = stimulus.sort
    ? "先完成分类卡片，再运行程序并点击编程角色"
    : stimulus.chart
      ? "运行五次观察，再选最高的柱子"
      : stimulus.coinClicks
        ? `运行后点击金币 ${stimulus.coinClicks} 次`
        : stimulus.actorClicks
          ? "运行后点击编程角色"
          : stimulus.rightKeys
            ? `运行后按右方向键 ${stimulus.rightKeys} 次`
            : "运行并观察本关目标";
  const value = config(
    [...types],
    order.filter((category) => categories.has(category)),
    task.hints[0],
    task.hints[1],
    [
      task.taskId === "data_show"
        ? "先选择团团，连接绿旗并初始化、隐藏变量"
        : stimulus.coinClicks
          ? "选择金币，连接本关开始事件"
          : "连接本关需要的开始事件",
      task.programGoal?.label ??
        task.rules
          .filter((rule) => !["start", "click", "keyboard"].includes(rule.id))
          .map((rule) => rule.label)
          .slice(0, 2)
          .join("；"),
      runHint,
    ],
  );
  expandedLessons.set(task.taskId, value);
  return value;
}
export const getLessonConfig = (
  task?: CreationTask,
): LessonConfig | undefined =>
  task?.contentVersion === STORY_TASK_VERSION
    ? (lessons[task.taskId] ?? expandedLesson(task))
    : undefined;
