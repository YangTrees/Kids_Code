import type { Project } from "@kids-code/domain";
import type { RuntimeReport } from "@kids-code/runtime";
import type { ProjectMode } from "../projects/project-factory";

export type TaskId =
  | "speak"
  | "move"
  | "turn"
  | "repeat"
  | "collision"
  | "collect"
  | "score"
  | "scene"
  | "variable"
  | "logic"
  | "keyboard"
  | "sound"
  | "magic"
  | "broadcast"
  | "finale";

export type TaskChapter = "基础入门" | "互动游戏" | "程序思维" | "进阶创作";
export type TaskBlockCategory =
  | "event"
  | "motion"
  | "looks"
  | "sound"
  | "control"
  | "game"
  | "variable"
  | "condition";

export interface TaskBlockGuide {
  label: string;
  category: TaskBlockCategory;
  shape?: "hat" | "stack" | "condition" | "loop";
}

export interface TaskProgress {
  taskId: TaskId;
  stars: 1 | 2 | 3;
  completedAt: string;
}

export interface TaskRule {
  id: string;
  label: string;
  anyOf: string[];
}

export interface CreationTask {
  taskId: TaskId;
  chapter: TaskChapter;
  title: string;
  description: string;
  projectMode: ProjectMode;
  blockGuide: TaskBlockGuide[];
  rules: TaskRule[];
  runtimeGoal: {
    label: string;
    check: (report: RuntimeReport) => boolean;
  };
  hints: [string, string, string];
}

