import { z } from "zod";

export const MOVEMENT_GRID_SIZE = 40;
export const getMovementStep = (project: Project): number =>
  project.settings.movementStep ?? 10;

export function getGridDimensions(project: Project) {
  const step = getMovementStep(project);
  return {
    columns: project.settings.stageWidth / step,
    rows: project.settings.stageHeight / step,
  };
}

export function stagePositionToGrid(project: Project, x: number, y: number) {
  const step = getMovementStep(project);
  const { columns, rows } = getGridDimensions(project);
  return {
    x: Math.max(0, Math.min(columns - 1, Math.round((x - step / 2) / step))),
    y: Math.max(0, Math.min(rows - 1, Math.round((y - step / 2) / step))),
  };
}

export function gridPositionToStage(project: Project, x: number, y: number) {
  const step = getMovementStep(project);
  const { columns, rows } = getGridDimensions(project);
  return {
    x: (Math.max(0, Math.min(columns - 1, Math.round(x))) + 0.5) * step,
    y: (Math.max(0, Math.min(rows - 1, Math.round(y))) + 0.5) * step,
  };
}

export function snapStagePositionToGrid(
  project: Project,
  x: number,
  y: number,
) {
  const cell = stagePositionToGrid(project, x, y);
  return gridPositionToStage(project, cell.x, cell.y);
}

const pathCellSchema = z.object({
  column: z.number().int().min(0).max(11),
  row: z.number().int().min(0).max(8),
});

export const pathMapSchema = z.object({
  actorSpriteId: z.string().startsWith("spr_"),
  tiles: z.array(pathCellSchema).min(2).max(108),
  start: pathCellSchema,
  goal: pathCellSchema,
  theme: z.enum(["forest", "sky"]).optional(),
  checkpoints: z.array(pathCellSchema).max(8).optional(),
  collectibles: z.array(pathCellSchema).max(8).optional(),
  maxSteps: z.number().int().positive().optional(),
  noRevisit: z.boolean().optional(),
});

export type PathCell = z.infer<typeof pathCellSchema>;
export type PathMap = z.infer<typeof pathMapSchema>;
export const pathCellKey = (cell: PathCell): string =>
  `${cell.column}:${cell.row}`;
export const pathCellPosition = (cell: PathCell) => ({
  x: cell.column * MOVEMENT_GRID_SIZE + MOVEMENT_GRID_SIZE / 2,
  y: cell.row * MOVEMENT_GRID_SIZE + MOVEMENT_GRID_SIZE / 2,
});
export function pathCellAtPosition(x: number, y: number): PathCell | null {
  const column = Math.round((x - MOVEMENT_GRID_SIZE / 2) / MOVEMENT_GRID_SIZE);
  const row = Math.round((y - MOVEMENT_GRID_SIZE / 2) / MOVEMENT_GRID_SIZE);
  const center = pathCellPosition({ column, row });
  return Math.abs(center.x - x) < 1 && Math.abs(center.y - y) < 1
    ? { column, row }
    : null;
}

export const transformSchema = z.object({
  x: z.number().min(0).max(480),
  y: z.number().min(0).max(360),
  rotation: z.number().min(-180).max(180),
  // Logical scale. The stage applies the asset-specific base scale separately.
  // Values up to 10 are accepted only so geometry v1/v2 projects can migrate.
  scaleX: z.number().min(0.01).max(10),
  scaleY: z.number().min(0.01).max(10),
});

export type CollisionProfile =
  | {
      shape: "rect";
      insetLeft: number;
      insetRight: number;
      insetTop: number;
      insetBottom: number;
    }
  | { shape: "circle"; diameterRatio: number };

export interface SpritePresentationProfile {
  baseScale: number;
  anchorX: number;
  anchorY: number;
  collision: CollisionProfile;
  solid: boolean;
  collectible: boolean;
}

const defaultPresentationProfile: SpritePresentationProfile = {
  baseScale: 0.3,
  anchorX: 0.5,
  anchorY: 0.9,
  collision: {
    shape: "rect",
    insetLeft: 0.1,
    insetRight: 0.1,
    insetTop: 0.08,
    insetBottom: 0.04,
  },
  solid: false,
  collectible: false,
};

export const builtInSpritePresentationProfiles: Record<
  string,
  SpritePresentationProfile
