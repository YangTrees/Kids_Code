import { z } from "zod";

const runtimeBlockBaseSchema = z.object({
  id: z.string().startsWith("blk_"),
  sourceBlockId: z.string().min(1),
});

export type RuntimeNumberExpression =
  | { type: "NUMBER_LITERAL"; value: number }
  | { type: "NUMBER_SCORE" }
  | { type: "NUMBER_VARIABLE"; variableId: string }
  | { type: "NUMBER_RANDOM"; from: number; to: number };

export type RuntimeCondition =
  | { type: "COND_BOOLEAN"; value: boolean }
  | { type: "COND_TOUCHING"; targetSpriteId: string }
  | {
      type: "COND_COMPARE";
      operator: "gt" | "eq" | "lt";
      left: RuntimeNumberExpression;
      right: RuntimeNumberExpression;
    }
  | {
      type: "COND_AND" | "COND_OR";
      left: RuntimeCondition;
      right: RuntimeCondition;
    }
  | { type: "COND_NOT"; operand: RuntimeCondition };

export const runtimeNumberExpressionSchema: z.ZodType<RuntimeNumberExpression> =
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("NUMBER_LITERAL"), value: z.number() }),
    z.object({ type: z.literal("NUMBER_SCORE") }),
    z.object({
      type: z.literal("NUMBER_VARIABLE"),
      variableId: z.string().startsWith("var_"),
    }),
    z.object({
      type: z.literal("NUMBER_RANDOM"),
      from: z.number().int().min(-9999).max(9999),
      to: z.number().int().min(-9999).max(9999),
    }),
  ]);

export const runtimeConditionSchema: z.ZodType<RuntimeCondition> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("COND_BOOLEAN"), value: z.boolean() }),
    z.object({
      type: z.literal("COND_TOUCHING"),
      targetSpriteId: z.string().startsWith("spr_"),
    }),
    z.object({
      type: z.literal("COND_COMPARE"),
      operator: z.enum(["gt", "eq", "lt"]),
      left: runtimeNumberExpressionSchema,
      right: runtimeNumberExpressionSchema,
    }),
    z.object({
      type: z.literal("COND_AND"),
      left: runtimeConditionSchema,
      right: runtimeConditionSchema,
    }),
    z.object({
      type: z.literal("COND_OR"),
      left: runtimeConditionSchema,
      right: runtimeConditionSchema,
    }),
    z.object({
      type: z.literal("COND_NOT"),
      operand: runtimeConditionSchema,
    }),
  ]),
);

export const runtimeBlockSchema: z.ZodType<RuntimeBlock> = z.lazy(() =>
  z.discriminatedUnion("type", [
    runtimeBlockBaseSchema.extend({ type: z.literal("EVT_FLAG") }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("EVT_KEY"),
      key: z.string().min(1).max(20),
    }),
    runtimeBlockBaseSchema.extend({ type: z.literal("EVT_SPRITE_CLICK") }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("EVT_TOUCH"),
      targetSpriteId: z.string().startsWith("spr_"),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("EVT_TOUCH_STAY"),
      targetSpriteId: z.string().startsWith("spr_"),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("EVT_TOUCH_EXIT"),
      targetSpriteId: z.string().startsWith("spr_"),
    }),
    runtimeBlockBaseSchema.extend({ type: z.literal("EVT_SCENE_START") }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("EVT_MESSAGE"),
      message: z.string().min(1).max(30),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("MOT_MOVE"),
      direction: z.enum(["right", "left", "up", "down"]),
      steps: z.number().int().min(1).max(10),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("MOT_TURN"),
      degrees: z
        .number()
        .int()
        .min(-360)
        .max(360)
        .refine((value) => value !== 0),
    }),
    runtimeBlockBaseSchema.extend({ type: z.literal("MOT_GOTO_START") }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("MOT_GOTO"),
      x: z.number().min(0).max(480),
      y: z.number().min(0).max(360),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("LOOK_SAY"),
      text: z.string().min(1).max(40),
      duration: z.number().min(0.1).max(10),
    }),
    runtimeBlockBaseSchema.extend({ type: z.literal("LOOK_SHOW") }),
    runtimeBlockBaseSchema.extend({ type: z.literal("LOOK_HIDE") }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("LOOK_COSTUME"),
      costumeAssetId: z.string().min(1),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("LOOK_SIZE"),
      delta: z.number().int().min(-80).max(80),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("SND_PLAY"),
      soundId: z.string().min(1),
    }),
    runtimeBlockBaseSchema.extend({ type: z.literal("SND_STOP_ALL") }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("CTL_STOP"),
      scope: z.enum(["this", "all"]),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("EVT_BROADCAST"),
      message: z.string().min(1).max(30),
    }),
    runtimeBlockBaseSchema.extend({ type: z.literal("SCENE_NEXT") }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("SCENE_SWITCH"),
      sceneId: z.string().startsWith("scn_"),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("CTL_WAIT"),
      duration: z.number().min(0.1).max(10),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("CTL_REPEAT"),
      count: z.number().int().min(2).max(10),
      body: z.array(runtimeBlockSchema).max(100),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("CTL_FOREVER"),
      body: z.array(runtimeBlockSchema).max(100),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("CTL_IF"),
      condition: runtimeConditionSchema,
      body: z.array(runtimeBlockSchema).max(100),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("CTL_IF_ELSE"),
      condition: runtimeConditionSchema,
      thenBody: z.array(runtimeBlockSchema).max(100),
      elseBody: z.array(runtimeBlockSchema).max(100),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("GAME_SET_SCORE"),
      value: z.number().int().min(0).max(9999),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("GAME_CHANGE_SCORE"),
      delta: z.number().int().min(-1000).max(1000),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("GAME_SET_VARIABLE"),
      variableId: z.string().startsWith("var_"),
      value: runtimeNumberExpressionSchema,
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("GAME_CHANGE_VARIABLE"),
      variableId: z.string().startsWith("var_"),
      delta: runtimeNumberExpressionSchema,
      direction: z.enum(["increase", "decrease"]),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("GAME_SHOW_VARIABLE"),
      variableId: z.string().startsWith("var_"),
      visible: z.boolean(),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("GAME_IF_TOUCHING"),
      targetSpriteId: z.string().startsWith("spr_"),
      body: z.array(runtimeBlockSchema).max(100),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("GAME_RESULT"),
      result: z.enum(["success", "failure"]),
      message: z.string().min(1).max(40),
    }),
    runtimeBlockBaseSchema.extend({
      type: z.literal("UNSUPPORTED"),
      originalType: z.string().min(1),
    }),
  ]),
);

