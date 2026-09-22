import { describe, expect, it } from "vitest";
import { projectSchema } from "@kids-code/domain";
import { compileSerializedWorkspace } from "@kids-code/block-adapter";
import { createProjectForMode, duplicateProject } from "./project-factory";

describe("project factory", () => {
  it("creates a minimal blank project", () => {
    const project = createProjectForMode(
      "blank",
      "blank001",
      new Date("2026-08-09T00:00:00.000Z"),
    );
    expect(projectSchema.safeParse(project).success).toBe(true);
    expect(project.projectId).toBe("prj_blank001");
    expect(project.sprites).toHaveLength(1);
    expect(project.scenes[0]?.instances).toHaveLength(1);
  });

  it("keeps the treasure template cast and layout", () => {
    const project = createProjectForMode("treasure-template", "template1");
    expect(project.sprites.map((sprite) => sprite.name)).toEqual([
      "栗奇",
      "宝箱",
      "星星金币",
    ]);
    expect(project.scenes[0]?.instances).toHaveLength(3);
    const lijiScripts = compileSerializedWorkspace(
      "spr_liji",
      project.workspaceStates.spr_liji as object,
    );
    const coinScripts = compileSerializedWorkspace(
      "spr_coin",
      project.workspaceStates.spr_coin as object,
    );
    expect(lijiScripts[0]?.blocks.map((block) => block.type)).toEqual([
      "EVT_FLAG",
      "LOOK_SAY",
    ]);
    expect(
      lijiScripts.filter((script) => script.blocks[0]?.type === "EVT_KEY"),
    ).toHaveLength(4);
    expect(
      lijiScripts
        .find((script) => script.blocks[0]?.type === "EVT_TOUCH")
        ?.blocks.map((block) => block.type),
    ).toEqual(["EVT_TOUCH", "SND_PLAY", "GAME_RESULT"]);
    expect(coinScripts[0]?.blocks.map((block) => block.type)).toEqual([
      "EVT_SPRITE_CLICK",
      "GAME_CHANGE_SCORE",
      "SND_PLAY",
    ]);
  });

  it("creates a playable coin collection template", () => {
    const project = createProjectForMode("coin-template", "coins001");
    expect(projectSchema.safeParse(project).success).toBe(true);
    expect(project.name).toBe("星星金币大收集");
    expect(project.sprites.map((sprite) => sprite.spriteId)).toEqual([
      "spr_liji",
      "spr_coin",
    ]);
    const coinScripts = compileSerializedWorkspace(
      "spr_coin",
      project.workspaceStates.spr_coin as object,
    );
    expect(coinScripts[0]?.blocks.map((block) => block.type)).toEqual([
      "EVT_SPRITE_CLICK",
      "GAME_CHANGE_SCORE",
      "SND_PLAY",
      "LOOK_HIDE",
      "GAME_RESULT",
    ]);
  });

  it("creates a two-character broadcast dialogue template", () => {
    const project = createProjectForMode("dialogue-template", "story001");
    expect(projectSchema.safeParse(project).success).toBe(true);
    expect(project.scenes[0]?.backdropAssetId).toBe("bg_classroom_01");
    expect(project.sprites.map((sprite) => sprite.name)).toEqual([
      "栗奇",
      "宝箱伙伴",
    ]);
    const sender = compileSerializedWorkspace(
      "spr_liji",
      project.workspaceStates.spr_liji as object,
    );
    const receiver = compileSerializedWorkspace(
      "spr_box",
      project.workspaceStates.spr_box as object,
    );
    expect(sender[0]?.blocks.map((block) => block.type)).toEqual([
      "EVT_FLAG",
      "LOOK_SAY",
      "EVT_BROADCAST",
    ]);
    expect(receiver[0]?.blocks.map((block) => block.type)).toEqual([
      "EVT_MESSAGE",
      "LOOK_SAY",
      "GAME_RESULT",
    ]);
  });

  it("duplicates a project with a new identity", () => {
    const source = createProjectForMode("blank", "source01");
    const copy = duplicateProject(
      source,
      "copy0001",
      new Date("2026-08-09T02:00:00.000Z"),
    );
    expect(copy.projectId).toBe("prj_copy0001");
    expect(copy.name).toBe("我的新作品 副本");
    expect(copy.createdAt).toBe("2026-08-09T02:00:00.000Z");
    expect(copy.sprites).toEqual(source.sprites);
  });
});
