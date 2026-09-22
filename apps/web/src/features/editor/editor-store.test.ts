import { describe, expect, it } from "vitest";
import { createDefaultProject } from "@kids-code/domain";
import {
  countSpriteReferences,
  countWorkspaceBlocks,
  useEditorStore,
} from "./editor-store";
import { backgroundLibrary, spriteLibrary } from "./asset-catalog";

describe("editor store", () => {
  it("offers the minimum twelve built-in sprite choices", () => {
    expect(spriteLibrary).toHaveLength(12);
    expect(new Set(spriteLibrary.map((asset) => asset.assetId)).size).toBe(12);
    expect(backgroundLibrary).toHaveLength(10);
  });

  it("creates a project variable and ignores duplicate names", () => {
    const state = useEditorStore.getState();
    state.hydrateProject(createDefaultProject());
    state.addVariable("能量");
    state.addVariable("能量");

    expect(useEditorStore.getState().project.variables).toMatchObject([
      { name: "能量", initialValue: 0, visible: true },
    ]);
    expect(useEditorStore.getState().project.variables[0]?.variableId).toMatch(
      /^var_/,
    );
  });

  it("keeps browser adapters outside persistent editor state", () => {
    const state = useEditorStore.getState();
    expect(state.project.projectId).toBe("prj_demo_001");
    expect("workspace" in state).toBe(false);
    expect("stage" in state).toBe(false);
  });

  it("stores Blockly snapshots with the selected sprite", () => {
    const state = useEditorStore.getState();
    state.hydrateProject(createDefaultProject());
    state.setWorkspaceState("spr_liji", { blocks: { blocks: [] } });

    expect(useEditorStore.getState().project.workspaceStates.spr_liji).toEqual({
      blocks: { blocks: [] },
    });
    expect(useEditorStore.getState().saveStatus).toBe("dirty");
  });

  it("can undo and redo Blockly snapshot changes", () => {
    const state = useEditorStore.getState();
    state.hydrateProject(createDefaultProject());
    state.setWorkspaceState("spr_liji", { blocks: { blocks: ["first"] } });
    state.setWorkspaceState("spr_liji", { blocks: { blocks: ["second"] } });

    state.undoWorkspace("spr_liji");
    expect(useEditorStore.getState().project.workspaceStates.spr_liji).toEqual({
      blocks: { blocks: ["first"] },
    });

    state.redoWorkspace("spr_liji");
    expect(useEditorStore.getState().project.workspaceStates.spr_liji).toEqual({
      blocks: { blocks: ["second"] },
    });
  });

  it("can add, rename, select, and delete scenes", () => {
    const state = useEditorStore.getState();
    state.hydrateProject(createDefaultProject());
    state.addScene();

    const addedSceneId = useEditorStore.getState().project.currentSceneId;
    expect(useEditorStore.getState().project.scenes).toHaveLength(2);

    state.renameScene(addedSceneId, "欢乐教室");
    expect(
      useEditorStore
        .getState()
        .project.scenes.find((scene) => scene.sceneId === addedSceneId)?.name,
    ).toBe("欢乐教室");

    state.deleteScene(addedSceneId);
    expect(useEditorStore.getState().project.scenes).toHaveLength(1);
    expect(useEditorStore.getState().project.currentSceneId).toBe("scn_forest");
  });

  it("does not delete the final scene", () => {
    const state = useEditorStore.getState();
    state.hydrateProject(createDefaultProject());
    state.deleteScene("scn_forest");

    expect(useEditorStore.getState().project.scenes).toHaveLength(1);
    expect(useEditorStore.getState().project.currentSceneId).toBe("scn_forest");
  });

  it("adds assets selected from the library", () => {
    const state = useEditorStore.getState();
    state.hydrateProject(createDefaultProject());
    state.addSpriteFromLibrary(spriteLibrary[1]!);
    state.addSceneFromLibrary(backgroundLibrary[1]!);

    const project = useEditorStore.getState().project;
    expect(project.sprites).toHaveLength(4);
    expect(project.sprites.at(-1)?.costumeAssetId).toBe("obj_treasure_chest");
    expect(project.scenes).toHaveLength(2);
    expect(project.scenes.at(-1)?.backdropAssetId).toBe("bg_classroom_01");
  });

  it("changes the current backdrop and project settings", () => {
    const state = useEditorStore.getState();
    state.hydrateProject(createDefaultProject());
    state.updateSceneBackdrop("scn_forest", backgroundLibrary[1]!);
    state.updateProjectSettings("  我的寻宝游戏  ", "en-US");

    const project = useEditorStore.getState().project;
    expect(project.scenes[0]?.backdropAssetId).toBe("bg_classroom_01");
    expect(project.name).toBe("我的寻宝游戏");
    expect(project.settings.locale).toBe("en-US");
    expect(useEditorStore.getState().saveStatus).toBe("dirty");
  });

  it("updates and clamps sprite properties in the current scene", () => {
    const state = useEditorStore.getState();
    state.hydrateProject(createDefaultProject());
    state.updateSpriteProperties("spr_liji", {
      x: 900,
      y: -20,
      rotation: 270,
      scale: 0.75,
      visible: false,
    });

    const instance = useEditorStore
      .getState()
      .project.scenes[0]?.instances.find(
        (item) => item.spriteId === "spr_liji",
      );
    expect(instance?.transform).toMatchObject({
      x: 480,
      y: 0,
      rotation: 180,
      scaleX: 0.75,
      scaleY: 0.75,
    });
    expect(instance?.visible).toBe(false);
  });

  it("moves a sprite to the front or back layer", () => {
    const state = useEditorStore.getState();
    state.hydrateProject(createDefaultProject());
    state.moveSpriteLayer("spr_box", "front");

    const frontOrder = [
      ...useEditorStore.getState().project.scenes[0]!.instances,
    ]
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((instance) => instance.spriteId);
    expect(frontOrder.at(-1)).toBe("spr_box");

    state.moveSpriteLayer("spr_box", "back");
    const backOrder = [
      ...useEditorStore.getState().project.scenes[0]!.instances,
    ]
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((instance) => instance.spriteId);
    expect(backOrder[0]).toBe("spr_box");
  });

  it("undoes and redoes project-level edits", () => {
    const state = useEditorStore.getState();
    state.hydrateProject(createDefaultProject());
    state.renameSprite("spr_liji", "森林队长");

    expect(useEditorStore.getState().project.sprites[0]?.name).toBe("森林队长");
    useEditorStore.getState().undoProject();
    expect(useEditorStore.getState().project.sprites[0]?.name).toBe("栗奇");

    useEditorStore.getState().redoProject();
    expect(useEditorStore.getState().project.sprites[0]?.name).toBe("森林队长");
  });

  it("restores a deleted sprite together with its workspace", () => {
    const state = useEditorStore.getState();
    const project = createDefaultProject();
    project.workspaceStates.spr_coin = {
      blocks: { blocks: [{ type: "event_whenflagclicked" }] },
    };
    state.hydrateProject(project);
    state.selectSprite("spr_coin");
    state.deleteSprite("spr_coin");

    expect(
      useEditorStore
        .getState()
        .project.sprites.some((sprite) => sprite.spriteId === "spr_coin"),
    ).toBe(false);
    useEditorStore.getState().undoProject();

    expect(
      useEditorStore
        .getState()
        .project.sprites.some((sprite) => sprite.spriteId === "spr_coin"),
    ).toBe(true);
    expect(
      useEditorStore.getState().project.workspaceStates.spr_coin,
    ).toBeDefined();
    expect(useEditorStore.getState().selectedSpriteId).toBe("spr_coin");
  });

  it("reorders scenes and can undo the ordering", () => {
    const state = useEditorStore.getState();
    state.hydrateProject(createDefaultProject());
    state.addScene();
    const secondSceneId = useEditorStore.getState().project.currentSceneId;
    state.moveScene(secondSceneId, "previous");

    expect(useEditorStore.getState().project.scenes[0]?.sceneId).toBe(
      secondSceneId,
    );
    useEditorStore.getState().undoProject();
    expect(useEditorStore.getState().project.scenes[1]?.sceneId).toBe(
      secondSceneId,
    );
  });

  it("counts nested Blockly blocks for deletion warnings", () => {
    expect(
      countWorkspaceBlocks({
        blocks: {
          blocks: [
            {
              type: "event_whenflagclicked",
              next: { block: { type: "motion_movesteps" } },
            },
          ],
        },
      }),
    ).toBe(2);
  });

  it("finds references from another sprite before deletion", () => {
    const project = createDefaultProject();
    project.workspaceStates.spr_liji = {
      blocks: {
        blocks: [
          {
            type: "kids_if_touching",
            fields: { TARGET: "spr_box" },
          },
          {
            type: "kids_when_touching",
            fields: { TARGET: { value: "spr_box" } },
          },
        ],
      },
    };
    project.workspaceStates.spr_box = {
      blocks: {
        blocks: [
          {
            type: "kids_if_touching",
            fields: { TARGET: "spr_box" },
          },
        ],
      },
    };

    expect(countSpriteReferences(project, "spr_box")).toBe(2);
  });
});