export interface RuntimeBlockBase {
  id: string;
  sourceBlockId: string;
}

export type RuntimeBlock =
  | (RuntimeBlockBase & {
      type:
        | "EVT_FLAG"
        | "EVT_SPRITE_CLICK"
        | "EVT_SCENE_START"
        | "SCENE_NEXT"
        | "MOT_GOTO_START"
        | "LOOK_SHOW"
        | "LOOK_HIDE"
        | "SND_STOP_ALL";
    })
  | (RuntimeBlockBase & { type: "EVT_KEY"; key: string })
  | (RuntimeBlockBase & { type: "EVT_TOUCH"; targetSpriteId: string })
  | (RuntimeBlockBase & {
      type: "EVT_TOUCH_STAY" | "EVT_TOUCH_EXIT";
      targetSpriteId: string;
    })
  | (RuntimeBlockBase & { type: "EVT_MESSAGE"; message: string })
  | (RuntimeBlockBase & { type: "LOOK_COSTUME"; costumeAssetId: string })
  | (RuntimeBlockBase & { type: "SCENE_SWITCH"; sceneId: string })
  | (RuntimeBlockBase & { type: "UNSUPPORTED"; originalType: string })
  | (RuntimeBlockBase & {
      type: "MOT_MOVE";
      direction: "right" | "left" | "up" | "down";
      steps: number;
    })
  | (RuntimeBlockBase & { type: "MOT_TURN"; degrees: number })
  | (RuntimeBlockBase & { type: "MOT_GOTO"; x: number; y: number })
  | (RuntimeBlockBase & { type: "LOOK_SAY"; text: string; duration: number })
  | (RuntimeBlockBase & { type: "LOOK_SIZE"; delta: number })
  | (RuntimeBlockBase & { type: "SND_PLAY"; soundId: string })
  | (RuntimeBlockBase & { type: "CTL_STOP"; scope: "this" | "all" })
  | (RuntimeBlockBase & { type: "EVT_BROADCAST"; message: string })
  | (RuntimeBlockBase & { type: "CTL_WAIT"; duration: number })
  | (RuntimeBlockBase & {
      type: "CTL_REPEAT";
      count: number;
      body: RuntimeBlock[];
    })
  | (RuntimeBlockBase & { type: "CTL_FOREVER"; body: RuntimeBlock[] })
  | (RuntimeBlockBase & {
      type: "CTL_IF";
      condition: RuntimeCondition;
      body: RuntimeBlock[];
    })
  | (RuntimeBlockBase & {
      type: "CTL_IF_ELSE";
      condition: RuntimeCondition;
      thenBody: RuntimeBlock[];
      elseBody: RuntimeBlock[];
    })
  | (RuntimeBlockBase & { type: "GAME_SET_SCORE"; value: number })
  | (RuntimeBlockBase & { type: "GAME_CHANGE_SCORE"; delta: number })
  | (RuntimeBlockBase & {
      type: "GAME_SET_VARIABLE";
      variableId: string;
      value: RuntimeNumberExpression;
    })
  | (RuntimeBlockBase & {
      type: "GAME_CHANGE_VARIABLE";
      variableId: string;
      delta: RuntimeNumberExpression;
      direction: "increase" | "decrease";
    })
  | (RuntimeBlockBase & {
      type: "GAME_SHOW_VARIABLE";
      variableId: string;
      visible: boolean;
    })
  | (RuntimeBlockBase & {
      type: "GAME_IF_TOUCHING";
      targetSpriteId: string;
      body: RuntimeBlock[];
    })
  | (RuntimeBlockBase & {
      type: "GAME_RESULT";
      result: "success" | "failure";
      message: string;
    });

export const runtimeScriptSchema = z.object({
  scriptId: z.string().startsWith("scr_"),
  ownerSpriteId: z.string().startsWith("spr_"),
  blocks: z.array(runtimeBlockSchema).min(1).max(200),
});

export type RuntimeScript = z.infer<typeof runtimeScriptSchema>;
