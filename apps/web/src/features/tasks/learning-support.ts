import type { CreationTask } from "./task-types";
export interface LearningSupport {
  usedHints: boolean;
  maxHintLevel: number;
  completed: boolean;
}
const key = (projectId: string, task: CreationTask) =>
  `kids-code:learning-support:${projectId}:${task.taskId}:${task.contentVersion}`;
export function getLearningSupport(
  projectId: string,
  task: CreationTask,
): LearningSupport {
  try {
    const value = JSON.parse(
      localStorage.getItem(key(projectId, task)) ?? "{}",
    );
    return {
      usedHints: value.usedHints === true,
      maxHintLevel: Math.min(3, Math.max(0, Number(value.maxHintLevel) || 0)),
      completed: value.completed === true,
    };
  } catch {
    return { usedHints: false, maxHintLevel: 0, completed: false };
  }
}
export function recordLearningSupport(
  projectId: string,
  task: CreationTask,
  update: Partial<LearningSupport>,
) {
  const previous = getLearningSupport(projectId, task);
  localStorage.setItem(
    key(projectId, task),
    JSON.stringify({
      usedHints: previous.usedHints || Boolean(update.usedHints),
      maxHintLevel: Math.max(previous.maxHintLevel, update.maxHintLevel ?? 0),
      completed: previous.completed || Boolean(update.completed),
    }),
  );
}
export const completionStars = (
  task: CreationTask,
  hintLevel: number,
): 1 | 2 | 3 =>
  task.visualSetId ? 3 : (Math.max(1, 3 - hintLevel) as 1 | 2 | 3);
