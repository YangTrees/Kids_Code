import { createDefaultProject, type Project } from "@kids-code/domain";

export type ProjectMode =
  "blank" | "treasure-template" | "coin-template" | "dialogue-template";

const treasureWorkspaceStates = {
  spr_liji: {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "event_whenflagclicked",
          id: "template_flag_liji",
          x: 80,
          y: 60,
          next: {
            block: {
              type: "looks_sayforsecs",
              id: "template_intro_liji",
              inputs: {
                MESSAGE: {
                  shadow: {
                    type: "text",
                    fields: { TEXT: "用方向键走到宝箱！" },
                  },
                },
                SECS: { shadow: { type: "math_number", fields: { NUM: 2 } } },
              },
            },
          },
        },
        ...[
          ["right arrow", "motion_movesteps"],
          ["left arrow", "kids_move_left"],
          ["up arrow", "kids_move_up"],
          ["down arrow", "kids_move_down"],
        ].map(([key, type], index) => ({
          type: "event_whenkeypressed",
          id: `treasure_key_${index}`,
          x: index % 2 === 0 ? 70 : 330,
          y: 230 + Math.floor(index / 2) * 150,
          fields: { KEY_OPTION: key },
          next: {
            block: {
              type,
              id: `treasure_move_${index}`,
              inputs: {
                STEPS: { shadow: { type: "math_number", fields: { NUM: 1 } } },
              },
            },
          },
        })),
        {
          type: "kids_when_touching",
          id: "treasure_touch",
          x: 70,
          y: 560,
          fields: { TARGET: "spr_box" },
          next: {
            block: {
              type: "sound_play",
              id: "treasure_sound",
              inputs: {
                SOUND_MENU: {
                  shadow: {
                    type: "kids_sound_menu",
                    fields: { SOUND_MENU: "sfx_game_success" },
                  },
                },
              },
              next: {
                block: {
                  type: "kids_result",
                  id: "treasure_win",
                  fields: { RESULT: "success", MESSAGE: "你找到宝箱啦！" },
                },
              },
            },
          },
        },
      ],
    },
  },
  spr_coin: {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "event_whenthisspriteclicked",
          id: "template_click_coin",
          x: 80,
          y: 60,
          next: {
            block: {
              type: "kids_score_change",
              id: "template_score_coin",
              inputs: {
                DELTA: {
                  shadow: {
                    type: "math_number",
                    id: "template_delta_coin",
                    fields: { NUM: 1 },
                  },
                },
              },
              next: {
                block: {
                  type: "sound_play",
                  id: "template_sound_coin",
                  inputs: {
                    SOUND_MENU: {
                      shadow: {
                        type: "kids_sound_menu",
                        id: "template_sound_menu_coin",
                        fields: { SOUND_MENU: "sfx_collect_coin" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    },
  },
};

const coinWorkspaceStates = {
  spr_liji: {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "event_whenflagclicked",
          id: "coin_flag_liji",
          x: 70,
          y: 50,
          next: {
            block: {
              type: "kids_score_set",
              id: "coin_score_reset",
              inputs: {
                VALUE: {
                  shadow: {
                    type: "math_number",
                    id: "coin_score_zero",
                    fields: { NUM: 0 },
                  },
                },
              },
              next: {
                block: {
                  type: "looks_sayforsecs",
                  id: "coin_intro",
                  inputs: {
                    MESSAGE: {
                      shadow: {
                        type: "text",
                        id: "coin_intro_text",
                        fields: { TEXT: "点击星星金币，收集宝藏吧！" },
                      },
                    },
                    SECS: {
                      shadow: {
                        type: "math_number",
                        id: "coin_intro_secs",
                        fields: { NUM: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    },
  },
  spr_coin: {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "event_whenthisspriteclicked",
          id: "coin_click",
          x: 70,
          y: 50,
          next: {
            block: {
              type: "kids_score_change",
              id: "coin_add_score",
              inputs: {
                DELTA: {
                  shadow: {
                    type: "math_number",
                    id: "coin_add_one",
                    fields: { NUM: 1 },
                  },
                },
              },
              next: {
                block: {
                  type: "sound_play",
                  id: "coin_collect_sound",
                  inputs: {
                    SOUND_MENU: {
                      shadow: {
                        type: "kids_sound_menu",
                        id: "coin_collect_menu",
                        fields: { SOUND_MENU: "sfx_collect_coin" },
                      },
                    },
                  },
                  next: {
                    block: {
                      type: "looks_hide",
                      id: "coin_hide",
                      next: {
                        block: {
                          type: "kids_result",
                          id: "coin_success",
                          fields: {
                            RESULT: "success",
                            MESSAGE: "成功收集星星金币！",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    },
  },
};

const dialogueWorkspaceStates = {
  spr_liji: {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "event_whenflagclicked",
          id: "story_flag_liji",
          x: 70,
          y: 50,
          next: {
            block: {
              type: "looks_sayforsecs",
              id: "story_liji_say",
              inputs: {
                MESSAGE: {
                  shadow: {
                    type: "text",
                    id: "story_liji_text",
                    fields: { TEXT: "你好！我们一起讲个故事吧。" },
                  },
                },
                SECS: {
                  shadow: {
                    type: "math_number",
                    id: "story_liji_secs",
                    fields: { NUM: 2 },
                  },
                },
              },
              next: {
                block: {
                  type: "kids_broadcast",
                  id: "story_broadcast",
                  fields: { MESSAGE: "找到宝箱" },
                },
              },
            },
          },
        },
      ],
    },
  },
  spr_box: {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: "kids_when_message",
          id: "story_receive",
          x: 70,
          y: 50,
          fields: { MESSAGE: "找到宝箱" },
          next: {
            block: {
              type: "looks_sayforsecs",
              id: "story_friend_say",
              inputs: {
                MESSAGE: {
                  shadow: {
                    type: "text",
                    id: "story_friend_text",
                    fields: { TEXT: "好呀！今天我们发现了闪亮宝箱！" },
                  },
                },
                SECS: {
                  shadow: {
                    type: "math_number",
                    id: "story_friend_secs",
                    fields: { NUM: 2 },
                  },
                },
              },
              next: {
                block: {
                  type: "kids_result",
                  id: "story_success",
                  fields: { RESULT: "success", MESSAGE: "故事讲完啦！" },
                },
              },
            },
          },
        },
      ],
    },
  },
};

export function createProjectForMode(
  mode: ProjectMode,
  suffix = crypto.randomUUID().slice(0, 8),
  now = new Date(),
): Project {
  const project = createDefaultProject(now);
  const firstSprite = project.sprites[0]!;
  const base = {
    ...project,
    projectId: `prj_${suffix}`,
    name:
      mode === "blank"
        ? "我的新作品"
        : mode === "coin-template"
          ? "星星金币大收集"
          : mode === "dialogue-template"
            ? "栗奇的对话故事"
            : "栗奇寻找宝箱",
  };

  if (mode === "treasure-template") {
    return { ...base, workspaceStates: treasureWorkspaceStates };
  }

  if (mode === "coin-template") {
    return {
      ...base,
      sprites: base.sprites.filter((sprite) => sprite.spriteId !== "spr_box"),
      scenes: base.scenes.map((scene) => ({
        ...scene,
        instances: scene.instances.filter(
          (instance) => instance.spriteId !== "spr_box",
        ),
      })),
      workspaceStates: coinWorkspaceStates,
    };
  }

  if (mode === "dialogue-template") {
    return {
      ...base,
      sprites: base.sprites
        .filter((sprite) => sprite.spriteId !== "spr_coin")
        .map((sprite) =>
          sprite.spriteId === "spr_box"
            ? { ...sprite, name: "宝箱伙伴" }
            : sprite,
        ),
      scenes: base.scenes.map((scene) => ({
        ...scene,
        name: "故事教室",
        backdropAssetId: "bg_classroom_01",
        instances: scene.instances.filter(
          (instance) => instance.spriteId !== "spr_coin",
        ),
      })),
      workspaceStates: dialogueWorkspaceStates,
    };
  }

  return {
    ...base,
    sprites: [firstSprite],
    scenes: base.scenes.map((scene) => ({
      ...scene,
      instances: scene.instances.filter(
        (instance) => instance.spriteId === firstSprite.spriteId,
      ),
    })),
    scripts: [],
    workspaceStates: {},
  };
}

export function duplicateProject(
  project: Project,
  suffix = crypto.randomUUID().slice(0, 8),
  now = new Date(),
): Project {
  const timestamp = now.toISOString();
  return {
    ...project,
    projectId: `prj_${suffix}`,
    name: `${project.name} 副本`.slice(0, 30),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
