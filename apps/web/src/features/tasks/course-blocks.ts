import type { ToolboxCategory } from "@kids-code/block-adapter/teaching";
import type { CreationTask } from "./task-types";

/** Presentation follows actual lesson hints, never inventing a concept from a title. */
export function courseBlockCategories(
  tasks: readonly CreationTask[],
): ToolboxCategory[] {
  const categories = new Set<ToolboxCategory>();
  for (const task of tasks) {
    for (const block of task.blockGuide) {
      categories.add(
        block.category === "condition" ? "control" : block.category,
      );
    }
  }
  return [...categories];
}
