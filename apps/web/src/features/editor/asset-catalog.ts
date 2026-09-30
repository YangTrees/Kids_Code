/**
 * 内置素材目录。
 *
 * 约束（设计说明书 10.2.1）：每个内置素材必须携带 provenance 溯源信息；
 * 业务数据只能通过稳定 assetId 引用素材，不得依赖显示名称或文件名。
 */

export type AssetProvenanceSourceType =
  "self" | "ai-generated" | "third-party-open-source" | "licensed";

export type AssetProvenanceReviewStatus =
  "draft" | "approved-prototype" | "approved-release" | "retired";

export interface AssetProvenance {
  sourceType: AssetProvenanceSourceType;
  /** 仅第三方开源素材：owner/repo */
  sourceRepo?: string;
  /** 固定到仓库内文件路径 */
  sourcePath?: string;
  /** 取得时的 commit SHA 或 release tag */
  sourceCommit?: string;
  /** SPDX 标识或合同/授权编号 */
  license: string;
  /** 发行版 NOTICE 中的署名文本 */
  attribution?: string;
  commercialUseReview: "pending" | "approved" | "rejected";
  reviewStatus: AssetProvenanceReviewStatus;
  canUnpublish: boolean;
}

export interface LibraryAssetBase {
  assetId: string;
  name: string;
  path: string;
  provenance: AssetProvenance;
}

export interface SpriteLibraryAsset extends LibraryAssetBase {
  scale: number;
}

export type BackgroundLibraryAsset = LibraryAssetBase;

export interface SoundLibraryAsset extends LibraryAssetBase {
  /** 试听与展示用的分类标签 */
  group: "交互" | "动作" | "反馈";
}

/** 自研脚本生成的音效：已通过商用审查，可进入正式发行版。 */
const inHouseGenerated = (sourcePath: string): AssetProvenance => ({
  sourceType: "self",
  sourcePath,
  license: "project-owned",
  commercialUseReview: "approved",
  reviewStatus: "approved-release",
  canUnpublish: true,
});

/** 首批手作原型音效：商用授权待审。 */
const inHousePrototype = (sourcePath: string): AssetProvenance => ({
  sourceType: "self",
  sourcePath,
  license: "project-owned",
  commercialUseReview: "pending",
  reviewStatus: "approved-prototype",
  canUnpublish: true,
});

/** 启动包中的生成式素材：来源已登记，商用授权待审。 */
const generated = (sourcePath: string): AssetProvenance => ({
  sourceType: "ai-generated",
  sourcePath,
  license: "internal-prototype",
  commercialUseReview: "pending",
  reviewStatus: "approved-prototype",
  canUnpublish: true,
});

export const spriteLibrary: SpriteLibraryAsset[] = [
  {
    assetId: "costume_liji_idle",
    name: "栗奇",
    path: "characters/liji/liji-idle.png",
    scale: 1,
    provenance: generated(
      "kids-code-minimal-assets/characters/liji/liji-idle.png",
    ),
  },
  {
    assetId: "obj_treasure_chest",
    name: "宝箱",
    path: "objects/treasure-chest.png",
    scale: 1,
    provenance: generated(
      "kids-code-minimal-assets/objects/treasure-chest.png",
    ),
  },
  {
    assetId: "obj_star_coin",
    name: "星星金币",
    path: "objects/star-coin.png",
    scale: 1,
    provenance: generated("kids-code-minimal-assets/objects/star-coin.png"),
  },
  {
    assetId: "costume_tuantuan_idle",
    name: "团团",
    path: "characters/tuantuan/tuantuan-idle.png",
    scale: 1,
    provenance: generated(
      "kids-code-minimal-assets/characters/tuantuan/tuantuan-idle.png",
    ),
  },
  {
    assetId: "costume_diandian_idle",
    name: "点点",
    path: "characters/diandian/diandian-idle.png",
    scale: 1,
    provenance: generated(
      "kids-code-minimal-assets/characters/diandian/diandian-idle.png",
    ),
  },
  {
    assetId: "costume_xiaoyong_idle",
    name: "小勇",
    path: "characters/xiaoyong/xiaoyong-idle.png",
    scale: 1,
    provenance: generated(
      "kids-code-minimal-assets/characters/xiaoyong/xiaoyong-idle.png",
    ),
  },
  {
    assetId: "costume_feifei_idle",
    name: "飞飞",
    path: "characters/feifei/feifei-idle.png",
    scale: 1,
    provenance: generated(
      "kids-code-minimal-assets/characters/feifei/feifei-idle.png",
    ),
  },
  {
    assetId: "vehicle_race_car",
    name: "闪电赛车",
    path: "vehicles/race-car.png",
    scale: 1,
    provenance: generated("kids-code-minimal-assets/vehicles/race-car.png"),
  },
  {
    assetId: "vehicle_rocket",
    name: "探索火箭",
    path: "vehicles/rocket.png",
    scale: 1,
    provenance: generated("kids-code-minimal-assets/vehicles/rocket.png"),
  },
  {
    assetId: "object_magic_door",
    name: "魔法门",
    path: "objects/magic-door.png",
    scale: 1,
    provenance: generated("kids-code-minimal-assets/objects/magic-door.png"),
  },
  {
    assetId: "object_road_cone",
    name: "路障",
    path: "objects/road-cone.png",
    scale: 1,
    provenance: generated("kids-code-minimal-assets/objects/road-cone.png"),
  },
  {
    assetId: "object_bouncy_ball",
    name: "彩色球",
    path: "objects/bouncy-ball.png",
    scale: 1,
    provenance: generated("kids-code-minimal-assets/objects/bouncy-ball.png"),
  },
];

