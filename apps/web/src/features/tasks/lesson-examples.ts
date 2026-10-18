import type { TaskId } from "./task-types";
import { referenceRoots } from "./lesson-programs";
export interface LessonBlock {
  type: string;
  id: string;
  fields?: Record<string, string | number>;
  inputs?: Record<string, { block?: LessonBlock; shadow?: LessonBlock }>;
  next?: { block: LessonBlock };
  x?: number;
  y?: number;
}
let serial = 0;
const block = (
  type: string,
  inputs: Record<string, LessonBlock> = {},
  fields?: LessonBlock["fields"],
): LessonBlock => ({
  type,
  id: "example_" + ++serial,
  ...(fields ? { fields } : {}),
  inputs: Object.fromEntries(
    Object.entries(inputs).map(([key, value]) => [key, { block: value }]),
  ),
});
const chain = (...nodes: LessonBlock[]): LessonBlock => {
  nodes.forEach((node, index) => {
    if (nodes[index + 1]) node.next = { block: nodes[index + 1]! };
  });
  return nodes[0]!;
};
const number = (value: number) => block("math_number", {}, { NUM: value });
const say = (text = "你好，我是团团") =>
  block("looks_sayforsecs", {
    MESSAGE: block("text", {}, { TEXT: text }),
    SECS: number(0.5),
  });
const right = (steps: number) =>
  block("motion_movesteps", { STEPS: number(steps) });
const up = (steps: number) => block("kids_move_up", { STEPS: number(steps) });
const repeat = (body: LessonBlock) =>
  block("control_repeat", { TIMES: number(2), SUBSTACK: body });
/** Illustrative, not inserted into a child's workspace. IDs are fresh for each rendering. */
export function lessonExample(
  taskId: TaskId,
  wrong = false,
): { blocks: { languageVersion: number; blocks: LessonBlock[] } } {
  let body: LessonBlock;
  switch (taskId) {
    case "speak":
      body = wrong ? right(1) : say();
      break;
    case "move":
      body = wrong ? block("kids_move_left", { STEPS: number(3) }) : right(3);
      break;
    case "sequence":
      body = wrong ? chain(right(1), say()) : chain(say("我出发啦"), right(1));
      break;
    case "repeat":
      body = repeat(wrong ? say() : right(1));
      break;
    case "collision":
      body = chain(
        right(3),
        block(
          "kids_if_touching",
          { SUBSTACK: say("找到啦") },
          { TARGET: wrong ? "spr_coin" : "spr_box" },
        ),
      );
      break;
    case "path_turn":
      body = wrong ? chain(right(4), up(2)) : chain(right(2), up(2));
      break;
    case "path_repeat":
      body = repeat(wrong ? right(2) : chain(right(2), up(2)));
      break;
    case "data_compare":
      body = chain(
        block(
          "kids_variable_set",
          { VALUE: number(wrong ? 1 : 5) },
          { VARIABLE: "var_1" },
        ),
        block("kids_if", {
          CONDITION: block(
            "kids_variable_compare",
            { RIGHT: number(3) },
            { VARIABLE: "var_1", OP: "gt" },
          ),
          SUBSTACK: say("这一组更多"),
        }),
      );
      break;
    default:
      return {
        blocks: {
          languageVersion: 0,
          blocks: referenceRoots(taskId).map((root, index) => ({
            ...root,
            x: 20 + index * 250,
            y: 20,
          })),
        },
      };
  }
  const root = chain(block("event_whenflagclicked"), body);
  root.x = 20;
  root.y = 20;
  return { blocks: { languageVersion: 0, blocks: [root] } };
}
