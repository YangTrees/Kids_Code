import { describe, expect, it } from "vitest";
import {
  getSpriteBaseScale,
  getMovementStep,
  getGridDimensions,
  gridPositionToStage,
  snapStagePositionToGrid,
  stagePositionToGrid,
  createDefaultProject,
  projectSchema,
  upgradeProjectCoordinates,
  upgradeProjectGeometry,
} from "./project";

describe("project schema", () => {
  it("normalizes sprite sizes independent of source image resolution", () => {
    expect(getSpriteBaseScale("costume_liji_idle", 512) * 512).toBe(52);
    expect(getSpriteBaseScale("costume_liji_idle", 1024) * 1024).toBe(52);
    expect(getSpriteBaseScale("obj_treasure_chest", 512) * 512).toBe(38);
    expect(getSpriteBaseScale("obj_star_coin", 512) * 512).toBe(26);
    expect(getMovementStep(createDefaultProject())).toBe(40);
  });

  it("maps every zero-based grid cell to its center", () => {
    const project = createDefaultProject();
    expect(getGridDimensions(project)).toEqual({ columns: 12, rows: 9 });
    expect(gridPositionToStage(project, 0, 0)).toEqual({ x: 20, y: 20 });
    expect(gridPositionToStage(project, 11, 8)).toEqual({ x: 460, y: 340 });
    expect(gridPositionToStage(project, 99, -2)).toEqual({ x: 460, y: 20 });
    expect(stagePositionToGrid(project, 100, 300)).toEqual({ x: 2, y: 7 });
    expect(snapStagePositionToGrid(project, 479, 359)).toEqual({
      x: 460,
      y: 340,
    });
  });

  it("converts old pixel-based goto blocks without moving saved sprites", () => {
    const project = createDefaultProject();
    project.settings.coordinateVersion = 1;
    const originalPosition = { ...project.scenes[0]!.instances[0]!.transform };
    project.workspaceStates.spr_liji = {
      blocks: {
        blocks: [
          {
            type: "event_whenflagclicked",
            next: {
              block: {
                type: "motion_gotoxy",
                inputs: {
                  X: { shadow: { type: "math_number", fields: { NUM: 240 } } },
                  Y: { shadow: { type: "math_number", fields: { NUM: 180 } } },
                },
              },
            },
          },
        ],
      },
    };
    const upgraded = upgradeProjectCoordinates(project);
    const workspace = upgraded.workspaceStates.spr_liji as {
      blocks: {
        blocks: Array<{
          next: {
            block: {
              inputs: {
                X: { shadow: { fields: { NUM: number } } };
                Y: { shadow: { fields: { NUM: number } } };
              };
            };
          };
        }>;
      };
    };
    expect(upgraded.settings.coordinateVersion).toBe(2);
    expect(
      workspace.blocks.blocks[0]!.next.block.inputs.X.shadow.fields.NUM,
    ).toBe(6);
    expect(
      workspace.blocks.blocks[0]!.next.block.inputs.Y.shadow.fields.NUM,
    ).toBe(4);
    expect(upgraded.scenes[0]!.instances[0]!.transform).toEqual(
      originalPosition,
    );
    expect(upgradeProjectCoordinates(upgraded)).toBe(upgraded);
  });

  it("preserves the movement distance of old projects without a step setting", () => {
    const project = createDefaultProject();
    const legacySettings: Partial<typeof project.settings> = {
      ...project.settings,
    };
    delete legacySettings.movementStep;
    expect(
      getMovementStep(
        projectSchema.parse({ ...project, settings: legacySettings }),
      ),
    ).toBe(10);
  });

  it("accepts the default project", () => {
    const project = projectSchema.parse(createDefaultProject());
    expect(project.projectId).toBe("prj_demo_001");
    expect(
      project.assets.some((asset) => asset.assetId === "bg_classroom_01"),
    ).toBe(true);
    expect(
      project.assets.filter((asset) => asset.type === "audio"),
    ).toHaveLength(15);
  });

  it("rejects an oversized stage coordinate", () => {
    const project = createDefaultProject();
    project.scenes[0]!.instances[0]!.transform.x = 481;
    expect(projectSchema.safeParse(project).success).toBe(false);
  });

  it("limits a project to twenty sprites", () => {
    const project = createDefaultProject();
    project.sprites = Array.from({ length: 21 }, (_, index) => ({
      spriteId: `spr_${index}`,
      name: `角色${index}`,
      costumeAssetId: "costume_liji_idle",
    }));
    expect(projectSchema.safeParse(project).success).toBe(false);
  });

  it("upgrades legacy texture scales to logical sprite scales", () => {
    const legacy = createDefaultProject();
    legacy.settings.geometryVersion = 1;
    legacy.scenes[0]!.instances[0]!.transform.scaleX = 0.46;
    legacy.scenes[0]!.instances[0]!.transform.scaleY = 0.46;
    const upgraded = upgradeProjectGeometry(legacy);
    expect(upgraded.settings.geometryVersion).toBe(3);
    expect(upgraded.scenes[0]!.instances[0]!.transform.scaleX).toBe(1);
    expect(upgraded.scenes[0]!.instances[0]!.transform.scaleY).toBe(1);
  });

  it("repairs the generic scale previously used by added scenes", () => {
    const project = createDefaultProject();
    project.settings.geometryVersion = 2;
    const chest = project.scenes[0]!.instances.find(
      (instance) => instance.spriteId === "spr_box",
    )!;
    chest.transform.scaleX = 0.3 / 0.14;
    chest.transform.scaleY = 0.3 / 0.14;
    const repaired = upgradeProjectGeometry(project);
    const repairedChest = repaired.scenes[0]!.instances.find(
      (instance) => instance.spriteId === "spr_box",
    )!;
    expect(repaired.settings.geometryVersion).toBe(3);
    expect(repairedChest.transform.scaleX).toBe(1);
    expect(repairedChest.transform.scaleY).toBe(1);
  });
});
