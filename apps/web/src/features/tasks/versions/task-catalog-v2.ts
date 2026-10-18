import type { Project } from "@kids-code/domain";
import type { RuntimeReport } from "@kids-code/runtime";
import { aiTasks } from "./task-catalog-ai-v2";
import {
  hasCorrectChartSeries,
  isSortComplete,
  type DataPlayProgress,
} from "./data-play-v2";
import { basicsTasks } from "./task-catalog-basics-v2";
import { hasLoop } from "./task-program-v2";
import type {
  CreationTask,
  TaskBlockCategory,
  TaskBlockGuide,
  TaskChapter,
  TaskId,
  TaskRule,
} from "../task-types";

export type {
  CreationTask,
  TaskBlockCategory,
  TaskBlockGuide,
  TaskChapter,
  TaskId,
  TaskRule,
};

/**
 * 完整课程体系：10 个单元共 64 关。
 * 前六个单元循序渐进地教积木编程，后四个单元参考 Hour of AI 的路径，
 * 用变量、循环和条件把“数据 → 规律 → 判断 → 创造”的人工智能思维方式拆开演示。
 */
export const creationTasks: CreationTask[] = [
  ...basicsTasks.map((task, index) => ({
    ...task,
    difficulty: (index < 3
      ? 1
      : index < 12
        ? 2
        : index < 24
          ? 3
          : index < 28
            ? 3
            : 4) as 1 | 2 | 3 | 4,
    ...(task.taskId === "path_repeat"
      ? {
          programGoal: {
            label: "把向右和向上两块动作作为一组放进循环",
            check: (project: Project) =>
              hasLoop(project, ["motion_movesteps", "kids_move_up"]),
          },
        }
      : {}),
    ...(task.taskId === "sound"
      ? {
          programGoal: {
            label: "音效和等待放在同一个循环里",
            check: (project: Project) =>
              hasLoop(project, ["sound_play", "control_wait"]),
          },
        }
      : {}),
  })),
  ...aiTasks,
];

export const getTaskDifficultyLabel = (task: CreationTask) =>
  ["入门", "练习", "组合", "进阶", "综合"][(task.difficulty ?? 1) - 1]!;

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
  data_compare: { needsElse: false, actions: ["looks_sayforsecs"] },
  data_label: { needsElse: true, actions: ["looks_sayforsecs"] },
  data_sort: { needsElse: true, actions: ["looks_sayforsecs"] },
  think_if: { needsElse: false, actions: ["looks_sayforsecs"] },
  think_else: { needsElse: true, actions: ["looks_sayforsecs"] },
  think_threshold: { needsElse: true, actions: ["looks_sayforsecs"] },
  think_train: { needsElse: true, actions: ["looks_sayforsecs"] },
  think_check: { needsElse: true, actions: ["kids_result"] },
  ai_helper: { needsElse: false, actions: ["sound_play"] },
  ai_quiz: { needsElse: true, actions: ["looks_sayforsecs"] },
  ai_limit: { needsElse: false, actions: ["looks_sayforsecs"] },
  ai_fair: { needsElse: true, actions: ["looks_sayforsecs"] },
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
    roots.some(({ root }) => {
      const visit = (block: TaskBlockNode | undefined): boolean => {
        if (!block || block.disabled) return false;
        return (
          predicate(block) ||
          Object.values(block.inputs ?? {}).some((input) =>
            visit(input.block ?? input.shadow),
          ) ||
          visit(block.next?.block)
        );
      };
      return visit(root);
    });
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
  interaction?: { progress: DataPlayProgress; runId: number },
  legacy = false,
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
  const executedAtLeast = (type: string, count: number) =>
    collectWorkspaceBlockTypes(
      project,
      Object.fromEntries(
        Object.entries(report?.executedBlockCounts ?? {}).filter(
          ([, executions]) => executions >= count,
        ),
      ),
    ).has(type);
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
  const programGoal = task.programGoal
    ? {
        label: task.programGoal.label,
        complete: task.programGoal.check(project, report),
      }
    : null;
  const rules = [
    ...task.rules.map((rule) => ({
      ...rule,
      complete: rule.anyOf.some((type) => blockTypes.has(type)),
    })),
    ...(task.taskId === "data_sort"
      ? [
          {
            id: "sort-board",
            label: "把六张数字卡分进正确的两堆",
            anyOf: [],
            complete: isSortComplete(
              interaction?.progress.sortAssignments ?? {},
            ),
          },
        ]
      : []),
    ...(task.taskId === "data_chart"
      ? [
          {
            id: "chart-reading",
            label: "读图并选出最高的第五根柱",
            anyOf: [],
            complete: Boolean(
              report?.status === "COMPLETED" &&
              hasCorrectChartSeries(report) &&
              interaction?.progress.chartRunId === interaction?.runId &&
              interaction?.progress.chartSelection === 4,
            ),
          },
        ]
      : []),
    ...(connectionGoal
      ? [{ id: "connection", ...connectionGoal, anyOf: [] }]
      : []),
    ...(programGoal ? [{ id: "program", ...programGoal, anyOf: [] }] : []),
    {
      id: "runtime",
      label: task.runtimeGoal.label,
      anyOf: [],
      complete: Boolean(
        validRun &&
        executedGoals &&
        (!connectionGoal || connectionGoal.complete) &&
        (!programGoal || programGoal.complete) &&
        task.runtimeGoal.check(report) &&
        (task.taskId !== "move" || movedTowardTarget) &&
        (task.taskId !== "sequence" || movedRight) &&
        (task.taskId !== "diagonal" || movedUpAndRight) &&
        (task.taskId !== "turn" || turnedFromStart) &&
        (task.taskId !== "repeat" || repeatedAction) &&
        (task.taskId !== "score" || repeatedScore) &&
        (legacy ||
          ((task.taskId !== "data_chart" ||
            (executedAtLeast("kids_variable_increase", 5) &&
              hasCorrectChartSeries(report))) &&
            (task.taskId !== "pattern_beat" ||
              (executedAtLeast("sound_play", 4) &&
                executedAtLeast("control_wait", 4))) &&
            (task.taskId !== "pattern_square" ||
              (executedAtLeast("kids_move_forward", 4) &&
                executedAtLeast("motion_turnright", 4))) &&
            (task.taskId !== "pattern_grow" ||
              (executedAtLeast("looks_changesizeby", 4) &&
                executedAtLeast("control_wait", 4))) &&
            (task.taskId !== "pattern_tempo" ||
              (executedAtLeast("motion_turnright", 4) &&
                executedAtLeast("sound_play", 4) &&
                executedAtLeast("control_wait", 4))) &&
            (task.taskId !== "pattern_swap" ||
              (executedAtLeast("looks_hide", 3) &&
                executedAtLeast("looks_show", 3) &&
                executedAtLeast("control_wait", 6))) &&
            (task.taskId !== "pattern_predict" ||
              executedAtLeast("kids_variable_set", 3)) &&
            (task.taskId !== "ai_limit" || executedAtLeast("kids_if", 2)) &&
            (task.taskId !== "ai_fair" ||
              executedAtLeast("kids_if_else", 2)))) &&
        (task.taskId !== "scene_story" || spokeInSecondScene) &&
        (task.taskId !== "ai_story" || spokeInSecondScene) &&
        (task.taskId !== "scene" || (report.sceneChanges ?? 0) > 0),
      ),
    },
  ];
  return { rules, complete: rules.every((rule) => rule.complete) };
}
