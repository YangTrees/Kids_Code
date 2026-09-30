import type { Project } from "@kids-code/domain";
import type { RuntimeReport } from "@kids-code/runtime";
import { aiTasks } from "./task-catalog-ai";
import { basicsTasks } from "./task-catalog-basics";
import type {
  CreationTask,
  TaskBlockCategory,
  TaskBlockGuide,
  TaskChapter,
  TaskId,
  TaskProgress,
  TaskRule,
} from "./task-types";

export type {
  CreationTask,
  TaskBlockCategory,
  TaskBlockGuide,
  TaskChapter,
  TaskId,
  TaskProgress,
  TaskRule,
};

/**
 * 完整课程体系：10 个单元共 64 关。
 * 前六个单元循序渐进地教积木编程，后四个单元参考 Hour of AI 的路径，
 * 用变量、循环和条件把“数据 → 规律 → 判断 → 创造”的人工智能思维方式拆开演示。
 */
export const creationTasks: CreationTask[] = [...basicsTasks, ...aiTasks];

interface TaskBlockNode {
  type?: string;
  disabled?: boolean;
  next?: { block?: TaskBlockNode };
  inputs?: Record<string, { block?: TaskBlockNode; shadow?: TaskBlockNode }>;
}

const taskInput = (block: TaskBlockNode, name: string) => {
  const input = block.inputs?.[name];
  return input?.block ?? input?.shadow;
};

const stackHas = (
  start: TaskBlockNode | undefined,
  predicate: (block: TaskBlockNode) => boolean,
): boolean => {
  let block = start;
  while (block) {
    if (!block.disabled && predicate(block)) return true;
    block = block.next?.block;
  }
  return false;
};

/**
 * 后四个单元的“如果”类关卡：要求条件真的放进菱形空位，
 * 并且“那么”（有时还有“否则”）里真的有动作，而不是只把积木堆在工作区里。
 */
const conditionTaskActions: Partial<
  Record<TaskId, { needsElse: boolean; actions: string[] }>
> = {
  think_if: { needsElse: false, actions: ["looks_sayforsecs"] },
  think_else: { needsElse: true, actions: ["looks_sayforsecs"] },
  think_threshold: { needsElse: true, actions: ["looks_sayforsecs"] },
  think_train: { needsElse: true, actions: ["looks_sayforsecs"] },
  think_check: { needsElse: true, actions: ["kids_result"] },
  ai_helper: { needsElse: false, actions: ["sound_play"] },
  ai_quiz: { needsElse: true, actions: ["looks_sayforsecs"] },
  ai_limit: { needsElse: false, actions: ["looks_sayforsecs"] },
  ai_fair: { needsElse: true, actions: ["looks_sayforsecs"] },
  ai_final: { needsElse: true, actions: ["kids_result", "sound_play"] },
  pattern_forever: { needsElse: false, actions: ["kids_stop"] },
};

