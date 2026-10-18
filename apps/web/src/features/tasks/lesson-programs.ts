import type { Project } from "@kids-code/domain";
import type { TaskId } from "./task-types";
export interface LessonBlock {
  id: string;
  type: string;
  fields: Record<string, string | number>;
  inputs: Record<string, { block: LessonBlock; shadow?: LessonBlock }>;
  next?: { block: LessonBlock };
  x?: number;
  y?: number;
}
let id = 0;
const node = (
  type: string,
  inputs: Record<string, LessonBlock> = {},
  fields: Record<string, string | number> = {},
): LessonBlock => ({
  id: "test_" + ++id,
  type,
  fields,
  inputs: Object.fromEntries(
    Object.entries(inputs).map(([name, block]) => [name, { block }]),
  ),
});
function chain(...items: LessonBlock[]): LessonBlock {
  items.forEach((item, index) => {
    if (items[index + 1]) item.next = { block: items[index + 1]! };
  });
  return items[0]!;
}
const num = (value: number) => node("math_number", {}, { NUM: value });
const set = (value: number | LessonBlock) =>
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
const repeat = (count: number, body: LessonBlock) =>
  node("control_repeat", { TIMES: num(count), SUBSTACK: body });
const compare = (value: number, score = false, op = "gt") =>
  node(
    score ? "kids_score_compare" : "kids_variable_compare",
    { RIGHT: num(value) },
    { VARIABLE: "var_1", OP: op },
  );
const branch = (condition: LessonBlock, yes: LessonBlock, no?: LessonBlock) =>
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
const receive = (message: string, body: LessonBlock) =>
  chain(node("kids_when_message", {}, { MESSAGE: message }), body);
const flag = (...body: LessonBlock[]) =>
  chain(node("event_whenflagclicked"), ...body);
const click = (...body: LessonBlock[]) =>
  chain(node("event_whenthisspriteclicked"), ...body);
const random = (to: number) =>
  node("kids_random_number", { FROM: num(1), TO: num(to) });

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