export const backgroundLibrary: BackgroundLibraryAsset[] = [
  {
    assetId: "bg_forest_01",
    name: "阳光森林",
    path: "backgrounds/forest-960x720.webp",
    provenance: generated(
      "kids-code-minimal-assets/backgrounds/forest-960x720.webp",
    ),
  },
  {
    assetId: "bg_classroom_01",
    name: "欢乐教室",
    path: "backgrounds/classroom-960x720.webp",
    provenance: generated(
      "kids-code-minimal-assets/backgrounds/classroom-960x720.webp",
    ),
  },
  {
    assetId: "bg_space_01",
    name: "星际探险",
    path: "backgrounds/space-960x720.webp",
    provenance: generated(
      "kids-code-minimal-assets/backgrounds/space-960x720.webp",
    ),
  },
  {
    assetId: "bg_ocean_01",
    name: "海底花园",
    path: "backgrounds/ocean-960x720.webp",
    provenance: generated(
      "kids-code-minimal-assets/backgrounds/ocean-960x720.webp",
    ),
  },
  {
    assetId: "bg_city_01",
    name: "阳光城市",
    path: "backgrounds/city-960x720.webp",
    provenance: generated(
      "kids-code-minimal-assets/backgrounds/city-960x720.webp",
    ),
  },
  {
    assetId: "bg_playroom_01",
    name: "温馨游戏房",
    path: "backgrounds/playroom-960x720.webp",
    provenance: generated(
      "kids-code-minimal-assets/backgrounds/playroom-960x720.webp",
    ),
  },
  {
    assetId: "bg_castle_01",
    name: "童话城堡",
    path: "backgrounds/castle-960x720.webp",
    provenance: generated(
      "kids-code-minimal-assets/backgrounds/castle-960x720.webp",
    ),
  },
  {
    assetId: "bg_farm_01",
    name: "快乐农场",
    path: "backgrounds/farm-960x720.webp",
    provenance: generated(
      "kids-code-minimal-assets/backgrounds/farm-960x720.webp",
    ),
  },
  {
    assetId: "bg_desert_01",
    name: "沙漠绿洲",
    path: "backgrounds/desert-960x720.webp",
    provenance: generated(
      "kids-code-minimal-assets/backgrounds/desert-960x720.webp",
    ),
  },
  {
    assetId: "bg_snow_01",
    name: "冰雪山谷",
    path: "backgrounds/snow-960x720.webp",
    provenance: generated(
      "kids-code-minimal-assets/backgrounds/snow-960x720.webp",
    ),
  },
];

