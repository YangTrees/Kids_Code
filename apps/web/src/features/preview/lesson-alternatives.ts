import type { Project } from "@kids-code/domain";
import { stagePositionToGrid } from "@kids-code/domain";
import { lessonExample, type LessonBlock } from "../tasks/lesson-examples";
import type { TaskId } from "../tasks/task-types";

/** Dev acceptance fixtures only: these are never inserted by the teaching UI. */
export function alternativeLessonProgram(taskId: TaskId, project: Project) {
  if (!import.meta.env.DEV) throw new Error("Development acceptance only");
  const workspace = lessonExample(taskId);
  const root = workspace.blocks.blocks[0]!;
  const body = root.next!.block;
  const value = (number: number) => ({
    shadow: {
      type: "math_number",
      id: "alt-num-" + crypto.randomUUID(),
      fields: { NUM: number },
    },
  });
  const motion = (type: string): LessonBlock => ({
    type,
    id: "alt-action-" + crypto.randomUUID(),
    inputs: { STEPS: value(1) },
  });
  const path = () => {
    const blocks = [
      motion("motion_movesteps"),
      motion("motion_movesteps"),
      motion("kids_move_up"),
      motion("kids_move_up"),
    ];
    blocks.forEach((block, index) => {
      if (blocks[index + 1]) block.next = { block: blocks[index + 1]! };
    });
    return blocks[0]!;
  };
  if (taskId === "speak")
    body.inputs!.MESSAGE!.block!.fields!.TEXT = "我想用自己的台词介绍这场冒险";
  if (taskId === "move") {
    const actor = project.scenes[0]!.instances.find(
      (item) => item.spriteId === project.course!.bindings.actor,
    )!;
    const start = stagePositionToGrid(
      project,
      actor.transform.x,
      actor.transform.y,
    );
    root.next = {
      block: {
        type: "motion_gotoxy",
        id: "alt-goto",
        inputs: { X: value(start.x + 1), Y: value(start.y) },
      },
    };
  }
  if (taskId === "sequence") {
    body.inputs = {
      MESSAGE: {
        shadow: {
          type: "text",
          id: "alt-text",
          fields: { TEXT: "我准备好了" },
        },
      },
      SECS: value(0.1),
    };
  }
  if (taskId === "repeat")
    body.inputs!.SUBSTACK = {
      block: {
        type: "kids_turn_left",
        id: "alt-turn",
        inputs: { DEGREES: value(90) },
      },
    };
  if (taskId === "collision") {
    const response = body.next!.block.inputs!.SUBSTACK!.block!;
    delete body.next;
    workspace.blocks.blocks.push({
      type: "kids_when_touching",
      id: "alt-enter",
      fields: { TARGET: "spr_box" },
      x: 20,
      y: 180,
      next: { block: response },
    });
  }
  if (taskId === "path_turn") root.next = { block: path() };
  if (taskId === "path_repeat") body.inputs!.SUBSTACK = { block: path() };
  if (taskId === "data_compare")
    body.next!.block.inputs!.SUBSTACK!.block!.inputs!.MESSAGE!.block!.fields!.TEXT =
      "比较之后，我知道这一组更多";
  return workspace;
}