export function referenceRoots(taskId: TaskId): LessonBlock[] {
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

  const right = (steps: number) =>
    node("motion_movesteps", { STEPS: num(steps) });
  const up = (steps: number) => node("kids_move_up", { STEPS: num(steps) });
  const down = (steps: number) => node("kids_move_down", { STEPS: num(steps) });
  const touch = () =>
    node("kids_touching_condition", {}, { TARGET: "spr_box" });
  const onTouch = (body: LessonBlock) =>
    chain(node("kids_when_touching", {}, { TARGET: "spr_box" }), body);
  if (taskId === "turn")
    return [flag(node("motion_turnright", { DEGREES: num(90) }))];
  if (taskId === "diagonal") return [flag(right(1), up(1))];
  if (taskId === "collision_sound") return [flag(right(3)), onTouch(sound())];
  if (taskId === "touch_end")
    return [
      flag(right(3), wait(), node("kids_move_left", { STEPS: num(1) })),
      chain(
        node("kids_when_touch_end", {}, { TARGET: "spr_box" }),
        say("再见"),
      ),
    ];
  if (taskId === "collect")
    return [click(addScore(), sound("sfx_collect_coin"))];
  if (taskId === "score") return [click(repeat(3, addScore()))];
  if (taskId === "treasure_win") return [flag(right(3)), onTouch(result())];
  if (taskId === "scene") return [flag(node("kids_next_scene"))];
  if (taskId === "variable") return [flag(set(0), inc())];
  if (taskId === "logic")
    return [flag(right(3), branch(touch(), say("找到啦")))];
  if (taskId === "think_touch")
    return [
      flag(
        right(3),
        node(
          "kids_if_touching",
          { SUBSTACK: say("找到啦") },
          { TARGET: "spr_box" },
        ),
      ),
    ];
  if (taskId === "compare_score")
    return [
      flag(
        node("kids_score_set", { VALUE: num(2) }),
        branch(compare(1, true), say("达标啦")),
      ),
    ];
  if (taskId === "logic_or")
    return [
      flag(
        node("kids_score_set", { VALUE: num(2) }),
        branch(
          node("kids_logic_or", { LEFT: touch(), RIGHT: compare(1, true) }),
          say("我想到办法啦"),
        ),
      ),
    ];
  if (taskId === "random") return [flag(set(random(6)))];
  if (taskId === "keyboard")
    return [
      chain(
        node("event_whenkeypressed", {}, { KEY_OPTION: "right arrow" }),
        right(1),
      ),
    ];
  if (taskId === "magic")
    return [flag(node("looks_hide"), wait(), node("looks_show"))];
  if (taskId === "broadcast")
    return [flag(send("找到宝箱")), receive("找到宝箱", say("收到啦"))];
  if (taskId === "scene_story")
    return [
      flag(node("kids_next_scene")),
      chain(node("kids_when_scene_starts"), say("欢迎来到森林")),
    ];
  if (taskId === "finale")
    return [
      chain(
        node("event_whenkeypressed", {}, { KEY_OPTION: "right arrow" }),
        right(1),
      ),
      onTouch(result()),
    ];
  if (taskId === "path_straight") return [flag(right(3))];
  if (taskId === "path_zigzag")
    return [flag(right(2), up(2), right(2), down(2))];
  if (taskId === "sky_waypoint")
    return [flag(right(2), up(2), right(2), down(2), right(2))];
  if (taskId === "sky_collect")
    return [flag(right(2), up(3), down(3), right(4))];
  if (taskId === "sky_shortcut") return [flag(right(6), up(2))];
  if (taskId === "sky_master")
    return [flag(repeat(3, right(1)), up(3), right(4), up(2))];
  if (taskId === "data_count")
    return [click(inc(), node("kids_variable_show"))];
  if (taskId === "data_record") return [flag(repeat(3, chain(inc(), wait())))];
  if (taskId === "data_reset") return [flag(set(0), repeat(3, inc()))];
  if (taskId === "data_label")
    return [
      flag(
        set(0),
        repeat(3, inc()),
        branch(compare(2), say("够了"), say("还要再记")),
      ),
    ];
  if (taskId === "data_sort")
    return [
      click(
        set(random(6)),
        branch(compare(3), say("放进大堆"), say("放进小堆")),
      ),
    ];
  if (taskId === "data_chart")
    return [flag(set(0), node("kids_variable_show"), repeat(5, inc()))];
  if (taskId === "pattern_beat")
    return [flag(repeat(4, chain(sound("sfx_drum"), wait())))];
  if (taskId === "pattern_grow")
    return [
      flag(
        repeat(
          4,
          chain(node("looks_changesizeby", { CHANGE: num(10) }), wait()),
        ),
      ),
    ];
  if (taskId === "pattern_square")
    return [
      flag(
        repeat(
          4,
          chain(
            node("kids_move_forward", { STEPS: num(3) }),
            node("motion_turnright", { DEGREES: num(90) }),
          ),
        ),
      ),
    ];
  if (taskId === "pattern_forever")
    return [
      flag(
        resetScore(),
        node("control_forever", {
          SUBSTACK: chain(
            addScore(),
            branch(compare(4, true), node("kids_stop", {}, { SCOPE: "this" })),
          ),
        }),
      ),
    ];
  if (taskId === "ai_limit" || taskId === "ai_fair")
    return [
      flag(
        set(5),
        repeat(
          2,
          chain(
            branch(
              compare(3),
              say("够多"),
              taskId === "ai_fair" ? say("还要再收集") : undefined,
            ),
            set(1),
          ),
        ),
      ),
    ];
  throw new Error("Missing reference solution: " + taskId);
}

/** Multi-role programs preserve ownership; no example is silently inserted into a learner's work. */
export function lessonProgram(
  project: Project,
  taskId: TaskId,
  variant: "reference" | "equivalent" | "error" = "reference",
): Record<
  string,
  { blocks: { languageVersion: number; blocks: LessonBlock[] } }
