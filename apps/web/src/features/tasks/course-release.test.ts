import { describe, expect, it } from "vitest";
import { projectSchema } from "@kids-code/domain";
import {
  creationTasks,
  getAssignedCreationTask,
  evaluateCreationTask,
} from "./task-catalog";
import { createTaskProject } from "./task-project";
import { CURRENT_TASK_VERSION, findVersionedTask } from "./task-versions";
import { getTaskSetupProblem, restoreTaskSetup } from "./task-contract";
import { sameTaskAnswer } from "./task-answers";
import baseline from "../../../../../docs/baselines/course-v3.json";
import { getLessonConfig } from "./lesson-config";
import { chapterImage } from "./chapter-visuals";
import {
  referenceRoots,
  equivalentRoots,
  type LessonBlock,
} from "./lesson-programs";
describe("one current unreleased curriculum", () => {
  it("registers every reference message and sound choice before Blockly loads it", () => {
    for (const task of creationTasks) {
      const project = createTaskProject(task);
      expect(projectSchema.safeParse(project).success, task.taskId).toBe(true);
      const visit = (node: LessonBlock) => {
        if (node.type === "kids_broadcast" || node.type === "kids_when_message")
          expect(
            project.messages.map((message) => message.name),
            task.taskId,
          ).toContain(node.fields.MESSAGE);
        if (node.type === "kids_sound_menu")
          expect(
            project.assets.map((asset) => asset.assetId),
            task.taskId,
          ).toContain(node.fields.SOUND_MENU);
        Object.values(node.inputs).forEach((input) => visit(input.block));
        if (node.next) visit(node.next.block);
      };
      [...referenceRoots(task.taskId), ...equivalentRoots(task.taskId)].forEach(
        visit,
      );
    }
  });
  it("releases all 64 lessons in ten chapters without legacy lookup branches", () => {
    expect(creationTasks).toHaveLength(64);
    expect(new Set(creationTasks.map((task) => task.chapter)).size).toBe(10);
    expect(new Set(creationTasks.map((task) => task.contentVersion))).toEqual(
      new Set(["4"]),
    );
    expect(CURRENT_TASK_VERSION).toBe("4");
    for (const task of creationTasks) {
      expect(findVersionedTask(task.taskId, "4", creationTasks)).toBe(task);
      for (const version of ["1", "2", "3", "future"])
        expect(
          findVersionedTask(task.taskId, version, creationTasks),
        ).toBeUndefined();
    }
  });
  it.each(creationTasks)(
    "preserves the original learning contract for $taskId",
    (task) => {
      const row = baseline.rows.find((item) => item.taskId === task.taskId)!;
      expect(task.chapter).toBe(row.chapter);
      expect(task.projectMode).toBe(row.projectMode);
      expect(task.difficulty).toBe(row.difficulty);
      expect(
        task.rules.map((rule) => ({ id: rule.id, anyOf: rule.anyOf })),
      ).toEqual(row.rules.map((rule) => ({ id: rule.id, anyOf: rule.anyOf })));
      expect(task.runtimeGoal.label.replaceAll("团团", "栗奇")).toBe(
        row.runtimeGoal,
      );
      expect(task.programGoal?.label ?? null).toBe(row.programGoal);
      expect(getLessonConfig(task)).toBeDefined();
      expect(chapterImage(task.chapter)).toContain("/ui/story-ip/unit-");
      const project = createTaskProject(task);
      expect(getAssignedCreationTask(project)).toBe(task);
      expect(project.course?.bindings.actor).toBe("spr_story_tuantuan");
      expect(
        project.sprites.find(
          (sprite) => sprite.spriteId === project.course!.bindings.actor,
        )?.costumeAssetId,
      ).toBe("costume_story_tuantuan_idle_v1");
      expect(
        project.scenes.map((scene) =>
          scene.instances.map((instance) => instance.transform),
        ),
      ).toEqual(
        row.scenes.map((scene) =>
          scene.instances.map((instance) => instance.transform),
        ),
      );
      expect(getTaskSetupProblem(project)).toBeNull();
      expect(evaluateCreationTask(project, task).complete).toBe(false);
    },
  );
  it("makes multi-scene lessons visually distinct", () => {
    for (const task of creationTasks.filter((item) =>
      ["scene", "scene_story", "ai_story"].includes(item.taskId),
    )) {
      const project = createTaskProject(task);
      expect(project.scenes).toHaveLength(2);
      expect(project.scenes[1]!.backdropAssetId).not.toBe(
        project.scenes[0]!.backdropAssetId,
      );
    }
  });
  it("restores task geometry and removed roles without clearing a child's program", () => {
    for (const task of creationTasks) {
      const project = createTaskProject(task);
      project.workspaceStates[project.course!.bindings.actor] = {
        blocks: { blocks: [{ type: "event_whenflagclicked", id: "keep-me" }] },
      };
      const changed = structuredClone(project);
      changed.settings.movementStep = 10;
      changed.scenes[0]!.instances[0]!.transform.x += 40;
      expect(getTaskSetupProblem(changed)).not.toBeNull();
      const restored = restoreTaskSetup(changed);
      expect(getTaskSetupProblem(restored)).toBeNull();
      expect(restored.workspaceStates).toEqual(project.workspaceStates);
    }
  });
  it("keeps negative labels distinct and permits whole-label equivalents", () => {
    expect(sameTaskAnswer("未达标", "达标")).toBe(false);
    expect(sameTaskAnswer("不通过", "通过")).toBe(false);
    expect(sameTaskAnswer("已达标", "达标")).toBe(true);
    expect(sameTaskAnswer("答案是 A！", "A")).toBe(true);
  });
});
