import { StageController } from "@kids-code/stage";
import {
  RuntimeSession,
  type RuntimeClock,
  type RuntimeReport,
} from "@kids-code/runtime";
import { compileSerializedWorkspace } from "@kids-code/block-adapter";
import { creationTasks, evaluateCreationTask } from "../tasks/task-catalog";
import { createTaskProject } from "../tasks/task-project";
import { lessonProgram, lessonStimulus } from "../tasks/lesson-programs";
import {
  getDataPlayProgress,
  placeSortCard,
  selectChartBar,
} from "../tasks/data-play";
import type { TaskId } from "../tasks/task-types";

export interface CourseAcceptanceRecord {
  taskId: TaskId;
  number: number;
  passed: boolean;
  missing: string[];
  report?: RuntimeReport;
  error?: string;
}
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 1));
const fastClock: RuntimeClock = {
  async wait(_ms, cancellation) {
    await pause();
    cancellation.throwIfCancelled();
  },
  async tween(_ms, update, cancellation) {
    for (let step = 1; step <= 12; step++) {
      await pause();
      cancellation.throwIfCancelled();
      update(step / 12);
    }
  },
};
/** Real Pixi geometry + headless Blockly compiler. Time accelerated; not a child usability claim. */
export async function runCurrentCurriculum(onlyTaskIds?: TaskId[]) {
  if (!import.meta.env.DEV) throw new Error("Development acceptance only");
  const records: CourseAcceptanceRecord[] = [];
  const container = document.createElement("section");
  container.style.cssText =
    "position:fixed;right:0;bottom:0;z-index:30000;background:#fdfbf7;padding:12px;border:3px solid #d6dfdf;border-radius:20px";
  const title = document.createElement("strong"),
    host = document.createElement("div");
  Object.assign(host.style, { width: "480px", height: "360px" });
  container.append(title, host);
  document.body.append(container);
  try {
    for (const [index, task] of creationTasks.entries()) {
      if (onlyTaskIds && !onlyTaskIds.includes(task.taskId)) continue;
      title.textContent = `真实课程验收 ${index + 1}/64 · ${task.title}`;
      const project = createTaskProject(task);
      if (["variable", "random"].includes(task.taskId))
        project.variables.push({
          variableId: "var_1",
          name: "我的数据",
          initialValue: 0,
          visible: true,
        });
      project.workspaceStates = lessonProgram(project, task.taskId);
      const input = lessonStimulus(task.taskId),
        stage = new StageController();
      let session: RuntimeSession | undefined;
      let running: Promise<void> | undefined;
      try {
        stage.setMuted(true);
        await stage.mount(host, project);
        const scripts = Object.entries(project.workspaceStates).flatMap(
          ([owner, workspace]) =>
            compileSerializedWorkspace(owner, workspace as object, {
              selectedSpriteId: owner,
              sprites: project.sprites,
              scenes: project.scenes,
              spriteAssets: project.assets
                .filter((asset) => asset.type === "sprite")
                .map((asset) => ({
                  assetId: asset.assetId,
                  name: asset.assetId,
                })),
              sounds: project.assets
                .filter((asset) => asset.type === "audio")
                .map((asset) => ({
                  assetId: asset.assetId,
                  name: asset.assetId,
                })),
              messages: project.messages,
              variables: project.variables.map(({ variableId, name }) => ({
                variableId,
                name,
              })),
            }),
        );
        session = new RuntimeSession(
          project,
          stage,
          { highlightBlock() {}, reportError() {} },
          fastClock,
        );
        running = session.start(scripts);
        await Promise.race([
          running,
          new Promise<void>((resolve) => setTimeout(resolve, 30)),
        ]);
        for (let count = 0; count < input.coinClicks; count++)
          await session.triggerSpriteClick(project.course!.bindings.coin!);
        for (let count = 0; count < input.actorClicks; count++)
          await session.triggerSpriteClick(project.course!.bindings.actor);
        for (let count = 0; count < input.rightKeys; count++)
          await session.triggerKey("right arrow");
        if (input.sort)
          for (let value = 1; value <= 6; value++)
            placeSortCard(
              project.projectId,
              value,
              value > 3 ? "large" : "small",
            );
        let report: RuntimeReport = {
          ...session.report,
          taskId: task.taskId,
          taskVersion: "4",
        };
        let evaluation = evaluateCreationTask(project, task, report, {
          progress: getDataPlayProgress(project.projectId),
          runId: 1,
        });
        for (
          let attempt = 0;
          attempt < 180 && !evaluation.complete && report.status !== "ERROR";
          attempt++
        ) {
          await new Promise<void>((resolve) => setTimeout(resolve, 10));
          report = { ...session.report, taskId: task.taskId, taskVersion: "4" };
          if (input.chart && report.status === "COMPLETED")
            selectChartBar(project.projectId, 4, 1);
          evaluation = evaluateCreationTask(project, task, report, {
            progress: getDataPlayProgress(project.projectId),
            runId: 1,
          });
        }
        records.push({
          taskId: task.taskId,
          number: index + 1,
          passed: evaluation.complete,
          missing: evaluation.rules
            .filter((rule) => !rule.complete)
            .map((rule) => rule.label),
          report,
        });
      } catch (error) {
        records.push({
          taskId: task.taskId,
          number: index + 1,
          passed: false,
          missing: [],
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        session?.stop();
        await running?.catch(() => undefined);
        stage.destroy();
        host.replaceChildren();
      }
    }
  } finally {
    container.remove();
  }
  return records;
}