> {
  if (variant === "error") {
    const workspaces = lessonProgram(project, taskId, "reference");
    for (const workspace of Object.values(workspaces)) {
      const detached: LessonBlock[] = [];
      for (const root of workspace.blocks.blocks)
        if (root.next) {
          detached.push(root.next.block);
          delete root.next;
        }
      workspace.blocks.blocks.push(...detached);
    }
    return workspaces;
  }
  const actor = project.course!.bindings.actor,
    coin = project.course!.bindings.coin ?? actor;
  const roots =
    variant === "equivalent" ? equivalentRoots(taskId) : referenceRoots(taskId);
  roots.forEach((root, index) => {
    root.x = 20 + index * 250;
    root.y = 20;
  });
  const workspace = (blocks: LessonBlock[]) => ({
    blocks: { languageVersion: 0, blocks },
  });
  if (taskId === "data_show")
    return { [actor]: workspace([roots[0]!]), [coin]: workspace([roots[1]!]) };
  const coinTasks: TaskId[] = ["collect", "score", "data_count"];
  return { [coinTasks.includes(taskId) ? coin : actor]: workspace(roots) };
}
export function lessonStimulus(taskId: TaskId): {
  coinClicks: number;
  actorClicks: number;
  rightKeys: number;
  sort: boolean;
  chart: boolean;
} {
  return {
    coinClicks:
      taskId === "data_show"
        ? 3
        : ["collect", "score", "data_count"].includes(taskId)
          ? 1
          : 0,
    actorClicks: ["data_sort", "ai_quiz", "ai_sort"].includes(taskId) ? 1 : 0,
    rightKeys: taskId === "finale" ? 3 : taskId === "keyboard" ? 1 : 0,
    sort: taskId === "data_sort",
    chart: taskId === "data_chart",
  };
}

/** Legal alternate parameter/sequence choices, not a bypass of assessment. */
export function equivalentRoots(taskId: TaskId): LessonBlock[] {
  const roots = referenceRoots(taskId);
  const all: LessonBlock[] = [];
  const visit = (item: LessonBlock) => {
    all.push(item);
    Object.values(item.inputs).forEach((input) => visit(input.block));
    if (item.next) visit(item.next.block);
  };
  roots.forEach(visit);
  const speech = all.find((item) => item.type === "text");
  if (speech) {
    speech.fields.TEXT = String(speech.fields.TEXT) + "！";
    return roots;
  }
  const movement = all.find(
    (item) =>
      item.type === "motion_movesteps" &&
      Number(item.inputs.STEPS?.block.fields.NUM) >= 2,
  );
  if (
    movement &&
    (taskId === "move" ||
      taskId.startsWith("path_") ||
      taskId.startsWith("sky_"))
  ) {
    const steps = Number(movement.inputs.STEPS!.block.fields.NUM),
      next = movement.next;
    movement.inputs.STEPS!.block.fields.NUM = 1;
    const rest = node("motion_movesteps", { STEPS: num(steps - 1) });
    if (next) rest.next = next;
    movement.next = { block: rest };
    return roots;
  }
  if (taskId === "turn") {
    const turn = all.find((item) => item.type === "motion_turnright")!;
    turn.type = "kids_turn_left";
    turn.inputs.DEGREES!.block.fields.NUM = 270;
    return roots;
  }
  const soundMenu = all.find((item) => item.type === "kids_sound_menu");
  if (soundMenu) {
    soundMenu.fields.SOUND_MENU = "sfx_bell";
    return roots;
  }
  // A short initial observation pause does not change counts, geometry or conditions.
  const root = roots[0]!,
    previous = root.next;
  const pause = node("control_wait", { DURATION: num(0.1) });
  if (previous) pause.next = previous;
  root.next = { block: pause };
  return roots;
}