> = {
  costume_liji_idle: {
    baseScale: 0.18,
    anchorX: 0.5,
    anchorY: 0.9,
    collision: {
      shape: "rect",
      insetLeft: 0.15,
      insetRight: 0.15,
      insetTop: 0.08,
      insetBottom: 0.04,
    },
    solid: false,
    collectible: false,
  },
  costume_tuantuan_idle: {
    baseScale: 0.19,
    anchorX: 0.5,
    anchorY: 0.92,
    collision: {
      shape: "rect",
      insetLeft: 0.17,
      insetRight: 0.17,
      insetTop: 0.08,
      insetBottom: 0.04,
    },
    solid: false,
    collectible: false,
  },
  costume_diandian_idle: {
    baseScale: 0.18,
    anchorX: 0.5,
    anchorY: 0.92,
    collision: {
      shape: "rect",
      insetLeft: 0.18,
      insetRight: 0.18,
      insetTop: 0.08,
      insetBottom: 0.04,
    },
    solid: false,
    collectible: false,
  },
  costume_xiaoyong_idle: {
    baseScale: 0.18,
    anchorX: 0.5,
    anchorY: 0.92,
    collision: {
      shape: "rect",
      insetLeft: 0.18,
      insetRight: 0.18,
      insetTop: 0.08,
      insetBottom: 0.04,
    },
    solid: false,
    collectible: false,
  },
  costume_feifei_idle: {
    baseScale: 0.18,
    anchorX: 0.5,
    anchorY: 0.9,
    collision: { shape: "circle", diameterRatio: 0.72 },
    solid: false,
    collectible: false,
  },
  vehicle_race_car: {
    baseScale: 0.18,
    anchorX: 0.5,
    anchorY: 0.82,
    collision: {
      shape: "rect",
      insetLeft: 0.06,
      insetRight: 0.06,
      insetTop: 0.22,
      insetBottom: 0.08,
    },
    solid: false,
    collectible: false,
  },
  vehicle_rocket: {
    baseScale: 0.18,
    anchorX: 0.5,
    anchorY: 0.9,
    collision: {
      shape: "rect",
      insetLeft: 0.2,
      insetRight: 0.2,
      insetTop: 0.08,
      insetBottom: 0.05,
    },
    solid: false,
    collectible: false,
  },
  object_magic_door: {
    baseScale: 0.2,
    anchorX: 0.5,
    anchorY: 0.94,
    collision: {
      shape: "rect",
      insetLeft: 0.08,
      insetRight: 0.08,
      insetTop: 0.04,
      insetBottom: 0.02,
    },
    solid: true,
    collectible: false,
  },
  object_road_cone: {
    baseScale: 0.15,
    anchorX: 0.5,
    anchorY: 0.94,
    collision: {
      shape: "rect",
      insetLeft: 0.12,
      insetRight: 0.12,
      insetTop: 0.06,
      insetBottom: 0.02,
    },
    solid: true,
    collectible: false,
  },
  object_bouncy_ball: {
    baseScale: 0.11,
    anchorX: 0.5,
    anchorY: 0.5,
    collision: { shape: "circle", diameterRatio: 0.86 },
    solid: false,
    collectible: false,
  },
  obj_treasure_chest: {
    baseScale: 0.055,
    anchorX: 0.5,
    anchorY: 0.9,
    collision: {
      shape: "rect",
      insetLeft: 0.1,
      insetRight: 0.1,
      insetTop: 0.1,
      insetBottom: 0.1,
    },
    solid: true,
    collectible: false,
  },
  obj_star_coin: {
    baseScale: 0.03,
    anchorX: 0.5,
    anchorY: 0.5,
    collision: { shape: "circle", diameterRatio: 0.7 },
    solid: false,
    collectible: true,
  },
};

export function getSpritePresentationProfile(
  costumeAssetId: string,
): SpritePresentationProfile {
  return (
    builtInSpritePresentationProfiles[costumeAssetId] ??
    defaultPresentationProfile
  );
}

// A costume's logical size should not depend on its source image resolution.
export function getSpriteBaseScale(
  costumeAssetId: string,
  textureHeight: number,
): number {
  const height =
    costumeAssetId === "obj_star_coin"
      ? 26
      : costumeAssetId === "obj_treasure_chest"
        ? 38
        : costumeAssetId === "object_magic_door"
          ? 64
          : 52;
  return height / Math.max(1, textureHeight);
}

