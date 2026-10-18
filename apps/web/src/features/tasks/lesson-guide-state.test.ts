import { describe, expect, it } from "vitest";
import type { RuntimeReport } from "@kids-code/runtime";
import { creationTasks } from "./task-catalog";
import { createTaskProject } from "./task-project";
import { lessonExample } from "./lesson-examples";
import { getLessonGuideState } from "./lesson-guide-state";

describe("observed lesson guide phases", () => {
  it("requires connected speech and an actual compatible run; skip state cannot award completion", () => {
    const task = creationTasks[0]!,
      project = createTaskProject(task),
      actor = project.course!.bindings.actor;
    expect(getLessonGuideState(project, task).step).toBe(0);
    const example = lessonExample("speak"),
      root = example.blocks.blocks[0]!,
      speech = root.next!.block;
    project.workspaceStates[actor] = {
      blocks: {
        blocks: [{ type: "event_whenflagclicked", id: root.id }, speech],
      },
    };
    expect(getLessonGuideState(project, task).step).toBe(1);
    project.workspaceStates[actor] = example;
    sessionStorage.setItem(
      "kids-code:guide-skipped:" + project.projectId,
      "yes",
    );
    expect(getLessonGuideState(project, task).step).toBe(2);
    const report: RuntimeReport = {
      status: "COMPLETED",
      projectId: project.projectId,
      taskId: "speak",
      taskVersion: "4",
      score: 0,
      result: null,
      spritePositions: {},
      touchedPairs: [],
      variables: {},
      executedBlockCounts: { [root.id]: 1, [speech.id]: 1 },
      spokenTexts: ["你好"],
    };
    expect(getLessonGuideState(project, task, report).step).toBe(3);
    expect(
      getLessonGuideState(project, task, { ...report, taskVersion: "3" }).step,
    ).toBe(2);
  });
  it("observes a real setter and correct contact target rather than treating any flag as preparation", () => {
    const task = creationTasks.find((item) => item.taskId === "data_compare")!,
      project = createTaskProject(task),
      actor = project.course!.bindings.actor;
    project.workspaceStates[actor] = {
      blocks: { blocks: [{ type: "event_whenflagclicked", id: "flag-only" }] },
    };
    expect(getLessonGuideState(project, task).step).toBe(0);
    project.workspaceStates[actor] = lessonExample("data_compare");
    expect(getLessonGuideState(project, task).step).toBe(2);
    const touch = creationTasks.find((item) => item.taskId === "collision")!,
      collision = createTaskProject(touch),
      owner = collision.course!.bindings.actor;
    collision.workspaceStates[owner] = lessonExample("collision", true);
    expect(getLessonGuideState(collision, touch).step).toBe(0);
    collision.workspaceStates[owner] = lessonExample("collision");
    expect(getLessonGuideState(collision, touch).step).toBe(2);
  });
});
