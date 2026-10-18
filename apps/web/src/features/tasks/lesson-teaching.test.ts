import { describe, expect, it } from "vitest";
import {
  numberParameter,
  compileSerializedWorkspace,
  validateParameter,
  filterTeachingToolbox,
} from "@kids-code/block-adapter";
import { creationTasks, getTaskProgress } from "./task-catalog";
import { getLessonConfig } from "./lesson-config";
import { lessonExample, type LessonBlock } from "./lesson-examples";
import { getComparisonDisplay } from "./comparison-display";
import {
  completionStars,
  getLearningSupport,
  recordLearningSupport,
} from "./learning-support";
import { createTaskProject } from "./task-project";
import { findVersionedTask } from "./task-versions";
import { STORY_PILOT_TASK_IDS } from "./task-release";

describe("teaching configuration and parameters", () => {
  it("compiles another sprite's target against that sprite's owner, not the currently selected actor", () => {
    const project = createTaskProject(
      creationTasks.find((task) => task.taskId === "collision")!,
    );
    const actor = project.course!.bindings.actor;
    const scripts = compileSerializedWorkspace(
      "spr_box",
      {
        blocks: {
          blocks: [
            {
              type: "kids_when_touching",
              id: "bound-touch",
              fields: { TARGET: actor },
            },
          ],
        },
      },
      {
        selectedSpriteId: actor,
        sprites: project.sprites,
        scenes: project.scenes,
        spriteAssets: [],
        sounds: [],
        variables: [],
        messages: [],
      },
    );
    expect(scripts[0]?.ownerSpriteId).toBe("spr_box");
    expect(scripts[0]?.blocks[0]).toMatchObject({
      type: "EVT_TOUCH",
      targetSpriteId: actor,
    });
  });
  it.each(STORY_PILOT_TASK_IDS)(
    "includes the reference program and its input dependencies for %s",
    (taskId) => {
      const task = creationTasks.find((item) => item.taskId === taskId)!;
      const config = getLessonConfig(task)!;
      const visit = (node: LessonBlock) => {
        expect(config.allowedBlockTypes, node.type).toContain(node.type);
        Object.values(node.inputs ?? {}).forEach((input) => {
          const child = input.block ?? input.shadow;
          if (child) visit(child);
        });
        if (node.next) visit(node.next.block);
      };
      lessonExample(taskId).blocks.blocks.forEach(visit);
      expect(
        getLessonConfig(findVersionedTask(taskId, "3", creationTasks)),
      ).toBeUndefined();
    },
  );
  it("filters only flyout choices, keeps category positions and never mutates the source", () => {
    const original = {
      kind: "categoryToolbox",
      contents: [
        {
          kind: "category",
          contents: [
            { kind: "block", type: "event_whenflagclicked" },
            { kind: "block", type: "kids_next_scene" },
          ],
        },
        { kind: "category", contents: [{ kind: "button", text: "创建变量" }] },
      ],
    };
    const limited = filterTeachingToolbox(original, ["event_whenflagclicked"]);
    expect(limited.contents[0]!.contents).toHaveLength(1);
    expect(limited.contents[1]!.contents).toEqual([]);
    expect(original.contents[0]!.contents).toHaveLength(2);
    expect(filterTeachingToolbox(original)).toEqual(original);
    expect(
      filterTeachingToolbox(original, ["kids_variable_set"]).contents[1]!
        .contents,
    ).toHaveLength(1);
  });
  it("keeps numbers in the compiler's legal units and zero-based grid bounds", () => {
    const repeat = numberParameter("control_repeat", "TIMES");
    expect(validateParameter("7", repeat)).toBeNull();
    expect(validateParameter("1", repeat)).not.toBeNull();
    expect(validateParameter("3.2", repeat)).not.toBeNull();
    expect(validateParameter("", repeat)).not.toBeNull();
    expect(validateParameter("NaN", repeat)).not.toBeNull();
    expect(
      validateParameter("0.7", numberParameter("control_wait", "DURATION")),
    ).toBeNull();
    expect(numberParameter("motion_gotoxy", "X").max).toBe(11);
    expect(numberParameter("motion_gotoxy", "Y").max).toBe(8);
    expect(
      numberParameter("motion_gotoxy", "X", { columns: 48, rows: 36 }).max,
    ).toBe(47);
  });
  it("records help separately and never rewrites past stars to infer mastery", () => {
    localStorage.clear();
    const task = creationTasks[0]!;
    localStorage.setItem(
      "kids-code:task-progress-v2",
      JSON.stringify([
        { taskId: "speak", stars: 1, completedAt: "2026-01-01" },
      ]),
    );
    recordLearningSupport("pilot", task, { usedHints: true, maxHintLevel: 3 });
    expect(getLearningSupport("pilot", task)).toEqual({
      usedHints: true,
      maxHintLevel: 3,
      completed: false,
    });
    expect(completionStars(task, 3)).toBe(3);
    expect(getTaskProgress()[0]!.stars).toBe(1);
    recordLearningSupport("pilot", task, { completed: true });
    expect(getLearningSupport("pilot", task).usedHints).toBe(true);
    expect(getLearningSupport("pilot", task).completed).toBe(true);
  });
  it("renders comparison numbers from the bound current-run data and actual compare input", () => {
    const task = creationTasks.find((item) => item.taskId === "data_compare")!;
    const project = createTaskProject(task);
    project.workspaceStates[project.course!.bindings.actor] =
      lessonExample("data_compare");
    expect(getComparisonDisplay(project)).toMatchObject({
      value: 0,
      threshold: 3,
      operator: ">",
      configured: true,
      ran: false,
    });
    const report = {
      projectId: project.projectId,
      taskVersion: "4",
      variables: { var_1: -2 },
    };
    expect(getComparisonDisplay(project, report as never)).toMatchObject({
      value: -2,
      threshold: 3,
      ran: true,
    });
    expect(
      getComparisonDisplay(project, { ...report, taskVersion: "3" } as never)
        .ran,
    ).toBe(false);
  });
});
