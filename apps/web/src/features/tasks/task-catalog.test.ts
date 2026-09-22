import { beforeEach, describe, expect, it } from "vitest";
import { createProjectForMode } from "../projects/project-factory";
import type { RuntimeReport } from "@kids-code/runtime";
import { createTaskProject } from "./task-project";
import {
  creationTasks,
  evaluateCreationTask,
  getAssignedTaskId,
  getCompletedTaskIds,
  getNextCreationTask,
  getTaskHintLevel,
  getTaskProgress,
  isTaskUnlocked,
  markTaskCompleted,
  setAssignedTaskId,
  setTaskHintLevel,
} from "./task-catalog";

describe("creation tasks", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("detects the speaking task from serialized Blockly blocks", () => {
    const project = createProjectForMode("blank", "tasktalk");
    project.workspaceStates.spr_liji = {
      blocks: {
        blocks: [
          {
            type: "event_whenflagclicked",
            id: "flag",
            next: { block: { type: "looks_sayforsecs", id: "say" } },
          },
        ],
      },
    };

    const report: RuntimeReport = {
      status: "COMPLETED",
      score: 0,
      result: null,
      spritePositions: { spr_liji: { x: 80, y: 250 } },
      touchedPairs: [],
      variables: {},
      executedBlockCounts: { flag: 1, say: 1 },
    };
    expect(
      evaluateCreationTask(
        project,
        creationTasks.find((task) => task.taskId === "speak")!,
        report,
      ).complete,
    ).toBe(true);
  });

  it("reports individual missing goals", () => {
    const project = createProjectForMode("blank", "taskmove");
    project.workspaceStates.spr_liji = {
      blocks: { blocks: [{ type: "event_whenflagclicked" }] },
    };

    const result = evaluateCreationTask(
      project,
      creationTasks.find((task) => task.taskId === "move")!,
    );

    expect(result.complete).toBe(false);
    expect(result.rules.map((rule) => rule.complete)).toEqual([
      true,
      false,
      false,
    ]);
  });

  it("does not award a task for structure without a successful run", () => {
    const project = createProjectForMode("coin-template", "taskcoin");
    const collectTask = creationTasks.find(
      (task) => task.taskId === "collect",
    )!;
    const structuralOnly = evaluateCreationTask(project, collectTask);
    expect(
      structuralOnly.rules.slice(0, 3).every((rule) => rule.complete),
    ).toBe(true);
    expect(structuralOnly.complete).toBe(false);

    const completed = evaluateCreationTask(project, collectTask, {
      status: "COMPLETED",
      score: 1,
      result: "success",
      spritePositions: {},
      touchedPairs: [],
      variables: {},
      executedBlockCounts: {
        coin_click: 1,
        coin_add_score: 1,
        coin_collect_sound: 1,
      },
    });
    expect(completed.complete).toBe(true);
  });

  it("stores assignments and completed stars locally", () => {
    setAssignedTaskId("prj_task001", "collect");
    markTaskCompleted("collect", 2);
    markTaskCompleted("collect", 3);

    expect(getAssignedTaskId("prj_task001")).toBe("collect");
    expect(getCompletedTaskIds()).toEqual(["collect"]);
    expect(getTaskProgress()).toMatchObject([{ taskId: "collect", stars: 3 }]);
  });

  it("rejects disconnected, unexecuted, and other-project task evidence", () => {
    const project = createProjectForMode("blank", "strict");
    const task = creationTasks[0]!;
    const report: RuntimeReport = {
      projectId: project.projectId,
      status: "COMPLETED",
      score: 0,
      result: null,
      spritePositions: {},
      touchedPairs: [],
      variables: {},
      executedBlockCounts: { flag: 1, say: 1 },
    };
    project.workspaceStates.spr_liji = {
      blocks: {
        blocks: [
          { type: "event_whenflagclicked", id: "flag" },
          { type: "looks_sayforsecs", id: "say" },
        ],
      },
    };
    expect(evaluateCreationTask(project, task, report).complete).toBe(false);
    project.workspaceStates.spr_liji = {
      blocks: {
        blocks: [
          {
            type: "event_whenflagclicked",
            id: "flag",
            next: { block: { type: "looks_sayforsecs", id: "say" } },
          },
        ],
      },
    };
    expect(
      evaluateCreationTask(project, task, {
        ...report,
        executedBlockCounts: { flag: 1 },
      }).complete,
    ).toBe(false);
    expect(
      evaluateCreationTask(project, task, { ...report, projectId: "prj_other" })
        .complete,
    ).toBe(false);
    expect(evaluateCreationTask(project, task, report).complete).toBe(true);
  });

  it("accepts a collision task while its event watcher is still running", () => {
    const project = createProjectForMode("treasure-template", "touch");
    project.workspaceStates = {
      spr_liji: {
        blocks: {
          blocks: [
            {
              type: "kids_when_touching",
              id: "touch",
              next: { block: { type: "kids_score_change", id: "score" } },
            },
          ],
        },
      },
    };
    const report: RuntimeReport = {
      status: "RUNNING",
      score: 1,
      result: null,
      spritePositions: {},
      touchedPairs: ["spr_liji:spr_box"],
      variables: {},
      executedBlockCounts: { touch: 1, score: 1 },
    };
    expect(
      evaluateCreationTask(
        project,
        creationTasks.find((task) => task.taskId === "collision")!,
        report,
      ).complete,
    ).toBe(true);
  });

  it("gives the scene challenge two actual scenes to switch between", () => {
    const project = createTaskProject(
      creationTasks.find((task) => task.taskId === "scene")!,
    );
    expect(project.scenes).toHaveLength(2);
    expect(project.scenes[0]!.sceneId).not.toBe(project.scenes[1]!.sceneId);
    expect(project.workspaceStates).toEqual({});
  });

  it("measures progress toward the edited target instead of a hard-coded X", () => {
    const project = createProjectForMode("treasure-template", "distance");
    project.scenes[0]!.instances[0]!.transform.x = 200;
    project.workspaceStates = {
      spr_liji: {
        blocks: {
          blocks: [
            {
              type: "event_whenflagclicked",
              id: "flag",
              next: { block: { type: "motion_movesteps", id: "move" } },
            },
          ],
        },
      },
    };
    const task = creationTasks.find((item) => item.taskId === "move")!;
    const report: RuntimeReport = {
      status: "COMPLETED",
      score: 0,
      result: null,
      spritePositions: { spr_liji: { x: 160, y: 250 } },
      touchedPairs: [],
      variables: {},
      executedBlockCounts: { flag: 1, move: 1 },
    };
    expect(evaluateCreationTask(project, task, report).complete).toBe(false);
    expect(
      evaluateCreationTask(project, task, {
        ...report,
        spritePositions: { spr_liji: { x: 240, y: 250 } },
      }).complete,
    ).toBe(true);
  });

  it("requires two real action executions for the repeat challenge", () => {
    const project = createProjectForMode("blank", "repetition");
    project.workspaceStates = {
      spr_liji: {
        blocks: {
          blocks: [
            {
              type: "event_whenflagclicked",
              id: "flag",
              next: {
                block: {
                  type: "control_forever",
                  id: "repeat",
                  inputs: {
                    SUBSTACK: {
                      block: { type: "motion_turnright", id: "turn" },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    };
    const task = creationTasks.find((item) => item.taskId === "repeat")!;
    const report: RuntimeReport = {
      status: "RUNNING",
      score: 0,
      result: null,
      spritePositions: {},
      touchedPairs: [],
      variables: {},
      executedBlockCounts: { flag: 1, repeat: 1, turn: 1 },
    };
    expect(evaluateCreationTask(project, task, report).complete).toBe(false);
    expect(
      evaluateCreationTask(project, task, {
        ...report,
        executedBlockCounts: { flag: 1, repeat: 1, turn: 2 },
      }).complete,
    ).toBe(true);
  });

  it("provides fifteen sequential tasks and unlocks the next task", () => {
    expect(creationTasks).toHaveLength(15);
    expect(new Set(creationTasks.map((task) => task.chapter)).size).toBe(4);
    expect(creationTasks.every((task) => task.blockGuide.length >= 2)).toBe(
      true,
    );
    expect(isTaskUnlocked("speak", [])).toBe(true);
    expect(isTaskUnlocked("move", [])).toBe(false);
    expect(isTaskUnlocked("move", ["speak"])).toBe(true);
    expect(getNextCreationTask("speak")?.taskId).toBe("move");
    expect(getNextCreationTask("logic")?.taskId).toBe("keyboard");
    expect(getNextCreationTask("finale")).toBeUndefined();
  });

  it("keeps task hint usage for the current editing session", () => {
    setTaskHintLevel("prj_task001", "speak", 2);
    expect(getTaskHintLevel("prj_task001", "speak")).toBe(2);
  });
});
