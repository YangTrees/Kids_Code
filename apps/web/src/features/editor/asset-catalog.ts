export interface SpriteLibraryAsset {
  assetId: string;
  name: string;
  path: string;
  scale: number;
}

export interface BackgroundLibraryAsset {
  assetId: string;
  name: string;
  path: string;
}

export const spriteLibrary: SpriteLibraryAsset[] = [
  {
    assetId: "costume_liji_idle",
    name: "栗奇",
    path: "characters/liji/liji-idle.png",
    scale: 1,
  },
  {
    assetId: "obj_treasure_chest",
    name: "宝箱",
    path: "objects/treasure-chest.png",
    scale: 1,
  },
  {
    assetId: "obj_star_coin",
    name: "星星金币",
    path: "objects/star-coin.png",
    scale: 1,
  },
  {
    assetId: "costume_tuantuan_idle",
    name: "团团",
    path: "characters/tuantuan/tuantuan-idle.png",
    scale: 1,
  },
  {
    assetId: "costume_diandian_idle",
    name: "点点",
    path: "characters/diandian/diandian-idle.png",
    scale: 1,
  },
  {
    assetId: "costume_xiaoyong_idle",
    name: "小勇",
    path: "characters/xiaoyong/xiaoyong-idle.png",
    scale: 1,
  },
  {
    assetId: "costume_feifei_idle",
    name: "飞飞",
    path: "characters/feifei/feifei-idle.png",
    scale: 1,
  },
  {
    assetId: "vehicle_race_car",
    name: "闪电赛车",
    path: "vehicles/race-car.png",
    scale: 1,
  },
  {
    assetId: "vehicle_rocket",
    name: "探索火箭",
    path: "vehicles/rocket.png",
    scale: 1,
  },
  {
    assetId: "object_magic_door",
    name: "魔法门",
    path: "objects/magic-door.png",
    scale: 1,
  },
  {
    assetId: "object_road_cone",
    name: "路障",
    path: "objects/road-cone.png",
    scale: 1,
  },
  {
    assetId: "object_bouncy_ball",
    name: "彩色球",
    path: "objects/bouncy-ball.png",
    scale: 1,
  },
];

export const backgroundLibrary: BackgroundLibraryAsset[] = [
  {
    assetId: "bg_forest_01",
    name: "阳光森林",
    path: "backgrounds/forest-960x720.webp",
  },
  {
    assetId: "bg_classroom_01",
    name: "欢乐教室",
    path: "backgrounds/classroom-960x720.webp",
  },
  {
    assetId: "bg_space_01",
    name: "星际探险",
    path: "backgrounds/space-960x720.webp",
  },
  {
    assetId: "bg_ocean_01",
    name: "海底花园",
    path: "backgrounds/ocean-960x720.webp",
  },
  {
    assetId: "bg_city_01",
    name: "阳光城市",
    path: "backgrounds/city-960x720.webp",
  },
  {
    assetId: "bg_playroom_01",
    name: "温馨游戏房",
    path: "backgrounds/playroom-960x720.webp",
  },
  {
    assetId: "bg_castle_01",
    name: "童话城堡",
    path: "backgrounds/castle-960x720.webp",
  },
  {
    assetId: "bg_farm_01",
    name: "快乐农场",
    path: "backgrounds/farm-960x720.webp",
  },
  {
    assetId: "bg_desert_01",
    name: "沙漠绿洲",
    path: "backgrounds/desert-960x720.webp",
  },
  {
    assetId: "bg_snow_01",
    name: "冰雪山谷",
    path: "backgrounds/snow-960x720.webp",
  },
];