export const blockSchema = z.object({
  id: z.string().startsWith("blk_"),
  type: z.string().min(1),
  params: z.record(z.string(), z.unknown()),
  next: z.string().nullable(),
});

export const scriptSchema = z.object({
  scriptId: z.string().startsWith("scr_"),
  ownerSpriteId: z.string().startsWith("spr_"),
  position: z.object({ x: z.number(), y: z.number() }),
  blocks: z.array(blockSchema).max(200),
});

export const projectSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    projectId: z.string().startsWith("prj_"),
    name: z.string().min(1).max(30),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    currentSceneId: z.string().startsWith("scn_"),
    settings: z.object({
      stageWidth: z.literal(480),
      stageHeight: z.literal(360),
      fps: z.literal(60),
      locale: z.string(),
      // Missing in older works: preserve their original 10-pixel movement.
      movementStep: z.union([z.literal(10), z.literal(40)]).default(10),
      // Old works used pixels in the `motion_gotoxy` block.
      coordinateVersion: z.union([z.literal(1), z.literal(2)]).default(1),
      geometryVersion: z
        .union([z.literal(1), z.literal(2), z.literal(3)])
        .default(1),
    }),
    pathMap: pathMapSchema.optional(),
    scenes: z
      .array(
        z.object({
          sceneId: z.string().startsWith("scn_"),
          name: z.string().min(1).max(20),
          backdropAssetId: z.string().startsWith("bg_"),
          instances: z.array(
            z.object({
              instanceId: z.string().startsWith("ins_"),
              spriteId: z.string().startsWith("spr_"),
              transform: transformSchema,
              zIndex: z.number().int(),
              visible: z.boolean(),
            }),
          ),
        }),
      )
      .min(1)
      .max(5),
    sprites: z
      .array(
        z.object({
          spriteId: z.string().startsWith("spr_"),
          name: z.string().min(1).max(20),
          costumeAssetId: z.string(),
        }),
      )
      .min(1)
      .max(20),
    scripts: z.array(scriptSchema),
    workspaceStates: z.record(z.string(), z.unknown()).default({}),
    assets: z.array(
      z.object({
        assetId: z.string().min(1),
        type: z.enum(["sprite", "background", "icon", "audio"]),
        path: z.string().min(1),
        name: z.string().min(1).max(20).optional(),
      }),
    ),
    messages: z.array(
      z.object({
        messageId: z.string().startsWith("msg_"),
        name: z.string().min(1),
      }),
    ),
    variables: z
      .array(
        z.object({
          variableId: z.string().startsWith("var_"),
          name: z.string().min(1).max(12),
          initialValue: z.number().int().min(-9999).max(9999).default(0),
          visible: z.boolean().default(true),
        }),
      )
      .max(20)
      .default([]),
  })
  .superRefine((project, context) => {
    if (project.settings.geometryVersion !== 3) return;
    project.scenes.forEach((scene, sceneIndex) => {
      scene.instances.forEach((instance, instanceIndex) => {
        for (const axis of ["scaleX", "scaleY"] as const) {
          if (instance.transform[axis] <= 3) continue;
          context.addIssue({
            code: "custom",
            message: "Logical sprite scale cannot exceed 3",
            path: [
              "scenes",
              sceneIndex,
              "instances",
              instanceIndex,
              "transform",
              axis,
            ],
          });
        }
      });
    });
  });

export type Project = z.infer<typeof projectSchema>;
export type Transform = z.infer<typeof transformSchema>;
export type Script = z.infer<typeof scriptSchema>;

/** 第 8.6 节定义的项目规模上限，超限时编辑器阻止新增并提示。 */
export const PROJECT_LIMITS = {
  maxScenes: 5,
  maxSprites: 20,
  maxScriptsPerSprite: 50,
  maxBlocksPerScript: 200,
  maxBlocksPerProject: 1_000,
} as const;

/** 统计一个角色工作区里的脚本条数（顶层帽子积木数量）。 */
export function countWorkspaceScripts(workspaceState: unknown): number {
  if (!workspaceState || typeof workspaceState !== "object") return 0;
  const root = workspaceState as { blocks?: { blocks?: unknown } };
  const list = root.blocks?.blocks;
  if (!Array.isArray(list)) return 0;
  let count = 0;
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const block = entry as { parent?: unknown; type?: unknown };
    if (typeof block.type !== "string") continue;
    if (block.parent === undefined || block.parent === null) count += 1;
  }
  return count;
}

