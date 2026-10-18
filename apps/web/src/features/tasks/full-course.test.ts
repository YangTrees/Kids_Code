import { afterAll, describe, expect, it, vi } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Project, RuntimeScript } from "@kids-code/domain";
import {
  RuntimeSession,
  type RuntimeClock,
  type StagePort,
} from "@kids-code/runtime";
import {
  compileBlockForRuntime,
  type RuntimeCompilableBlock,
} from "@kids-code/block-adapter";
import { creationTasks, evaluateCreationTask } from "./task-catalog";
import { createTaskProject } from "./task-project";
import {
  lessonProgram,
  lessonStimulus,
  type LessonBlock,
} from "./lesson-programs";
import { getLessonConfig } from "./lesson-config";
import {
  getDataPlayProgress,
  placeSortCard,
  selectChartBar,
  resetSortCards,
} from "./data-play";
function compilable(block: LessonBlock): RuntimeCompilableBlock {
  return {
    id: block.id,
    type: block.type,
    getFieldValue: (name) => block.fields[name],
    getInputTargetBlock: (name) =>
      block.inputs[name] ? compilable(block.inputs[name]!.block) : null,
    getNextBlock: () => (block.next ? compilable(block.next.block) : null),
  };
}
function scripts(project: Project): RuntimeScript[] {
  return Object.entries(project.workspaceStates).flatMap(
    ([ownerSpriteId, workspace]) =>
      (workspace as { blocks: { blocks: LessonBlock[] } }).blocks.blocks.map(
        (root) => {
          const blocks = [];
          let current: LessonBlock | undefined = root;
          while (current) {
            blocks.push(compileBlockForRuntime(compilable(current)));
            current = current.next?.block;
          }
          return { scriptId: "scr_" + root.id, ownerSpriteId, blocks };
        },
      ),
  );
}
const clock: RuntimeClock = {
  async wait(_duration, cancellation) {
    cancellation.throwIfCancelled();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  },
  async tween(_duration, update, cancellation) {
    cancellation.throwIfCancelled();
    update(1);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  },
};
function stage(project: Project): StagePort {
  const positions = new Map(
    project.scenes[0]!.instances.map((instance) => [
      instance.spriteId,
      { ...instance.transform },
    ]),
  );
  return {
    setSpritePosition(sprite, x, y) {
      const position = positions.get(sprite);
      if (position) {
        position.x = x;
        position.y = y;
      }
    },
    setSpriteRotation() {},
    setSpriteScale() {},
    setSpriteVisible() {},
    setSpriteZIndex() {},
    showSpeech() {},
    clearSpeech() {},
    playSound() {},
    stopAllSounds() {},
    setScore() {},
    isTouching(sprite, target) {
      const a = positions.get(sprite),
        b = positions.get(target);
      return Boolean(a && b && Math.hypot(a.x - b.x, a.y - b.y) < 25);
    },
    setSpriteClickHandler() {},
    async switchScene() {},
    reset() {},
  };
}

const records: unknown[] = [];
afterAll(async () => {
  const directory = resolve(process.cwd(), "../../artifacts/full-course");
  await mkdir(directory, { recursive: true });
  await writeFile(
    resolve(directory, "assessment.json"),
    JSON.stringify(
      {
        scope:
          "64 current lessons; actual compiler and RuntimeSession with deterministic test stage; not a Pixi or child usability claim",
        records,
      },
      null,
      2,
    ) + "\n",
  );
});
describe.each(creationTasks)("$taskId current curriculum", (task) => {
  it("has a complete teachable toolbox and reference/alternate input dependencies", () => {
    const project = createTaskProject(task),
      config = getLessonConfig(task)!;
    expect(config).toBeDefined();
    for (const variant of ["reference", "equivalent"] as const) {
      const visit = (block: LessonBlock) => {
        expect(
          config.allowedBlockTypes,
          task.taskId + ":" + block.type,
        ).toContain(block.type);
        Object.values(block.inputs).forEach((input) => visit(input.block));
        if (block.next) visit(block.next.block);
      };
      Object.values(lessonProgram(project, task.taskId, variant)).forEach(
        (workspace) => workspace.blocks.blocks.forEach(visit),
      );
    }
  });
  it.each(["reference", "equivalent", "error", "repaired"] as const)(
    "executes %s with real event stimuli",
    async (scenario) => {
      const project = createTaskProject(task);
      // These two lessons teach creating a variable; fixture performs that learner step explicitly.
      if (["variable", "random"].includes(task.taskId))
        project.variables.push({
          variableId: "var_1",
          name: "我的数据",
          initialValue: 0,
          visible: true,
        });
      project.workspaceStates = lessonProgram(
        project,
        task.taskId,
        scenario === "repaired" ? "reference" : scenario,
      );
      const input = lessonStimulus(task.taskId);
      resetSortCards(project.projectId);
      if (input.sort)
        for (let value = 1; value <= 6; value++)
          expect(
            placeSortCard(
              project.projectId,
              value,
              value > 3 ? "large" : "small",
            ),
          ).toBe(true);
      const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
      const session = new RuntimeSession(
        project,
        stage(project),
        { highlightBlock() {}, reportError() {} },
        clock,
      );
      try {
        const running = session.start(scripts(project));
        await Promise.race([
          running,
          new Promise<void>((resolve) => setTimeout(resolve, 20)),
        ]);
        for (let count = 0; count < input.coinClicks; count++)
          await session.triggerSpriteClick(project.course!.bindings.coin!);
        for (let count = 0; count < input.actorClicks; count++)
          await session.triggerSpriteClick(project.course!.bindings.actor);
        for (let count = 0; count < input.rightKeys; count++)
          await session.triggerKey("right arrow");
        if (input.chart) selectChartBar(project.projectId, 4, 47);
        if (scenario !== "error")
          for (let attempt = 0; attempt < 100; attempt++) {
            const observed = {
              ...session.report,
              taskId: task.taskId,
              taskVersion: task.contentVersion!,
            };
            if (
              evaluateCreationTask(project, task, observed, {
                progress: getDataPlayProgress(project.projectId),
                runId: 47,
              }).complete
            )
              break;
            await new Promise<void>((resolve) => setTimeout(resolve, 10));
          }
        const report = {
          ...session.report,
          taskId: task.taskId,
          taskVersion: task.contentVersion!,
        };
        const evaluation = evaluateCreationTask(project, task, report, {
          progress: getDataPlayProgress(project.projectId),
          runId: 47,
        });
        records.push({
          number: creationTasks.indexOf(task) + 1,
          taskId: task.taskId,
          scenario,
          input,
          expected: scenario !== "error",
          complete: evaluation.complete,
          missing: evaluation.rules
            .filter((rule) => !rule.complete)
            .map((rule) => rule.label),
          workspace: project.workspaceStates,
          report,
        });
        expect(
          evaluation.complete,
          JSON.stringify({
            missing: evaluation.rules
              .filter((rule) => !rule.complete)
              .map((rule) => rule.label),
            report,
          }),
        ).toBe(scenario !== "error");
      } finally {
        session.stop();
        randomSpy.mockRestore();
      }
    },
  );
});
