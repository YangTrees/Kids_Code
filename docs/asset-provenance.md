# 内置素材溯源清单

本文件记录编辑器素材库中的资源（设计说明书 10.2.1、附录 F.3）；课程和首页专用插图另见 `apps/web/public/assets/asset-manifest.json` 的 `ui` 条目。
每个内置素材都必须携带来源、许可证与审查状态；未通过商业授权审查的素材不得进入正式发行版。

编辑器素材库总计 49 项（17 个角色/道具造型、17 张背景、15 个声音）；manifest 另登记 21 项 UI 插图。

2026-10-17 已依据 [原系列 IP 与素材规范](ip-reference-and-asset-spec.md) 注册 26 张系列图：首批最小包及先导变体 19 张（库内八项、UI 十一项），另新增 AS-09 七张单元封面（UI）。全部由内置 image_gen 基于用户角色板或风格参考生成；原图、完整提示词、透明边界和文件尺寸见 [素材台账](baselines/story-ip-assets.json)。团团为小男孩、点点为云朵机器人，使用独立 ID；经典素材、参考源和母版保留。当前教学覆盖全部 64 关，验收范围见 [执行记录](p1-execution-log.md) 第 9 节。全部系列图仍仅获内部原型审查，不代表商用发行许可。

以下列出先导六项，后续补齐的 13 项 ID、路径和来源全部登记在素材台账及 manifest 的 provenanceGroups 中；未列进此摘要表不代表未登记。

| 新资源 ID                       | 名称     | 用途          | 来源                          | 许可证             | 商用审查 | 审查状态           |
| ------------------------------- | -------- | ------------- | ----------------------------- | ------------------ | -------- | ------------------ |
| costume_story_tuantuan_idle_v1  | 团团正面 | 舞台 / 素材库 | 用户角色板参考生成            | internal-prototype | pending  | approved-prototype |
| costume_story_tuantuan_right_v1 | 团团朝右 | 舞台 / 素材库 | 用户角色板与首张立绘参考生成  | internal-prototype | pending  | approved-prototype |
| costume_story_diandian_idle_v1  | 点点默认 | 舞台 / 素材库 | 用户角色板与提示像参考生成    | internal-prototype | pending  | approved-prototype |
| obj_story_treasure_chest_v1     | 绘本宝箱 | 舞台 / 素材库 | 团团角色板的画风参考生成      | internal-prototype | pending  | approved-prototype |
| bg_story_garden_v1              | 绘本花园 | 舞台 / 素材库 | Lesson10 关键帧的画风参考生成 | internal-prototype | pending  | approved-prototype |
| ui_story_diandian_hint_v1       | 点点提示 | UI / 素材验收 | 用户角色板参考生成            | internal-prototype | pending  | approved-prototype |

| 资源 ID                 | 名称       | 类型        | 来源        | 许可证               | 商用审查 | 审查状态           | 可下架 |
| ----------------------- | ---------- | ----------- | ----------- | -------------------- | -------- | ------------------ | ------ |
| `costume_liji_idle`     | 栗奇       | 角色 / 物件 | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `obj_treasure_chest`    | 宝箱       | 角色 / 物件 | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `obj_star_coin`         | 星星金币   | 角色 / 物件 | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `costume_tuantuan_idle` | 团团       | 角色 / 物件 | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `costume_diandian_idle` | 点点       | 角色 / 物件 | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `costume_xiaoyong_idle` | 小勇       | 角色 / 物件 | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `costume_feifei_idle`   | 飞飞       | 角色 / 物件 | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `vehicle_race_car`      | 闪电赛车   | 角色 / 物件 | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `vehicle_rocket`        | 探索火箭   | 角色 / 物件 | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `object_magic_door`     | 魔法门     | 角色 / 物件 | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `object_road_cone`      | 路障       | 角色 / 物件 | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `object_bouncy_ball`    | 彩色球     | 角色 / 物件 | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `bg_forest_01`          | 阳光森林   | 背景        | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `bg_classroom_01`       | 欢乐教室   | 背景        | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `bg_space_01`           | 星际探险   | 背景        | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `bg_ocean_01`           | 海底花园   | 背景        | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `bg_city_01`            | 阳光城市   | 背景        | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `bg_playroom_01`        | 温馨游戏房 | 背景        | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `bg_castle_01`          | 童话城堡   | 背景        | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `bg_farm_01`            | 快乐农场   | 背景        | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `bg_desert_01`          | 沙漠绿洲   | 背景        | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `bg_snow_01`            | 冰雪山谷   | 背景        | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `bg_sky_islands_map`    | 云岛地图   | 背景        | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `bg_data_discovery_lab` | 数据发现室 | 背景        | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `bg_pattern_garden`     | 规律活动台 | 背景        | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `bg_decision_workshop`  | 判断工坊   | 背景        | AI 生成     | `internal-prototype` | pending  | approved-prototype | 是     |
| `sfx_ui_click`          | 按钮声     | 音效        | 自有 / 自研 | `project-owned`      | pending  | approved-prototype | 是     |
| `sfx_collect_coin`      | 收集金币   | 音效        | 自有 / 自研 | `project-owned`      | pending  | approved-prototype | 是     |
| `sfx_game_success`      | 闯关成功   | 音效        | 自有 / 自研 | `project-owned`      | pending  | approved-prototype | 是     |
| `sfx_jump`              | 跳跃       | 音效        | 自有 / 自研 | `project-owned`      | approved | approved-release   | 是     |
| `sfx_bump`              | 碰撞       | 音效        | 自有 / 自研 | `project-owned`      | approved | approved-release   | 是     |
| `sfx_door_open`         | 开门       | 音效        | 自有 / 自研 | `project-owned`      | approved | approved-release   | 是     |
| `sfx_magic`             | 魔法       | 音效        | 自有 / 自研 | `project-owned`      | approved | approved-release   | 是     |
| `sfx_pop`               | 弹出       | 音效        | 自有 / 自研 | `project-owned`      | approved | approved-release   | 是     |
| `sfx_whoosh`            | 飞过       | 音效        | 自有 / 自研 | `project-owned`      | approved | approved-release   | 是     |
| `sfx_bell`              | 铃铛       | 音效        | 自有 / 自研 | `project-owned`      | approved | approved-release   | 是     |
| `sfx_drum`              | 鼓点       | 音效        | 自有 / 自研 | `project-owned`      | approved | approved-release   | 是     |
| `sfx_splash`            | 水花       | 音效        | 自有 / 自研 | `project-owned`      | approved | approved-release   | 是     |
| `sfx_sparkle`           | 闪光       | 音效        | 自有 / 自研 | `project-owned`      | approved | approved-release   | 是     |
| `sfx_countdown`         | 倒计时     | 音效        | 自有 / 自研 | `project-owned`      | approved | approved-release   | 是     |
| `sfx_game_over`         | 挑战结束   | 音效        | 自有 / 自研 | `project-owned`      | approved | approved-release   | 是     |

## 说明

- `internal-prototype`：生成式形象与场景素材，仅限内部原型，商业使用前需完成授权审查。
- `project-owned`：自研脚本生成的音效；12 项已通过商用审查，3 项首批原型待审。
- `user-upload-local`：儿童在本机上传或录制的素材，不随应用分发，也不参与商业授权。
- 资源 ID 一经发布不得复用或改变语义；文件更新通过 manifest 版本与哈希记录。
- 下架素材通过 `canUnpublish` 替换为占位素材，旧项目仍按原 ID 解析。
