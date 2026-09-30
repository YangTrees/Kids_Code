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
  isChapterFirstTask,
  isTaskUnlocked,
  markTaskCompleted,
  setAssignedTaskId,
  setTaskHintLevel,
} from "./task-catalog";
import type { TaskId } from "./task-catalog";

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

  it("provides six coding units and four AI-themed units", () => {
    expect(creationTasks).toHaveLength(64);
    expect(new Set(creationTasks.map((task) => task.chapter)).size).toBe(10);
    expect(
      [...new Set(creationTasks.map((task) => task.chapter))].map(
        (chapter) =>
          creationTasks.filter((task) => task.chapter === chapter).length,
      ),
    ).toEqual([6, 6, 6, 6, 4, 4, 8, 8, 8, 8]);
    expect(creationTasks.every((task) => task.blockGuide.length >= 2)).toBe(
      true,
    );
    expect(creationTasks.every((task) => task.rules.length >= 2)).toBe(true);
    expect(creationTasks.every((task) => task.hints.length === 3)).toBe(true);
    expect(new Set(creationTasks.map((task) => task.taskId)).size).toBe(
      creationTasks.length,
    );
    expect(isTaskUnlocked("speak", [])).toBe(true);
    expect(isTaskUnlocked("move", [])).toBe(false);
    expect(isTaskUnlocked("move", ["speak"])).toBe(true);
    expect(getNextCreationTask("speak")?.taskId).toBe("move");
    expect(getNextCreationTask("logic")?.taskId).toBe("compare_score");
    expect(getNextCreationTask("finale")?.taskId).toBe("path_straight");
    expect(isTaskUnlocked("path_straight", [])).toBe(true);
    expect(isTaskUnlocked("path_turn", [])).toBe(false);
    expect(isTaskUnlocked("path_turn", ["path_straight"])).toBe(true);
    expect(getNextCreationTask("path_repeat")?.taskId).toBe("sky_waypoint");
    expect(isTaskUnlocked("sky_waypoint", [])).toBe(true);
    expect(isTaskUnlocked("sky_collect", [])).toBe(false);
    expect(isTaskUnlocked("sky_collect", ["sky_waypoint"])).toBe(true);
    expect(getNextCreationTask("sky_master")?.taskId).toBe("data_count");
    expect(getNextCreationTask("ai_final")).toBeUndefined();
  });

  it("unlocks the first level of every unit by default", () => {
    const firstLevelOfEachUnit: TaskId[] = [
      "speak", // 基础入门
      "collision", // 互动游戏
      "scene", // 程序思维
      "keyboard", // 进阶创作
      "path_straight", // 路线挑战
      "sky_waypoint", // 云岛远征
      "data_count", // 数据小侦探
      "pattern_beat", // 规律与模式
      "think_if", // 会判断的程序
      "ai_helper", // AI 小创客
    ];
    for (const taskId of firstLevelOfEachUnit) {
      expect(isChapterFirstTask(taskId)).toBe(true);
      expect(isTaskUnlocked(taskId, [])).toBe(true);
    }
    // 非首节在无完成记录时仍保持锁定，需先完成前一关。
    expect(isTaskUnlocked("move", [])).toBe(false);
    expect(isTaskUnlocked("data_show", [])).toBe(false);
  });

  it("seeds a data variable only for the AI levels that need one", () => {
    expect(
      createTaskProject(
        creationTasks.find((task) => task.taskId === "data_record")!,
      ).variables,
    ).toEqual([
      { variableId: "var_1", name: "数据", initialValue: 0, visible: true },
    ]);
    expect(
      createTaskProject(
        creationTasks.find((task) => task.taskId === "pattern_beat")!,
      ).variables,
    ).toEqual([]);
  });

  it("gives the AI story level a second scene to switch to", () => {
    const project = createTaskProject(
      creationTasks.find((task) => task.taskId === "ai_story")!,
    );
    expect(project.scenes).toHaveLength(2);
    expect(project.scenes[0]?.sceneId).not.toBe(project.scenes[1]?.sceneId);
    expect(project.scenes[1]?.name).toBe("魔法森林");
  });

  it("requires a real condition inside the AI decision levels", () => {
    const task = creationTasks.find((item) => item.taskId === "think_if")!;
    const project = createTaskProject(task);
    const report = {
      status: "COMPLETED",
      score: 0,
      result: null,
      spritePositions: {},
      touchedPairs: [],
      variables: { var_1: 5 },
      executedBlockCounts: { flag: 1, set: 1, branch: 1, compare: 1, say: 1 },
    } as unknown as RuntimeReport;
    const buildWorkspace = (condition: unknown) => ({
      blocks: {
        blocks: [
          {
            type: "event_whenflagclicked",
            id: "flag",
            next: {
              block: {
                type: "kids_variable_set",
                id: "set",
                inputs: {
                  VALUE: {
                    shadow: { type: "math_number", fields: { NUM: "5" } },
                  },
                },
                next: {
                  block: {
                    type: "kids_if",
                    id: "branch",
                    inputs: {
                      CONDITION: condition
                        ? { block: condition }
                        : { block: null },
                      SUBSTACK: {
                        block: { type: "looks_sayforsecs", id: "say" },
                      },
                    },
                    next: { block: null },
                  },
                },
              },
            },
          },
        ],
      },
    });
    project.workspaceStates.spr_liji = buildWorkspace({
      type: "kids_variable_compare",
      id: "compare",
      inputs: {
        RIGHT: { shadow: { type: "math_number", fields: { NUM: "3" } } },
      },
    });
    expect(evaluateCreationTask(project, task, report).complete).toBe(true);

    project.workspaceStates.spr_liji = buildWorkspace(null);
    expect(evaluateCreationTask(project, task, report).complete).toBe(false);
  });

  it("only awards the data challenge when the variable really grows", () => {
    const task = creationTasks.find((item) => item.taskId === "data_record")!;
    const project = createTaskProject(task);
    project.workspaceStates.spr_liji = {
      blocks: {
        blocks: [
          {
            type: "event_whenflagclicked",
            id: "flag",
            next: {
              block: {
                type: "control_repeat",
                id: "loop",
                inputs: {
                  SUBSTACK: {
                    block: {
                      type: "kids_variable_increase",
                      id: "inc",
                      next: {
                        block: { type: "control_wait", id: "wait" },
                      },
                    },
                  },
                },
                next: { block: null },
              },
            },
          },
        ],
      },
    };
    const base = {
      status: "COMPLETED",
      score: 0,
      result: null,
      spritePositions: {},
      touchedPairs: [],
      executedBlockCounts: { flag: 1, loop: 1, inc: 3, wait: 3 },
    };
    expect(
      evaluateCreationTask(project, task, {
        ...base,
        variables: { var_1: 1 },
      } as unknown as RuntimeReport).complete,
    ).toBe(false);
    expect(
      evaluateCreationTask(project, task, {
        ...base,
        variables: { var_1: 3 },
      } as unknown as RuntimeReport).complete,
    ).toBe(true);
  });

  it("builds the dedicated sky maps with distinct objectives", () => {
    for (const taskId of [
      "sky_waypoint",
      "sky_collect",
      "sky_shortcut",
      "sky_master",
    ] as const) {
      const task = creationTasks.find((item) => item.taskId === taskId)!;
      const project = createTaskProject(task);
      expect(project.pathMap?.theme).toBe("sky");
      expect(project.scenes[0]?.backdropAssetId).toBe("bg_sky_islands_map");
      expect(project.assets).toContainEqual({
        assetId: "bg_sky_islands_map",
        type: "background",
        path: "backgrounds/sky-islands-map.png",
      });
      expect(project.pathMap?.tiles).toContainEqual(project.pathMap?.start);
      expect(project.pathMap?.tiles).toContainEqual(project.pathMap?.goal);
    }
    const finale = createTaskProject(
      creationTasks.find((item) => item.taskId === "sky_master")!,
    );
    expect(finale.pathMap?.checkpoints).toHaveLength(2);
    expect(finale.pathMap?.collectibles).toHaveLength(2);
    expect(finale.pathMap?.maxSteps).toBe(12);
    expect(finale.pathMap?.noRevisit).toBe(true);
  });

  it("does not complete a sky challenge when its map objective is missed", () => {
    const task = creationTasks.find((item) => item.taskId === "sky_shortcut")!;
    const project = createTaskProject(task);
    project.workspaceStates.spr_liji = {
      blocks: {
        blocks: [
          {
            type: "event_whenflagclicked",
            id: "flag",
            next: {
              block: {
                type: "motion_movesteps",
                id: "right",
                next: { block: { type: "kids_move_up", id: "up" } },
              },
            },
          },
        ],
      },
    };
    const report: RuntimeReport = {
      status: "COMPLETED",
      score: 0,
      result: null,
      spritePositions: { spr_liji: { x: 340, y: 180 } },
      touchedPairs: [],
      variables: {},
      executedBlockCounts: { flag: 1, right: 1, up: 1 },
      pathReachedGoal: true,
      pathViolation: false,
      pathObjectivesMet: false,
    };
    expect(evaluateCreationTask(project, task, report).complete).toBe(false);
    expect(
      evaluateCreationTask(project, task, {
        ...report,
        pathObjectivesMet: true,
      }).complete,
    ).toBe(true);
  });

  it("creates fixed-path maps and rejects unsafe routes", () => {
    const task = creationTasks.find((item) => item.taskId === "path_turn")!;
    const project = createTaskProject(task);
    expect(project.pathMap?.tiles).toHaveLength(5);
    expect(project.settings.movementStep).toBe(40);
    expect(project.scenes[0]?.instances.map((item) => item.spriteId)).toEqual([
      "spr_liji",
    ]);
    project.workspaceStates.spr_liji = {
      blocks: {
        blocks: [
          {
            type: "event_whenflagclicked",
            id: "flag",
            next: {
              block: {
                type: "motion_movesteps",
                id: "right",
                next: { block: { type: "kids_move_up", id: "up" } },
              },
            },
          },
        ],
      },
    };
    const report: RuntimeReport = {
      status: "COMPLETED",
      score: 0,
      result: null,
      spritePositions: { spr_liji: { x: 180, y: 180 } },
      touchedPairs: [],
      variables: {},
      executedBlockCounts: { flag: 1, right: 1, up: 1 },
      pathReachedGoal: true,
      pathViolation: true,
    };
    expect(evaluateCreationTask(project, task, report).complete).toBe(false);
    expect(
      evaluateCreationTask(project, task, {
        ...report,
        pathViolation: false,
      }).complete,
    ).toBe(true);
  });

  it("keeps task hint usage for the current editing session", () => {
    setTaskHintLevel("prj_task001", "speak", 2);
    expect(getTaskHintLevel("prj_task001", "speak")).toBe(2);
  });

  it("only awards the score challenge when one score block executes three times", () => {
    const project = createProjectForMode("coin-template", "scoreloop");
    project.workspaceStates = {
      spr_coin: {
        blocks: {
          blocks: [
            {
              type: "event_whenthisspriteclicked",
              id: "click",
              next: {
                block: {
                  type: "control_repeat",
                  id: "repeat",
                  inputs: {
                    SUBSTACK: {
                      block: { type: "kids_score_change", id: "score" },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    };
    const task = creationTasks.find((item) => item.taskId === "score")!;
    const report: RuntimeReport = {
      status: "RUNNING",
      score: 3,
      result: null,
      spritePositions: {},
      touchedPairs: [],
      variables: {},
      executedBlockCounts: { click: 1, repeat: 1, score: 1 },
    };
    expect(evaluateCreationTask(project, task, report).complete).toBe(false);
    expect(
      evaluateCreationTask(project, task, {
        ...report,
        executedBlockCounts: { click: 1, repeat: 1, score: 3 },
      }).complete,
    ).toBe(true);
  });

  it("requires the speaking and movement blocks in the taught order", () => {
    const project = createProjectForMode("blank", "sequenceorder");
    const task = creationTasks.find((item) => item.taskId === "sequence")!;
    project.workspaceStates.spr_liji = {
      blocks: {
        blocks: [
          {
            type: "event_whenflagclicked",
            id: "flag",
            next: {
              block: {
                type: "motion_movesteps",
                id: "move",
                next: { block: { type: "looks_sayforsecs", id: "say" } },
              },
            },
          },
        ],
      },
    };
    const report: RuntimeReport = {
      status: "COMPLETED",
      score: 0,
      result: null,
      spritePositions: { spr_liji: { x: 140, y: 300 } },
      touchedPairs: [],
      variables: {},
      executedBlockCounts: { flag: 1, move: 1, say: 1 },
    };
    expect(evaluateCreationTask(project, task, report).complete).toBe(false);
    project.workspaceStates.spr_liji = {
      blocks: {
        blocks: [
          {
            type: "event_whenflagclicked",
            id: "flag",
            next: {
              block: {
                type: "looks_sayforsecs",
                id: "say",
                next: { block: { type: "motion_movesteps", id: "move" } },
              },
            },
          },
        ],
      },
    };
    expect(evaluateCreationTask(project, task, report).complete).toBe(true);
  });

  it("requires speech to execute in the second scene for the story task", () => {
    const task = creationTasks.find((item) => item.taskId === "scene_story")!;
    const project = createTaskProject(task);
    project.workspaceStates.spr_liji = {
      blocks: {
        blocks: [
          {
            type: "event_whenflagclicked",
            id: "flag",
            next: { block: { type: "kids_next_scene", id: "switch" } },
          },
          {
            type: "kids_when_scene_starts",
            id: "scene_start",
            next: { block: { type: "looks_sayforsecs", id: "say" } },
          },
        ],
      },
    };
    const report: RuntimeReport = {
      status: "COMPLETED",
      score: 0,
      result: null,
      spritePositions: {},
      touchedPairs: [],
      variables: {},
      sceneId: project.scenes[1]!.sceneId,
      sceneChanges: 1,
      executedBlockCounts: { flag: 1, switch: 1, scene_start: 1, say: 1 },
      executedBlockScenes: {
        say: [project.scenes[0]!.sceneId],
      },
    };
    expect(evaluateCreationTask(project, task, report).complete).toBe(false);
    report.executedBlockScenes = { say: [project.scenes[1]!.sceneId] };
    expect(evaluateCreationTask(project, task, report).complete).toBe(true);
  });

  it("requires a visible turn and collision with the target chest", () => {
    const turnProject = createProjectForMode("blank", "realturn");
    turnProject.workspaceStates.spr_liji = {
      blocks: {
        blocks: [
          {
            type: "event_whenflagclicked",
            id: "flag",
            next: { block: { type: "motion_turnright", id: "turn" } },
          },
        ],
      },
    };
    const turnTask = creationTasks.find((item) => item.taskId === "turn")!;
    const turnReport: RuntimeReport = {
      status: "COMPLETED",
      score: 0,
      result: null,
      spritePositions: {},
      spriteRotations: { spr_liji: 0 },
      touchedPairs: [],
      variables: {},
      executedBlockCounts: { flag: 1, turn: 1 },
    };
    expect(
      evaluateCreationTask(turnProject, turnTask, turnReport).complete,
    ).toBe(false);
    expect(
      evaluateCreationTask(turnProject, turnTask, {
        ...turnReport,
        spriteRotations: { spr_liji: 90 },
      }).complete,
    ).toBe(true);

    const collisionProject = createProjectForMode(
      "treasure-template",
      "target",
    );
    collisionProject.workspaceStates = {
      spr_liji: {
        blocks: {
          blocks: [
            {
              type: "kids_when_touching",
              id: "touch",
              next: { block: { type: "sound_play", id: "sound" } },
            },
          ],
        },
      },
    };
    const collisionTask = creationTasks.find(
      (item) => item.taskId === "collision",
    )!;
    const collisionReport: RuntimeReport = {
      status: "RUNNING",
      score: 0,
      result: null,
      spritePositions: {},
      touchedPairs: ["spr_liji:spr_coin"],
      variables: {},
      executedBlockCounts: { touch: 1, sound: 1 },
    };
    expect(
      evaluateCreationTask(collisionProject, collisionTask, collisionReport)
        .complete,
    ).toBe(false);
    expect(
      evaluateCreationTask(collisionProject, collisionTask, {
        ...collisionReport,
        touchedPairs: ["spr_liji:spr_box"],
      }).complete,
    ).toBe(true);
  });
});