/** 内置音效（附录 B 要求 ≥15 项）。 */
export const soundLibrary: SoundLibraryAsset[] = [
  {
    assetId: "sfx_ui_click",
    name: "按钮声",
    path: "sounds/ui-click.wav",
    group: "交互",
    provenance: inHousePrototype(
      "kids-code-minimal-assets/sounds/ui-click.wav",
    ),
  },
  {
    assetId: "sfx_collect_coin",
    name: "收集金币",
    path: "sounds/collect-coin.wav",
    group: "反馈",
    provenance: inHousePrototype(
      "kids-code-minimal-assets/sounds/collect-coin.wav",
    ),
  },
  {
    assetId: "sfx_game_success",
    name: "闯关成功",
    path: "sounds/game-success.wav",
    group: "反馈",
    provenance: inHousePrototype(
      "kids-code-minimal-assets/sounds/game-success.wav",
    ),
  },
  {
    assetId: "sfx_jump",
    name: "跳跃",
    path: "sounds/jump.wav",
    group: "动作",
    provenance: inHouseGenerated("kids-code-minimal-assets/sounds/jump.wav"),
  },
  {
    assetId: "sfx_bump",
    name: "碰撞",
    path: "sounds/bump.wav",
    group: "动作",
    provenance: inHouseGenerated("kids-code-minimal-assets/sounds/bump.wav"),
  },
  {
    assetId: "sfx_door_open",
    name: "开门",
    path: "sounds/door-open.wav",
    group: "动作",
    provenance: inHouseGenerated(
      "kids-code-minimal-assets/sounds/door-open.wav",
    ),
  },
  {
    assetId: "sfx_magic",
    name: "魔法",
    path: "sounds/magic.wav",
    group: "动作",
    provenance: inHouseGenerated("kids-code-minimal-assets/sounds/magic.wav"),
  },
  {
    assetId: "sfx_pop",
    name: "弹出",
    path: "sounds/pop.wav",
    group: "交互",
    provenance: inHouseGenerated("kids-code-minimal-assets/sounds/pop.wav"),
  },
  {
    assetId: "sfx_whoosh",
    name: "飞过",
    path: "sounds/whoosh.wav",
    group: "动作",
    provenance: inHouseGenerated("kids-code-minimal-assets/sounds/whoosh.wav"),
  },
  {
    assetId: "sfx_bell",
    name: "铃铛",
    path: "sounds/bell.wav",
    group: "反馈",
    provenance: inHouseGenerated("kids-code-minimal-assets/sounds/bell.wav"),
  },
  {
    assetId: "sfx_drum",
    name: "鼓点",
    path: "sounds/drum.wav",
    group: "反馈",
    provenance: inHouseGenerated("kids-code-minimal-assets/sounds/drum.wav"),
  },
  {
    assetId: "sfx_splash",
    name: "水花",
    path: "sounds/splash.wav",
    group: "动作",
    provenance: inHouseGenerated("kids-code-minimal-assets/sounds/splash.wav"),
  },
  {
    assetId: "sfx_sparkle",
    name: "闪光",
    path: "sounds/sparkle.wav",
    group: "反馈",
    provenance: inHouseGenerated("kids-code-minimal-assets/sounds/sparkle.wav"),
  },
  {
    assetId: "sfx_countdown",
    name: "倒计时",
    path: "sounds/countdown.wav",
    group: "交互",
    provenance: inHouseGenerated(
      "kids-code-minimal-assets/sounds/countdown.wav",
    ),
  },
  {
    assetId: "sfx_game_over",
    name: "挑战结束",
    path: "sounds/game-over.wav",
    group: "反馈",
    provenance: inHouseGenerated(
      "kids-code-minimal-assets/sounds/game-over.wav",
    ),
  },
];

/** 儿童自己上传或录制的素材：仅留在本机，未经商业授权审查。 */
export const localUploadProvenance = (sourcePath: string): AssetProvenance => ({
  sourceType: "self",
  sourcePath,
  license: "user-upload-local",
  commercialUseReview: "rejected",
  reviewStatus: "draft",
  canUnpublish: true,
});

export const builtInSoundNames: Record<string, string> = Object.fromEntries(
  soundLibrary.map((sound) => [sound.assetId, sound.name]),
);

/** 遍历全部内置素材，供溯源校验与清单导出使用。 */
export function* allLibraryAssets(): Generator<
  LibraryAssetBase & { kind: "sprite" | "background" | "audio" }
> {
  for (const asset of spriteLibrary)
    yield { ...asset, kind: "sprite" as const };
  for (const asset of backgroundLibrary)
    yield { ...asset, kind: "background" as const };
  for (const asset of soundLibrary) yield { ...asset, kind: "audio" as const };
}