/** 统计项目里某个角色的脚本条数（工作区优先，兼容旧版 scripts 字段）。 */
export function countSpriteScripts(project: Project, spriteId: string): number {
  const fromWorkspace = countWorkspaceScripts(
    project.workspaceStates[spriteId],
  );
  if (fromWorkspace > 0) return fromWorkspace;
  return project.scripts.filter((script) => script.ownerSpriteId === spriteId)
    .length;
}

/** 统计项目全部积木数量。 */
export function countProjectBlocks(project: Project): number {
  let total = 0;
  for (const workspace of Object.values(project.workspaceStates))
    total += countWorkspaceBlocksInTree(workspace);
  for (const script of project.scripts) total += script.blocks.length;
  return total;
}

function countWorkspaceBlocksInTree(workspaceState: unknown): number {
  if (!workspaceState || typeof workspaceState !== "object") return 0;
  let count = 0;
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (
      "type" in value &&
      typeof (value as { type?: unknown }).type === "string"
    )
      count += 1;
    for (const child of Object.values(value)) visit(child);
  };
  visit(workspaceState);
  return count;
}

export function upgradeProjectCoordinates(project: Project): Project {
  if (project.settings.coordinateVersion === 2) return project;
  const convertInput = (input: unknown, axis: "x" | "y") => {
    if (!input || typeof input !== "object") return;
    const record = input as Record<string, unknown>;
    for (const key of ["block", "shadow"]) {
      const numberBlock = record[key] as
        { fields?: Record<string, unknown> } | undefined;
      if (!numberBlock?.fields) continue;
      const field = "NUM" in numberBlock.fields ? "NUM" : "VALUE";
      const pixels = Number(numberBlock.fields[field]);
      if (!Number.isFinite(pixels)) continue;
      const grid = stagePositionToGrid(
        project,
        axis === "x" ? pixels : 0,
        axis === "y" ? pixels : 0,
      );
      numberBlock.fields[field] = grid[axis];
    }
  };
  const migrate = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(migrate);
    if (!value || typeof value !== "object") return value;
    const original = value as Record<string, unknown>;
    const copy = Object.fromEntries(
      Object.entries(original).map(([key, child]) => [key, migrate(child)]),
    );
    if (copy.type === "motion_gotoxy") {
      const inputs = copy.inputs as Record<string, unknown> | undefined;
      convertInput(inputs?.X, "x");
      convertInput(inputs?.Y, "y");
    }
    return copy;
  };
  return {
    ...project,
    settings: { ...project.settings, coordinateVersion: 2 },
    workspaceStates: Object.fromEntries(
      Object.entries(project.workspaceStates).map(([spriteId, workspace]) => [
        spriteId,
        migrate(workspace),
      ]),
    ),
  };
}

const legacyBaseScaleByCostume: Record<string, number> = {
  costume_liji_idle: 0.46,
  obj_treasure_chest: 0.14,
  obj_star_coin: 0.07,
};

export function upgradeProjectGeometry(project: Project): Project {
  if (project.settings.geometryVersion === 3) return project;
  const sourceVersion = project.settings.geometryVersion;
  const costumeBySprite = new Map(
    project.sprites.map((sprite) => [sprite.spriteId, sprite.costumeAssetId]),
  );
  return {
    ...project,
    settings: { ...project.settings, geometryVersion: 3 },
    scenes: project.scenes.map((scene) => ({
      ...scene,
      instances: scene.instances.map((instance) => {
        const costume = costumeBySprite.get(instance.spriteId);
        const legacyBase = costume
          ? (legacyBaseScaleByCostume[costume] ?? 0.3)
          : 0.3;
        const normalizeScale = (scale: number): number => {
          if (sourceVersion === 1) {
            if (Math.abs(scale - 0.3) < 0.001) return 1;
            return Math.max(0.01, Math.min(3, scale / legacyBase));
          }
          const faultyGenericSceneScale = 0.3 / legacyBase;
          return Math.abs(scale - faultyGenericSceneScale) < 0.001
            ? 1
            : Math.max(0.01, Math.min(3, scale));
        };
        return {
          ...instance,
          transform: {
            ...instance.transform,
            scaleX: normalizeScale(instance.transform.scaleX),
            scaleY: normalizeScale(instance.transform.scaleY),
          },
        };
      }),
    })),
  };
}