export const creationTasks: CreationTask[] = [
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
      label: "运行一次转向程序",
      check: (report) => report.status === "COMPLETED",
    },
    hints: [
      "转向积木藏在蓝色的“动作”分类里。",
      "先连接点击开始，再连接一个转向积木。",
      "可以选择左转或右转，并试试不同角度。",
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
      label: "运行时真正发生一次碰撞",
      check: (report) => report.touchedPairs.length > 0,
    },
    hints: [
      "可以用“碰到角色时”，也可以用“如果碰到”。",
      "在碰撞积木后连接说话、声音或得分积木。",
      "让栗奇先移动到宝箱附近，再判断是否碰到。",
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
    title: "得到五分",
    description: "设计一个程序，让作品得分达到 5 分。",
    projectMode: "coin-template",
    blockGuide: [
      { label: "点击开始", category: "event", shape: "hat" },
      { label: "将得分设为 5", category: "game" },
    ],
    rules: [
      {
        id: "score",
        label: "使用设置或增加得分积木",
        anyOf: ["kids_score_set", "kids_score_change"],
      },
    ],
    runtimeGoal: {
      label: "运行后得分达到 5 分",
      check: (report) => report.score >= 5,
    },
    hints: [
      "绿色的“游戏”分类里有得分积木。",
      "可以一次设为 5，也可以多次增加得分。",
      "别忘了把得分积木连接在事件积木下面。",
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
    ],
    runtimeGoal: {
      label: "运行一次带条件的程序",
      check: (report) =>
        report.status === "COMPLETED" || report.result !== null,
    },
    hints: [
      "先从“控制”分类拖出“如果”。",
      "把六边形条件积木放进“如果”的空位。",
      "在“那么”里面放入说话、声音或得分积木。",
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
];

export function collectWorkspaceBlockTypes(
  project: Project,
  executed?: Record<string, number>,
): Set<string> {
  const types = new Set<string>();
  type Node = {
    type?: string;
    id?: string;
    disabled?: boolean;
    next?: { block?: Node };
    inputs?: Record<string, { block?: Node; shadow?: Node }>;
  };
  const hats = new Set([
    "event_whenflagclicked",
    "event_whenkeypressed",
    "event_whenthisspriteclicked",
    "kids_when_touching",
    "kids_while_touching",
    "kids_when_touch_end",
    "kids_when_message",
    "kids_when_scene_starts",
  ]);
  const visit = (block: Node | undefined, inputExecuted = false): void => {
    if (!block || block.disabled) return;
    const didRun =
      !executed || inputExecuted || Boolean(block.id && executed[block.id]);
    if (block.type && didRun) types.add(block.type);
    for (const [name, input] of Object.entries(block.inputs ?? {}))
      visit(
        input.block ?? input.shadow,
        didRun && !name.startsWith("SUBSTACK"),
      );
    visit(block.next?.block);
  };
  for (const workspace of Object.values(project.workspaceStates)) {
    const roots =
      (workspace as { blocks?: { blocks?: Node[] } } | null)?.blocks?.blocks ??
      [];
    for (const block of roots) if (hats.has(block.type ?? "")) visit(block);
  }
  return types;
}

export function evaluateCreationTask(
  project: Project,
  task: CreationTask,
  report?: RuntimeReport | null,
) {
  const blockTypes = collectWorkspaceBlockTypes(project);
  const ranTypes = collectWorkspaceBlockTypes(
    project,
    report?.executedBlockCounts ?? {},
  );
  const validRun =
    report &&
    (!report.projectId || report.projectId === project.projectId) &&
    report.status !== "ERROR" &&
    report.status !== "STOPPED";
  const executedGoals = task.rules.every((rule) =>
    rule.anyOf.some((type) => ranTypes.has(type)),
  );
  const scene = project.scenes.find(
    (item) => item.sceneId === project.currentSceneId,
  );
  const start = scene?.instances.find(
    (item) => item.spriteId === "spr_liji",
  )?.transform;
  const target = scene?.instances.find(
    (item) => item.spriteId === "spr_box",
  )?.transform;
  const end = report?.spritePositions.spr_liji;
  const movedTowardTarget = Boolean(
    start &&
    target &&
    end &&
    Math.hypot(end.x - target.x, end.y - target.y) <
      Math.hypot(start.x - target.x, start.y - target.y) - 1,
  );
  const repeatedTypes = collectWorkspaceBlockTypes(
    project,
    Object.fromEntries(
      Object.entries(report?.executedBlockCounts ?? {}).filter(
        ([, count]) => count >= 2,
      ),
    ),
  );
  const repeatedAction = [
    "motion_movesteps",
    "kids_turn_left",
    "motion_turnright",
  ].some((type) => repeatedTypes.has(type));
  const rules = [
    ...task.rules.map((rule) => ({
      ...rule,
      complete: rule.anyOf.some((type) => blockTypes.has(type)),
    })),
    {
      id: "runtime",
      label: task.runtimeGoal.label,
      anyOf: [],
      complete: Boolean(
        validRun &&
        executedGoals &&
        task.runtimeGoal.check(report) &&
        (task.taskId !== "move" || movedTowardTarget) &&
        (task.taskId !== "repeat" || repeatedAction) &&
        (task.taskId !== "scene" || (report.sceneChanges ?? 0) > 0),
      ),
    },
  ];
  return { rules, complete: rules.every((rule) => rule.complete) };
}

const assignmentKey = (projectId: string) => `kids-code:task:${projectId}`;
const COMPLETED_KEY = "kids-code:completed-tasks";
const PROGRESS_KEY = "kids-code:task-progress-v2";
const hintKey = (projectId: string, taskId: TaskId) =>
  `kids-code:task-hints:${projectId}:${taskId}`;

export function getAssignedTaskId(projectId: string): TaskId | undefined {
  const value = localStorage.getItem(assignmentKey(projectId));
  return creationTasks.some((task) => task.taskId === value)
    ? (value as TaskId)
    : undefined;
}

export function setAssignedTaskId(projectId: string, taskId: TaskId): void {
  localStorage.setItem(assignmentKey(projectId), taskId);
  window.dispatchEvent(new Event("kids-code:task-change"));
}

export function getTaskHintLevel(projectId: string, taskId: TaskId): number {
  const value = Number(sessionStorage.getItem(hintKey(projectId, taskId)) ?? 0);
  return Number.isFinite(value) ? Math.min(3, Math.max(0, value)) : 0;
}

export function setTaskHintLevel(
  projectId: string,
  taskId: TaskId,
  level: number,
): void {
  sessionStorage.setItem(
    hintKey(projectId, taskId),
    String(Math.min(3, Math.max(0, level))),
  );
}

export function getNextCreationTask(taskId: TaskId): CreationTask | undefined {
  const index = creationTasks.findIndex((task) => task.taskId === taskId);
  return index >= 0 ? creationTasks[index + 1] : undefined;
}

export function getCompletedTaskIds(): TaskId[] {
  const progressIds = getTaskProgress().map((item) => item.taskId);
  try {
    const values = JSON.parse(localStorage.getItem(COMPLETED_KEY) ?? "[]");
    const legacy = Array.isArray(values)
      ? values.filter((value): value is TaskId =>
          creationTasks.some((task) => task.taskId === value),
        )
      : [];
    return [...new Set([...legacy, ...progressIds])];
  } catch {
    return progressIds;
  }
}

export function getTaskProgress(): TaskProgress[] {
  try {
    const value = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is TaskProgress =>
        item &&
        typeof item === "object" &&
        creationTasks.some(
          (task) => task.taskId === (item as TaskProgress).taskId,
        ) &&
        [1, 2, 3].includes((item as TaskProgress).stars),
    );
  } catch {
    return [];
  }
}

export function isTaskUnlocked(
  taskId: TaskId,
  completedIds = getCompletedTaskIds(),
): boolean {
  const index = creationTasks.findIndex((task) => task.taskId === taskId);
  return index <= 0 || completedIds.includes(creationTasks[index - 1]!.taskId);
}

export function markTaskCompleted(taskId: TaskId, stars: 1 | 2 | 3 = 3): void {
  const completed = new Set(getCompletedTaskIds());
  completed.add(taskId);
  localStorage.setItem(COMPLETED_KEY, JSON.stringify([...completed]));
  const progress = getTaskProgress();
  const previous = progress.find((item) => item.taskId === taskId);
  const next: TaskProgress = {
    taskId,
    stars: Math.max(previous?.stars ?? 0, stars) as 1 | 2 | 3,
    completedAt: previous?.completedAt ?? new Date().toISOString(),
  };
  localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify([
      ...progress.filter((item) => item.taskId !== taskId),
      next,
    ]),
  );
  window.dispatchEvent(new Event("kids-code:task-change"));
}