function taskConnectionGoal(
  project: Project,
  taskId: TaskId,
): { label: string; complete: boolean } | null {
  const roots = Object.entries(project.workspaceStates).flatMap(
    ([spriteId, workspace]) =>
      (
        (workspace as { blocks?: { blocks?: TaskBlockNode[] } } | null)?.blocks
          ?.blocks ?? []
      ).map((root) => ({ spriteId, root })),
  );
  const anyStack = (predicate: (block: TaskBlockNode) => boolean) =>
    roots.some(({ root }) => stackHas(root, predicate));
  if (taskId === "sequence")
    return {
      label: "把说话接在开始下面，再把移动接在说话下面",
      complete: roots.some(
        ({ root }) =>
          root.type === "event_whenflagclicked" &&
          root.next?.block?.type === "looks_sayforsecs" &&
          root.next.block.next?.block?.type === "motion_movesteps",
      ),
    };
  if (taskId === "score")
    return {
      label: "把加分积木放进金币点击事件下的重复积木里",
      complete: roots.some(
        ({ spriteId, root }) =>
          spriteId === "spr_coin" &&
          root.type === "event_whenthisspriteclicked" &&
          stackHas(
            root.next?.block,
            (block) =>
              block.type === "control_repeat" &&
              stackHas(
                taskInput(block, "SUBSTACK"),
                (child) => child.type === "kids_score_change",
              ),
          ),
      ),
    };
  if (
    taskId === "logic" ||
    taskId === "compare_score" ||
    taskId === "logic_or"
  ) {
    const conditionType =
      taskId === "compare_score"
        ? "kids_score_compare"
        : taskId === "logic_or"
          ? "kids_logic_or"
          : null;
    return {
      label: "把条件放进“如果”，把动作放进“那么”",
      complete: anyStack((block) => {
        if (block.type !== "kids_if" && block.type !== "kids_if_else")
          return false;
        const condition = taskInput(block, "CONDITION");
        if (!condition || (conditionType && condition.type !== conditionType))
          return false;
        if (
          taskId === "logic_or" &&
          (!taskInput(condition, "LEFT") || !taskInput(condition, "RIGHT"))
        )
          return false;
        return stackHas(
          taskInput(block, "SUBSTACK"),
          (child) =>
            child.type === "looks_sayforsecs" ||
            (taskId === "logic" &&
              (child.type === "sound_play" ||
                child.type === "kids_score_change")),
        );
      }),
    };
  }
  if (taskId === "think_two" || taskId === "think_or")
    return {
      label:
        taskId === "think_two"
          ? "把两个条件放进“并且”，再整体塞进“如果”"
          : "把两个条件放进“或者”，再整体塞进“如果”",
      complete: anyStack((block) => {
        if (block.type !== "kids_if" && block.type !== "kids_if_else")
          return false;
        const condition = taskInput(block, "CONDITION");
        const expected =
          taskId === "think_two" ? "kids_logic_and" : "kids_logic_or";
        if (!condition || condition.type !== expected) return false;
        if (!taskInput(condition, "LEFT") || !taskInput(condition, "RIGHT"))
          return false;
        return stackHas(
          taskInput(block, "SUBSTACK"),
          (child) => child.type === "looks_sayforsecs",
        );
      }),
    };
  if (conditionTaskActions[taskId])
    return {
      label: conditionTaskActions[taskId]!.needsElse
        ? "把条件放进“如果”，两种结果都要有动作"
        : "把条件放进“如果”，把动作放进“那么”",
      complete: anyStack((block) => {
        const isIf = block.type === "kids_if";
        const isIfElse = block.type === "kids_if_else";
        if (!isIf && !isIfElse) return false;
        const detail = conditionTaskActions[taskId]!;
        if (detail.needsElse && !isIfElse) return false;
        if (!taskInput(block, "CONDITION")) return false;
        const hasAction = (branch: TaskBlockNode | undefined) =>
          stackHas(branch, (child) =>
            detail.actions.includes(child.type ?? ""),
          );
        if (!hasAction(taskInput(block, "SUBSTACK"))) return false;
        return detail.needsElse
          ? hasAction(taskInput(block, "SUBSTACK2"))
          : true;
      }),
    };
  if (taskId === "random")
    return {
      label: "把随机数放进设置变量的数字空位",
      complete: anyStack(
        (block) =>
          block.type === "kids_variable_set" &&
          taskInput(block, "VALUE")?.type === "kids_random_number",
      ),
    };
  if (taskId.startsWith("path_") || taskId.startsWith("sky_"))
    return {
      label:
        taskId === "path_repeat" || taskId === "sky_master"
          ? "把移动积木放进开始事件下的重复积木里"
          : "把移动积木依次接在点击开始事件下面",
      complete: roots.some(({ spriteId, root }) => {
        if (spriteId !== "spr_liji" || root.type !== "event_whenflagclicked")
          return false;
        if (taskId === "path_repeat" || taskId === "sky_master")
          return stackHas(
            root.next?.block,
            (block) =>
              block.type === "control_repeat" &&
              stackHas(taskInput(block, "SUBSTACK"), (child) =>
                taskId === "path_repeat"
                  ? child.type === "kids_move_up"
                  : child.type === "motion_movesteps" ||
                    child.type === "kids_move_up",
              ),
          );
        return stackHas(
          root.next?.block,
          (block) =>
            block.type === "motion_movesteps" ||
            block.type === "kids_move_up" ||
            block.type === "kids_move_down",
        );
      }),
    };
  return null;
}

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
  const endRotation = report?.spriteRotations?.spr_liji;
  const turnedFromStart =
    start && endRotation !== undefined
      ? Math.abs((endRotation - start.rotation) % 360) > 1
      : false;
  const movedTowardTarget = Boolean(
    start &&
    target &&
    end &&
    Math.hypot(end.x - target.x, end.y - target.y) <
      Math.hypot(start.x - target.x, start.y - target.y) - 1,
  );
  const movedRight = Boolean(start && end && end.x - start.x > 20);
  const movedUpAndRight = Boolean(
    start && end && end.x - start.x > 20 && start.y - end.y > 20,
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
  const repeatedScore = collectWorkspaceBlockTypes(
    project,
    Object.fromEntries(
      Object.entries(report?.executedBlockCounts ?? {}).filter(
        ([, count]) => count >= 3,
      ),
    ),
  ).has("kids_score_change");
  const secondSceneId = project.scenes[1]?.sceneId;
  const spokeInSecondScene = Boolean(
    secondSceneId &&
    Object.values(project.workspaceStates).some((workspace) => {
      const roots =
        (
          workspace as {
            blocks?: { blocks?: (TaskBlockNode & { id?: string })[] };
          } | null
        )?.blocks?.blocks ?? [];
      const visit = (
        block: (TaskBlockNode & { id?: string }) | undefined,
      ): boolean => {
        if (!block || block.disabled) return false;
        if (
          block.type === "looks_sayforsecs" &&
          block.id &&
          report?.executedBlockScenes?.[block.id]?.includes(secondSceneId)
        )
          return true;
        return (
          Object.values(block.inputs ?? {}).some((input) =>
            visit(input.block ?? input.shadow),
          ) || visit(block.next?.block)
        );
      };
      return roots.some(visit);
    }),
  );
  const connectionGoal = taskConnectionGoal(project, task.taskId);
  const rules = [
    ...task.rules.map((rule) => ({
      ...rule,
      complete: rule.anyOf.some((type) => blockTypes.has(type)),
    })),
    ...(connectionGoal
      ? [{ id: "connection", ...connectionGoal, anyOf: [] }]
      : []),
    {
      id: "runtime",
      label: task.runtimeGoal.label,
      anyOf: [],
      complete: Boolean(
        validRun &&
        executedGoals &&
        (!connectionGoal || connectionGoal.complete) &&
        task.runtimeGoal.check(report) &&
        (task.taskId !== "move" || movedTowardTarget) &&
        (task.taskId !== "sequence" || movedRight) &&
        (task.taskId !== "diagonal" || movedUpAndRight) &&
        (task.taskId !== "turn" || turnedFromStart) &&
        (task.taskId !== "repeat" || repeatedAction) &&
        (task.taskId !== "score" || repeatedScore) &&
        (task.taskId !== "scene_story" || spokeInSecondScene) &&
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

/**
 * 每个单元（章节）的第一节默认开放：孩子无需先完成前面的单元，就能直接体验。
 * 集合从课程顺序自动推导——遍历课程，每个章节第一次出现的关卡即为该单元入口。
 */
const chapterFirstTaskIds: TaskId[] = (() => {
  const seenChapters = new Set<TaskChapter>();
  const firsts: TaskId[] = [];
  for (const task of creationTasks) {
    if (!seenChapters.has(task.chapter)) {
      seenChapters.add(task.chapter);
      firsts.push(task.taskId);
    }
  }
  return firsts;
})();

export function isChapterFirstTask(taskId: TaskId): boolean {
  return chapterFirstTaskIds.includes(taskId);
}

export function isTaskUnlocked(
  taskId: TaskId,
  completedIds = getCompletedTaskIds(),
): boolean {
  // 每个单元的第一节默认开放，孩子可以直接体验，无需先完成前面的单元。
  if (isChapterFirstTask(taskId)) return true;
  const index = creationTasks.findIndex((task) => task.taskId === taskId);
  return (
    index <= 0 ||
    completedIds.includes(taskId) ||
    completedIds.includes(creationTasks[index - 1]!.taskId)
  );
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