export function createDefaultProject(now = new Date()): Project {
  const timestamp = now.toISOString();
  return {
    schemaVersion: "1.0",
    projectId: "prj_demo_001",
    name: "栗奇的森林寻宝",
    createdAt: timestamp,
    updatedAt: timestamp,
    currentSceneId: "scn_forest",
    settings: {
      stageWidth: 480,
      stageHeight: 360,
      fps: 60,
      locale: "zh-CN",
      geometryVersion: 3,
      movementStep: MOVEMENT_GRID_SIZE,
      coordinateVersion: 2,
    },
    scenes: [
      {
        sceneId: "scn_forest",
        name: "阳光森林",
        backdropAssetId: "bg_forest_01",
        instances: [
          {
            instanceId: "ins_liji",
            spriteId: "spr_liji",
            transform: {
              x: 100,
              y: 300,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            },
            zIndex: 2,
            visible: true,
          },
          {
            instanceId: "ins_box",
            spriteId: "spr_box",
            transform: {
              x: 420,
              y: 300,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            },
            zIndex: 1,
            visible: true,
          },
          {
            instanceId: "ins_coin",
            spriteId: "spr_coin",
            transform: {
              x: 340,
              y: 180,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
            },
            zIndex: 3,
            visible: true,
          },
        ],
      },
    ],
    sprites: [
      {
        spriteId: "spr_liji",
        name: "栗奇",
        costumeAssetId: "costume_liji_idle",
      },
      {
        spriteId: "spr_box",
        name: "宝箱",
        costumeAssetId: "obj_treasure_chest",
      },
      {
        spriteId: "spr_coin",
        name: "星星金币",
        costumeAssetId: "obj_star_coin",
      },
    ],
    scripts: [],
    workspaceStates: {},
    assets: [
      {
        assetId: "costume_liji_idle",
        type: "sprite",
        path: "characters/liji/liji-idle.png",
      },
      {
        assetId: "obj_treasure_chest",
        type: "sprite",
        path: "objects/treasure-chest.png",
      },
      {
        assetId: "obj_star_coin",
        type: "sprite",
        path: "objects/star-coin.png",
      },
      {
        assetId: "bg_forest_01",
        type: "background",
        path: "backgrounds/forest-960x720.webp",
      },
      {
        assetId: "bg_classroom_01",
        type: "background",
        path: "backgrounds/classroom-960x720.webp",
      },
      {
        assetId: "sfx_ui_click",
        type: "audio",
        path: "sounds/ui-click.wav",
      },
      {
        assetId: "sfx_collect_coin",
        type: "audio",
        path: "sounds/collect-coin.wav",
      },
      {
        assetId: "sfx_game_success",
        type: "audio",
        path: "sounds/game-success.wav",
      },
      {
        assetId: "sfx_jump",
        type: "audio",
        path: "sounds/jump.wav",
      },
      {
        assetId: "sfx_bump",
        type: "audio",
        path: "sounds/bump.wav",
      },
      {
        assetId: "sfx_door_open",
        type: "audio",
        path: "sounds/door-open.wav",
      },
      {
        assetId: "sfx_magic",
        type: "audio",
        path: "sounds/magic.wav",
      },
      {
        assetId: "sfx_pop",
        type: "audio",
        path: "sounds/pop.wav",
      },
      {
        assetId: "sfx_whoosh",
        type: "audio",
        path: "sounds/whoosh.wav",
      },
      {
        assetId: "sfx_bell",
        type: "audio",
        path: "sounds/bell.wav",
      },
      {
        assetId: "sfx_drum",
        type: "audio",
        path: "sounds/drum.wav",
      },
      {
        assetId: "sfx_splash",
        type: "audio",
        path: "sounds/splash.wav",
      },
      {
        assetId: "sfx_sparkle",
        type: "audio",
        path: "sounds/sparkle.wav",
      },
      {
        assetId: "sfx_countdown",
        type: "audio",
        path: "sounds/countdown.wav",
      },
      {
        assetId: "sfx_game_over",
        type: "audio",
        path: "sounds/game-over.wav",
      },
    ],
    messages: [],
    variables: [],
  };
}
