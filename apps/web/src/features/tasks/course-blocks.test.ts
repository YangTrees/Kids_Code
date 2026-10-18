import { describe, expect, it } from "vitest";
import { BLOCK_PALETTE } from "@kids-code/block-adapter/teaching";
import { courseBlockCategories } from "./course-blocks";
import { courseChapters, creationTasks } from "./task-catalog";

describe("course block presentation", () => {
  it.each(creationTasks)("uses the real block hints for $taskId", (task) => {
    const categories = courseBlockCategories([task]);
    expect(categories).toEqual([
      ...new Set(
        task.blockGuide.map((block) =>
          block.category === "condition" ? "control" : block.category,
        ),
      ),
    ]);
    expect(categories.length).toBeGreaterThan(0);
    for (const category of categories)
      expect(BLOCK_PALETTE[category]).toMatch(/^#[0-9A-F]{6}$/);
  });
  it.each(courseChapters)(
    "deduplicates the actual concepts for %s",
    (chapter) => {
      const tasks = creationTasks.filter((task) => task.chapter === chapter);
      const categories = courseBlockCategories(tasks);
      expect(new Set(categories).size).toBe(categories.length);
      for (const task of tasks)
        for (const category of courseBlockCategories([task]))
          expect(categories).toContain(category);
    },
  );
});
