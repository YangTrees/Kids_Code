import { describe, expect, it, vi } from "vitest";
import type { Project, RuntimeScript } from "@kids-code/domain";
import {
  RuntimeSession,
  type StagePort,
  type RuntimeClock,
} from "@kids-code/runtime";
import {
  compileBlockForRuntime,
  type RuntimeCompilableBlock,
} from "../../../../../packages/block-adapter/src/compiler";
import {
  creationTasks,
  evaluateCreationTask,
  getNextCreationTask,
} from "./task-catalog";
import { createTaskProject } from "./task-project";
import type { TaskId } from "./task-types";
import { findVersionedTask } from "./task-versions";

interface Node {
  id: string;
  type: string;
  fields: Record<string, unknown>;
  inputs: Record<string, { block: Node }>;
  next?: { block: Node };
}
let id = 0;
const node = (
  type: string,
  inputs: Record<string, Node> = {},
  fields: Record<string, unknown> = {},
): Node => ({
  id: "test_" + ++id,
  type,
  fields,
  inputs: Object.fromEntries(
    Object.entries(inputs).map(([name, block]) => [name, { block }]),
  ),
});
function chain(...items: Node[]): Node {
  items.forEach((item, index) => {
    if (items[index + 1]) item.next = { block: items[index + 1]! };
  });
  return items[0]!;
}
const num = (value: number) => node("math_number", {}, { NUM: value });
const set = (value: number | Node) =>
  node(
    "kids_variable_set",
    { VALUE: typeof value === "number" ? num(value) : value },
    { VARIABLE: "var_1" },
  );
const inc = () =>
  node("kids_variable_increase", { VALUE: num(1) }, { VARIABLE: "var_1" });
const wait = () => node("control_wait", { DURATION: num(1) });
const say = (text: string) =>
  node("looks_sayforsecs", {
    MESSAGE: node("text", {}, { TEXT: text }),
    SECS: num(0.5),
  });
const sound = (name = "sfx_ui_click") =>
  node("sound_play", {
    SOUND_MENU: node("kids_sound_menu", {}, { SOUND_MENU: name }),
  });
const repeat = (count: number, body: Node) =>
  node("control_repeat", { TIMES: num(count), SUBSTACK: body });
const compare = (value: number, score = false, op = "gt") =>
  node(
    score ? "kids_score_compare" : "kids_variable_compare",
    { RIGHT: num(value) },
    { VARIABLE: "var_1", OP: op },
  );
const branch = (condition: Node, yes: Node, no?: Node) =>
  node(no ? "kids_if_else" : "kids_if", {
    CONDITION: condition,
    SUBSTACK: yes,
    ...(no ? { SUBSTACK2: no } : {}),
  });
const addScore = () => node("kids_score_change", { DELTA: num(1) });
const resetScore = () => node("kids_score_set", { VALUE: num(0) });
const result = (value = "success") =>
  node("kids_result", {}, { RESULT: value });
const send = (message: string) =>
  node("kids_broadcast", {}, { MESSAGE: message });
const receive = (message: string, body: Node) =>
  chain(node("kids_when_message", {}, { MESSAGE: message }), body);
const flag = (...body: Node[]) => chain(node("event_whenflagclicked"), ...body);
const click = (...body: Node[]) =>
  chain(node("event_whenthisspriteclicked"), ...body);
const random = (to: number) =>
  node("kids_random_number", { FROM: num(1), TO: num(to) });

