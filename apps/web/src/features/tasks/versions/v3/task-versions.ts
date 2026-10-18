import type { CreationTask, TaskId } from "./task-types";
import { legacyAiTasks } from "./versions/task-catalog-ai-v2";
import { creationTasks as frozenTasks } from "./versions/task-catalog-v2";

export const CURRENT_TASK_VERSION = "3";
export const PREVIOUS_TASK_VERSION = "2";
export const LEGACY_TASK_VERSION = "1";

/** Copy corrections never change the frozen version's assessment. */
export function correctTaskCopy(task: CreationTask): CreationTask {
  if (
    task.taskId !== "ai_helper" ||
    task.contentVersion === LEGACY_TASK_VERSION
  )
    return task;
  return {
    ...task,
    rules: task.rules.map((rule) =>
      rule.id === "repeat"
        ? { ...rule, label: "连续观察五次" }
        : rule.id === "if"
          ? { ...rule, label: "每次加分后立刻判断" }
          : rule,
    ),
  };
}

const previousTasks = frozenTasks.map((task) =>
  correctTaskCopy({ ...task, contentVersion: PREVIOUS_TASK_VERSION }),
);
const legacyTasks = frozenTasks.map((task): CreationTask => {
  const original = legacyAiTasks.find((item) => item.taskId === task.taskId);
  const legacy = {
    ...(original ?? task),
    contentVersion: LEGACY_TASK_VERSION,
  };
  delete legacy.programGoal;
  if (task.taskId === "sound") {
    return {
      ...legacy,
      description: "连接播放声音积木，让角色发出一个声音。",
      blockGuide: [
        { label: "点击绿旗时", category: "event", shape: "hat" },
        { label: "播放一个声音", category: "sound" },
      ],
      rules: [
        {
          id: "start",
          label: "用开始事件启动",
          anyOf: ["event_whenflagclicked", "event_whenthisspriteclicked"],
        },
        { id: "sound", label: "播放一个声音", anyOf: ["sound_play"] },
      ],
      runtimeGoal: {
        label: "运行后播放声音",
        check: (report) =>
          report.status === "COMPLETED" && Boolean(report.playedSounds?.length),
      },
      hints: [
        "声音在粉色分类里。",
        "把播放声音接在开始事件下面。",
        "选一个声音，再点击绿旗试听。",
      ],
    };
  }
  if (task.taskId === "path_repeat") {
    return {
      ...legacy,
      title: "重复走长路",
      description: "用重复积木沿着这份作品的道路抵达终点。",
      blockGuide: [
        { label: "点击绿旗时", category: "event", shape: "hat" },
        { label: "重复 4 次", category: "control", shape: "loop" },
        { label: "向上移动 1 格", category: "motion" },
      ],
      rules: task.rules.filter((rule) => rule.id !== "right"),
      hints: [
        "先数出这份地图向上的格数。",
        "把向上移动放进重复积木。",
        "按地图设置重复次数；旧作品保留自己的道路。",
      ],
    };
  }
  return legacy;
});

export function findVersionedTask(
  taskId: TaskId,
  version: string,
  currentTasks: CreationTask[],
): CreationTask | undefined {
  const catalog =
    version === CURRENT_TASK_VERSION
      ? currentTasks
      : version === PREVIOUS_TASK_VERSION
        ? previousTasks
        : version === LEGACY_TASK_VERSION
          ? legacyTasks
          : [];
  return catalog.find((task) => task.taskId === taskId);
}
