import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  getSpriteBaseScale,
  getSpritePresentationProfile,
  projectSchema,
} from "@kids-code/domain";
import artwork from "../../../../../docs/baselines/story-ip-assets.json";
import { describe, expect, it } from "vitest";
import { createTaskProject } from "../tasks/task-project";
import { creationTasks } from "../tasks/task-catalog";
import { findVersionedTask } from "../tasks/task-versions";
import {
  encodeZip,
  readProjectPackageContents,
} from "../editor/project-package";
import {
  createStoryIpSample,
  STORY_ACTOR,
  STORY_FRONT,
} from "./story-ip-sample";

describe("story IP sample isolation and resource compatibility", () => {
  it("places each boy's measured visible body within one logical pixel of the cell center", () => {
    for (const asset of artwork.assets.filter(
      (item) => item.batch === "AS-01",
    )) {
      const { size, alphaBounds } = asset.delivery;
      const profile = getSpritePresentationProfile(asset.id);
      const [left, top, right, bottom] = alphaBounds!;
      const scale = getSpriteBaseScale(asset.id, size[1]!);
      expect(
        Math.abs(((left! + right!) / 2 - profile.anchorX * size[0]!) * scale),
      ).toBeLessThan(1);
      expect(
        Math.abs(((top! + bottom!) / 2 - profile.anchorY * size[1]!) * scale),
      ).toBeLessThan(1);
      expect((bottom! - top!) * scale).toBeGreaterThanOrEqual(32);
      expect((bottom! - top!) * scale).toBeLessThanOrEqual(38);
    }
  });
  it.each(["speak", "collision", "path_turn"] as const)(
    "keeps %s geometry and objectives while making an unsaved visual sample",
    (id) => {
      const task = findVersionedTask(id, "4", creationTasks)!;
      const original = createTaskProject(task);
      const sample = createStoryIpSample(id);
      expect(() => projectSchema.parse(sample)).not.toThrow();
      expect(sample.course).toBeUndefined();
      expect(sample.workspaceStates).toEqual({});
      expect(sample.settings).toEqual(original.settings);
      expect(
        sample.scenes[0]!.instances.map((instance) => instance.transform),
      ).toEqual(
        original.scenes[0]!.instances.map((instance) => instance.transform),
      );
      expect(sample.pathMap).toEqual(
        original.pathMap
          ? { ...original.pathMap, actorSpriteId: STORY_ACTOR }
          : undefined,
      );
      expect(original.sprites[0]?.costumeAssetId).toBe(STORY_FRONT);
      expect(original.course?.contentVersion).toBe("4");
    },
  );

  it("scales new art independently of its resolution without resizing classic costumes", () => {
    expect(getSpriteBaseScale(STORY_FRONT, 512) * 512).toBe(40);
    expect(getSpriteBaseScale(STORY_FRONT, 1280) * 1280).toBe(40);
    expect(getSpriteBaseScale("costume_liji_idle", 512) * 512).toBe(52);
    expect(getSpriteBaseScale("obj_treasure_chest", 512) * 512).toBe(38);
  });

  it("restores real new WebP bytes and stable IDs from a standalone kidgame archive", async () => {
    const project = createStoryIpSample("collision");
    const files = new Map<string, Uint8Array>([
      ["project.json", new TextEncoder().encode(JSON.stringify(project))],
    ]);
    for (const asset of project.assets)
      files.set(
        `assets/${asset.path}`,
        new Uint8Array(
          await readFile(resolve(process.cwd(), "public/assets", asset.path)),
        ),
      );
    const bytes = encodeZip(files);
    const buffer = new Uint8Array(bytes.length);
    buffer.set(bytes);
    const restored = await readProjectPackageContents(
      new File([buffer.buffer], "story-ip.kidgame"),
    );
    expect(
      restored.project.sprites.find((sprite) => sprite.spriteId === STORY_ACTOR)
        ?.costumeAssetId,
    ).toBe(STORY_FRONT);
    const blob = restored.assets.get(
      "characters/story-ip/tuantuan-stage-front-v1.webp",
    );
    expect(blob?.type).toBe("image/webp");
    expect(blob?.size).toBe(
      files.get("assets/characters/story-ip/tuantuan-stage-front-v1.webp")!
        .length,
    );
  });
});