function compilable(block: Node): RuntimeCompilableBlock {
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
      (workspace as { blocks: { blocks: Node[] } }).blocks.blocks.map(
        (root) => {
          const blocks = [];
          let current: Node | undefined = root;
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
  },
  async tween(_duration, update, cancellation) {
    cancellation.throwIfCancelled();
    update(1);
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
const samples = (
  threshold: number,
  high: string,
  low?: string,
  score = false,
) =>
  flag(
    set(0),
    ...(score ? [resetScore()] : []),
    repeat(
      6,
      chain(
        inc(),
        branch(
          compare(threshold),
          chain(say(high), ...(score ? [addScore()] : [])),
          low ? say(low) : undefined,
        ),
      ),
    ),
  );

function solution(taskId: TaskId): Node[] {
  if (taskId === "speak") return [flag(say("你好，我是团团"))];
  if (taskId === "move")
    return [flag(node("motion_movesteps", { STEPS: num(3) }))];
  if (taskId === "sequence")
    return [flag(say("我出发啦"), node("motion_movesteps", { STEPS: num(1) }))];
  if (taskId === "repeat")
    return [flag(repeat(2, node("motion_movesteps", { STEPS: num(1) })))];
  if (taskId === "collision")
    return [
      flag(
        node("motion_movesteps", { STEPS: num(3) }),
        node(
          "kids_if_touching",
          { SUBSTACK: say("找到啦") },
          { TARGET: "spr_box" },
        ),
      ),
    ];
  if (taskId === "path_turn")
    return [
      flag(
        node("motion_movesteps", { STEPS: num(2) }),
        node("kids_move_up", { STEPS: num(2) }),
      ),
    ];
  if (taskId === "data_compare")
    return [flag(set(5), branch(compare(3), say("这一组更多")))];
  if (taskId === "data_show")
    return [
      flag(set(0), node("kids_variable_hide")),
      click(inc(), node("kids_variable_show"), say("记录好了")),
    ];
  if (taskId === "sound" || taskId === "ai_music") {
    const melody = repeat(
      taskId === "sound" ? 3 : 4,
      chain(sound("sfx_ui_click"), wait(), sound("sfx_game_success"), wait()),
    );
    return taskId === "sound"
      ? [flag(melody)]
      : [flag(send("演奏")), receive("演奏", chain(melody, result()))];
  }
  if (taskId === "pattern_spin")
    return [
      flag(
        repeat(3, chain(node("kids_turn_left", { DEGREES: num(90) }), wait())),
      ),
    ];
  if (taskId === "think_two" || taskId === "think_or") {
    const and = taskId === "think_two";
    const check = () =>
      branch(
        node(and ? "kids_logic_and" : "kids_logic_or", {
          LEFT: node("kids_touching_condition", {}, { TARGET: "spr_box" }),
          RIGHT: compare(and ? 2 : 5, true),
        }),
        say(and ? "完美" : "通过"),
        say(and ? "条件不足" : "不通过"),
      );
    const right = node("motion_movesteps", { STEPS: num(3) });
    const left = node("kids_move_left", { STEPS: num(1) });
    const score = node("kids_score_change", { DELTA: num(and ? 3 : 6) });
    return [
      flag(
        resetScore(),
        right,
        check(),
        ...(and
          ? [score, check(), left, check()]
          : [left, check(), score, check()]),
      ),
    ];
  }
  if (taskId === "think_if") return [samples(3, "够多")];
  if (taskId === "think_else") return [samples(3, "大", "小")];
  if (taskId === "think_threshold") return [samples(4, "大", "小", true)];
  if (taskId === "think_train") return [samples(3, "达标", "未达标", true)];
  if (taskId === "think_check" || taskId === "ai_final") {
    const root = samples(3, "达标", "未达标", true);
    let tail = root;
    while (tail.next) tail = tail.next.block;
    if (taskId === "think_check") {
      tail.next = {
        block: branch(compare(2, true), result(), result("failure")),
      };
      return [root];
    }
    tail.next = {
      block: chain(
        node("motion_movesteps", { STEPS: num(3) }),
        branch(
          node("kids_logic_and", {
            LEFT: node("kids_touching_condition", {}, { TARGET: "spr_box" }),
            RIGHT: compare(2, true),
          }),
          send("验收"),
          result("failure"),
        ),
      ),
    };
    return [root, receive("验收", chain(sound(), result()))];
  }
  if (taskId === "ai_helper")
    return [
      flag(
        resetScore(),
        repeat(5, chain(addScore(), branch(compare(2, true), sound()))),
      ),
    ];
  if (taskId === "ai_quiz")
    return [
      click(
        repeat(
          3,
          chain(
            set(random(3)),
            branch(
              compare(1, false, "eq"),
              say("A"),
              branch(compare(2, false, "eq"), say("B"), say("C")),
            ),
          ),
        ),
      ),
    ];
  if (taskId === "ai_sort")
    return [
      click(
        set(0),
        repeat(
          6,
          chain(inc(), branch(compare(3), send("大堆"), send("小堆")), wait()),
        ),
      ),
      receive("大堆", say("大堆")),
      receive("小堆", say("小堆")),
    ];
  if (taskId === "ai_story")
    return [
      flag(
        set(0),
        repeat(3, chain(inc(), say("准备"))),
        node("kids_next_scene"),
      ),
      chain(node("kids_when_scene_starts"), branch(compare(2), send("继续"))),
      receive("继续", chain(say("到达"), result())),
    ];
  if (taskId === "pattern_tempo")
    return [
      flag(
        repeat(
          2,
          repeat(
            4,
            chain(
              node("motion_turnright", { DEGREES: num(90) }),
              sound(),
              wait(),
            ),
          ),
        ),
      ),
    ];
  if (taskId === "pattern_swap")
    return [
      flag(
        set(0),
        repeat(
          6,
          chain(
            branch(
              compare(0, false, "eq"),
              chain(node("looks_hide"), set(1)),
              chain(node("looks_show"), set(0)),
            ),
            wait(),
          ),
        ),
      ),
    ];
  if (taskId === "pattern_predict")
    return [
      flag(
        node("kids_variable_show"),
        repeat(
          6,
          chain(
            set(random(6)),
            branch(compare(3), say("大"), say("小")),
            wait(),
          ),
        ),
      ),
    ];
  if (taskId === "path_repeat")
    return [
      flag(
        repeat(
          2,
          chain(
            node("motion_movesteps", { STEPS: num(2) }),
            node("kids_move_up", { STEPS: num(2) }),
          ),
        ),
      ),
    ];
  throw new Error("Missing reference solution: " + taskId);
}

describe("story pilot actual programs", () => {
  it.each([
    "speak",
    "move",
    "sequence",
    "repeat",
    "collision",
    "path_turn",
    "path_repeat",
    "data_compare",
  ] as const)(
    "compiles and executes the current story program for %s",
    async (taskId) => {
      for (const version of ["4"]) {
        const task = findVersionedTask(taskId, version, creationTasks)!;
        const project = createTaskProject(task);
        const actor = project.course!.bindings.actor;
        project.workspaceStates[actor] = {
          blocks: { blocks: solution(taskId) },
        };
        const session = new RuntimeSession(
          project,
          stage(project),
          { highlightBlock() {}, reportError() {} },
          clock,
        );
        await session.start(scripts(project));
        const result = evaluateCreationTask(project, task, session.report);
        expect(
          result.rules
            .filter((rule) => !rule.complete)
            .map((rule) => rule.label),
          JSON.stringify(session.report),
        ).toEqual([]);
        expect(session.report.spritePositions[actor]).toBeDefined();
        expect(result.complete).toBe(true);
        expect(
          evaluateCreationTask(project, task, {
            ...session.report,
            taskVersion: version === "3" ? "4" : "3",
          }).complete,
        ).toBe(false);
        session.stop();
      }
    },
  );
});

describe("P0 course assessment compatibility", () => {
  it("rejects the retired three-step shortcut under current five-step requirements", async () => {
    const task = findVersionedTask("ai_helper", "4", creationTasks)!;
    const project = createTaskProject(task);
    delete project.course!.setup;
    project.workspaceStates[project.course!.bindings.actor] = {
      blocks: {
        blocks: [
          flag(repeat(3, addScore()), branch(compare(2, true), sound())),
        ],
      },
    };
    const session = new RuntimeSession(
      project,
      stage(project),
      { highlightBlock() {}, reportError() {} },
      clock,
    );
    await session.start(scripts(project));
    expect(session.report.score).toBe(3);
    expect(evaluateCreationTask(project, task, session.report).complete).toBe(
      false,
    );
    expect(
      evaluateCreationTask(
        project,
        creationTasks.find((item) => item.taskId === "ai_helper")!,
        session.report,
      ).complete,
    ).toBe(false);
  });

  it("assesses the actual program through bound actor and variable IDs and equivalent labels", async () => {
    const task = creationTasks.find((item) => item.taskId === "think_else")!;
    const starter = createTaskProject(task);
    starter.workspaceStates[starter.course!.bindings.actor] = {
      blocks: { blocks: solution("think_else") },
    };
    const project = JSON.parse(
      JSON.stringify(starter)
        .replaceAll("spr_story_tuantuan", "spr_custom")
        .replaceAll("var_1", "var_observation")
        .replaceAll('"大"', '"大堆"')
        .replaceAll('"小"', '"较小"'),
    ) as Project;
    const session = new RuntimeSession(
      project,
      stage(project),
      { highlightBlock() {}, reportError() {} },
      clock,
    );
    await session.start(scripts(project));
    expect(session.report.variables.var_observation).toBe(6);
    expect(evaluateCreationTask(project, task, session.report).complete).toBe(
      true,
    );
  });

  it("accepts independently written story dialogue after the required preparation and scene relay", async () => {
    const task = creationTasks.find((item) => item.taskId === "ai_story")!;
    const project = createTaskProject(task);
    project.workspaceStates[project.course!.bindings.actor] = {
      blocks: {
        blocks: JSON.parse(
          JSON.stringify(solution("ai_story"))
            .replaceAll("准备", "行李装好了")
            .replaceAll("到达", "终于到森林了"),
        ),
      },
    };
    const session = new RuntimeSession(
      project,
      stage(project),
      { highlightBlock() {}, reportError() {} },
      clock,
    );
    await session.start(scripts(project));
    expect(session.report.spokenTexts?.at(-1)).toBe("终于到森林了");
    expect(evaluateCreationTask(project, task, session.report).complete).toBe(
      true,
    );
  });
});

describe("curriculum difficulty progression", () => {
  it.each<TaskId>([
    "data_show",
    "sound",
    "pattern_spin",
    "think_two",
    "think_or",
    "ai_music",
    "think_if",
    "think_else",
    "think_threshold",
    "think_train",
    "think_check",
    "ai_helper",
    "ai_quiz",
    "ai_sort",
    "ai_story",
    "ai_final",
    "pattern_swap",
    "pattern_tempo",
    "pattern_predict",
    "path_repeat",
  ])(
    "accepts an actually compiled and executed reference program for %s",
    async (taskId) => {
      const task = creationTasks.find((item) => item.taskId === taskId)!;
      const project = createTaskProject(task);
      project.workspaceStates = {
        [project.course!.bindings.actor]: {
          blocks: { blocks: solution(taskId) },
        },
      };
      if (taskId === "data_show") {
        const roots = solution(taskId);
        project.workspaceStates = {
          [project.course!.bindings.actor]: { blocks: { blocks: [roots[0]!] } },
          spr_coin: { blocks: { blocks: [roots[1]!] } },
        };
      }
      const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
      try {
        const session = new RuntimeSession(
          project,
          stage(project),
          { highlightBlock() {}, reportError() {} },
          clock,
        );
        await session.start(scripts(project));
        if (taskId === "ai_quiz" || taskId === "ai_sort")
          await session.triggerSpriteClick(project.course!.bindings.actor);
        if (taskId === "data_show")
          for (let i = 0; i < 3; i++)
            await session.triggerSpriteClick("spr_coin");
        const evaluation = evaluateCreationTask(project, task, session.report);
        expect(
          evaluation.rules
            .filter((rule) => !rule.complete)
            .map((rule) => rule.label),
          JSON.stringify(session.report),
        ).toEqual([]);
        expect(evaluation.complete).toBe(true);
      } finally {
        randomSpy.mockRestore();
      }
    },
  );

  it("rejects the old one-number decision and a wrong boundary classification", () => {
    const task = creationTasks.find((item) => item.taskId === "think_else")!;
    const report = {
      status: "COMPLETED" as const,
      score: 0,
      result: null,
      spritePositions: {},
      touchedPairs: [],
      variables: { var_1: 6 },
      variableHistory: { var_1: [0, 1, 2, 3, 4, 5, 6] },
      spokenTexts: ["小", "小", "大", "大", "大", "大"],
    };
    expect(task.runtimeGoal.check(report)).toBe(false);
    expect(
      task.runtimeGoal.check({
        ...report,
        spokenTexts: ["小", "小", "小", "大", "大", "大"],
      }),
    ).toBe(true);
    expect(
      task.runtimeGoal.check({ ...report, variableHistory: { var_1: [0, 6] } }),
    ).toBe(false);
    const scored = creationTasks.find((item) => item.taskId === "think_train")!;
    expect(
      scored.runtimeGoal.check({
        ...report,
        score: 3,
        spokenTexts: Array(6).fill("未达标"),
      }),
    ).toBe(false);
  });

  it("does not require luck to complete random sampling", () => {
    const task = creationTasks.find(
      (item) => item.taskId === "pattern_predict",
    )!;
    const report = {
      status: "COMPLETED" as const,
      score: 0,
      result: null,
      spritePositions: {},
      touchedPairs: [],
      variables: { var_1: 2 },
      variableHistory: { var_1: [0, 2, 2, 2, 2, 2, 2] },
      spokenTexts: ["小", "小", "小", "小", "小", "小"],
      visibleVariables: ["var_1"],
    };
    expect(task.runtimeGoal.check(report)).toBe(true);
    expect(
      task.runtimeGoal.check({
        ...report,
        spokenTexts: ["大", "小", "小", "小", "小", "小"],
      }),
    ).toBe(false);
  });

  it("keeps all 64 IDs and advances from simple loops to composite ones", () => {
    expect(new Set(creationTasks.map((task) => task.taskId)).size).toBe(64);
    expect(getNextCreationTask("pattern_beat")?.taskId).toBe("pattern_spin");
    expect(getNextCreationTask("pattern_square")?.taskId).toBe("pattern_tempo");
    expect(getNextCreationTask("ai_helper")?.taskId).toBe("ai_limit");
    expect(getNextCreationTask("ai_story")?.taskId).toBe("ai_final");
  });

  it("places each new treasure lesson exactly three grid steps from its chest", () => {
    for (const task of creationTasks.filter(
      (item) => item.projectMode === "treasure-template",
    )) {
      const project = createTaskProject(task);
      const actor = project.scenes[0]!.instances.find(
        (item) => item.spriteId === project.course!.bindings.actor,
      )!;
      const chest = project.scenes[0]!.instances.find(
        (item) => item.spriteId === "spr_box",
      )!;
      expect(chest.transform.x - actor.transform.x).toBe(120);
      expect(chest.transform.y).toBe(actor.transform.y);
    }
  });
});
