import {
  pathCellKey,
  pathCellPosition,
  projectSchema,
  type PathCell,
  type PathMap,
} from "@kids-code/domain";
import { describe, expect, it } from "vitest";
import { creationTasks } from "./task-catalog";
import { createTaskProject } from "./task-project";
import { getTaskSetupProblem } from "./task-contract";

function hasValidRoute(map: PathMap): boolean {
  const allowed = new Set(map.tiles.map(pathCellKey));
  const objectives = [...(map.checkpoints ?? []), ...(map.collectibles ?? [])];
  const objectiveIndex = new Map(
    objectives.map((cell, index) => [pathCellKey(cell), index]),
  );
  const allObjectives = (1 << objectives.length) - 1;
  const startKey = pathCellKey(map.start);
  const initialIndex = objectiveIndex.get(startKey);
  const queue: Array<{
    cell: PathCell;
    mask: number;
    steps: number;
    seen: Set<string>;
  }> = [
    {
      cell: map.start,
      mask: initialIndex === undefined ? 0 : 1 << initialIndex,
      steps: 0,
      seen: new Set([startKey]),
    },
  ];
  const visited = new Set<string>();
  const maxSteps = map.maxSteps ?? map.tiles.length * 3;
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const state = queue[cursor]!;
    const key = pathCellKey(state.cell);
    if (key === pathCellKey(map.goal) && state.mask === allObjectives)
      return true;
    if (state.steps >= maxSteps) continue;
    const neighbours = [
      { column: state.cell.column + 1, row: state.cell.row },
      { column: state.cell.column - 1, row: state.cell.row },
      { column: state.cell.column, row: state.cell.row + 1 },
      { column: state.cell.column, row: state.cell.row - 1 },
    ];
    for (const cell of neighbours) {
      const nextKey = pathCellKey(cell);
      if (!allowed.has(nextKey) || (map.noRevisit && state.seen.has(nextKey)))
        continue;
      const index = objectiveIndex.get(nextKey);
      const mask = index === undefined ? state.mask : state.mask | (1 << index);
      const seen = new Set(state.seen).add(nextKey);
      const signature = `${nextKey}|${mask}|${state.steps + 1}|${
        map.noRevisit ? [...seen].sort().join(",") : ""
      }`;
      if (visited.has(signature)) continue;
      visited.add(signature);
      queue.push({ cell, mask, steps: state.steps + 1, seen });
    }
  }
  return false;
}

describe("all course projects", () => {
  it.each(creationTasks)(
    "builds a valid and playable project for $taskId",
    (task) => {
      const project = createTaskProject(task);
      expect(() => projectSchema.parse(project)).not.toThrow();
      expect(project.course?.taskId).toBe(task.taskId);
      expect(project.course?.contentVersion).toBe(task.contentVersion);
      expect(getTaskSetupProblem(project)).toBeNull();
      const map = project.pathMap;
      if (!map) return;
      expect(map.tiles).toContainEqual(map.start);
      expect(map.tiles).toContainEqual(map.goal);
      const actor = project.scenes[0]?.instances.find(
        (instance) => instance.spriteId === map.actorSpriteId,
      );
      expect(actor?.transform.x).toBe(pathCellPosition(map.start).x);
      expect(actor?.transform.y).toBe(pathCellPosition(map.start).y);
      expect(hasValidRoute(map)).toBe(true);
    },
  );
});
