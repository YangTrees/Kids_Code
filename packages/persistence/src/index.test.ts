import "fake-indexeddb/auto";
import { createDefaultProject } from "@kids-code/domain";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IndexedDbProjectRepository } from "./index";

describe("IndexedDbProjectRepository", () => {
  afterEach(() => vi.restoreAllMocks());
  it("round-trips a sprite workspace snapshot", async () => {
    const repository = new IndexedDbProjectRepository(
      `test-${crypto.randomUUID()}`,
    );
    const project = createDefaultProject();
    project.workspaceStates.spr_liji = {
      blocks: { languageVersion: 0, blocks: [] },
    };

    await repository.save(project, 1);

    expect((await repository.get(project.projectId))?.workspaceStates).toEqual(
      project.workspaceStates,
    );
  });

  it("does not let an older revision overwrite a newer save", async () => {
    const repository = new IndexedDbProjectRepository(
      `test-${crypto.randomUUID()}`,
    );
    const latest = createDefaultProject();
    latest.name = "最新版本";
    await repository.save(latest, 2);

    const stale = createDefaultProject();
    stale.name = "旧版本";
    await repository.save(stale, 1);

    expect((await repository.get(latest.projectId))?.name).toBe("最新版本");
  });

  it("moves deleted projects to trash and restores them", async () => {
    const repository = new IndexedDbProjectRepository(
      `test-${crypto.randomUUID()}`,
    );
    const project = createDefaultProject();
    await repository.save(project, 1);

    await repository.remove(project.projectId);

    expect(await repository.get(project.projectId)).toBeUndefined();
    expect((await repository.listTrash())[0]?.project.name).toBe(project.name);

    await repository.restore(project.projectId);

    expect((await repository.get(project.projectId))?.name).toBe(project.name);
    expect(await repository.listTrash()).toHaveLength(0);
  });

  it("keeps deleted projects for seven days and then expires them", async () => {
    const now = vi
      .spyOn(Date, "now")
      .mockReturnValue(Date.parse("2026-08-01T00:00:00.000Z"));
    const repository = new IndexedDbProjectRepository(
      `test-${crypto.randomUUID()}`,
    );
    const project = createDefaultProject();
    await repository.save(project, 1);
    await repository.remove(project.projectId);

    expect((await repository.listTrash())[0]?.expiresAt).toBe(
      "2026-08-08T00:00:00.000Z",
    );

    now.mockReturnValue(Date.parse("2026-08-08T00:00:00.001Z"));
    expect(await repository.listTrash()).toHaveLength(0);
  });

  it("permanently removes a project from trash", async () => {
    const repository = new IndexedDbProjectRepository(
      `test-${crypto.randomUUID()}`,
    );
    const project = createDefaultProject();
    await repository.save(project, 1);
    await repository.remove(project.projectId);

    await repository.purge(project.projectId);

    expect(await repository.listTrash()).toHaveLength(0);
  });

  it("stores and removes generated project thumbnails", async () => {
    const repository = new IndexedDbProjectRepository(
      `test-${crypto.randomUUID()}`,
    );
    const project = createDefaultProject();
    const thumbnail = new Blob(["preview"], { type: "image/webp" });

    await repository.saveThumbnail(project.projectId, thumbnail);
    expect((await repository.getThumbnail(project.projectId))?.blob.type).toBe(
      "image/webp",
    );

    await repository.save(project, 1);
    await repository.remove(project.projectId);
    await repository.purge(project.projectId);
    expect(await repository.getThumbnail(project.projectId)).toBeUndefined();
  });

  it("stores uploaded binary assets outside project JSON", async () => {
    const repository = new IndexedDbProjectRepository(
      `test-${crypto.randomUUID()}`,
    );
    const original = new Blob([new Uint8Array([137, 80, 78, 71])], {
      type: "image/png",
    });

    await repository.saveAsset("uploads/example.png", original);
    const restored = await repository.getAsset("uploads/example.png");

    expect(restored?.type).toBe("image/png");
    expect(new Uint8Array(await restored!.arrayBuffer())).toEqual(
      new Uint8Array([137, 80, 78, 71]),
    );
  });
  it("backs up and restores projects, trash, thumbnails, and uploaded bytes", async () => {
    const source = new IndexedDbProjectRepository(
      `test-${crypto.randomUUID()}`,
    );
    const active = createDefaultProject();
    active.assets.push({
      assetId: "upload_sprite_example",
      type: "sprite",
      path: "uploads/example.png",
    });
    const trashed = createDefaultProject();
    trashed.projectId = "prj_trashed";
    await source.save(active, 1);
    await source.save(trashed, 1);
    await source.remove(trashed.projectId);
    await source.saveAsset(
      "uploads/example.png",
      new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }),
    );
    await source.saveThumbnail(
      active.projectId,
      new Blob(["preview"], { type: "image/webp" }),
    );

    const backup = await source.snapshotAll();
    const target = new IndexedDbProjectRepository(
      `test-${crypto.randomUUID()}`,
    );
    await target.replaceAll(backup);

    expect((await target.get(active.projectId))?.name).toBe(active.name);
    expect((await target.listTrash())[0]?.projectId).toBe(trashed.projectId);
    expect((await target.getThumbnail(active.projectId))?.blob.type).toBe(
      "image/webp",
    );
    const asset = await target.getAsset("uploads/example.png");
    expect(new Uint8Array(await asset!.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it("removes uploaded bytes on permanent deletion but preserves shared assets", async () => {
    const repository = new IndexedDbProjectRepository(
      `test-${crypto.randomUUID()}`,
    );
    const deleted = createDefaultProject();
    const survivor = createDefaultProject();
    survivor.projectId = "prj_survivor";
    for (const project of [deleted, survivor])
      project.assets.push({
        assetId: "upload_shared",
        type: "sprite",
        path: "uploads/shared.png",
      });
    await repository.saveAsset(
      "uploads/shared.png",
      new Blob(["shared"], { type: "image/png" }),
    );
    await repository.save(deleted, 1);
    await repository.save(survivor, 1);
    await repository.remove(deleted.projectId);
    await repository.purge(deleted.projectId);
    expect(await repository.getAsset("uploads/shared.png")).toBeDefined();

    await repository.remove(survivor.projectId);
    await repository.purge(survivor.projectId);
    expect(await repository.getAsset("uploads/shared.png")).toBeUndefined();
  });

  it("prunes uploaded bytes when trash expires", async () => {
    const now = vi
      .spyOn(Date, "now")
      .mockReturnValue(Date.parse("2026-08-01T00:00:00.000Z"));
    const repository = new IndexedDbProjectRepository(
      `test-${crypto.randomUUID()}`,
    );
    const project = createDefaultProject();
    project.assets.push({
      assetId: "upload_expired",
      type: "sprite",
      path: "uploads/expired.png",
    });
    await repository.saveAsset(
      "uploads/expired.png",
      new Blob(["expired"], { type: "image/png" }),
    );
    await repository.save(project, 1);
    await repository.remove(project.projectId);
    now.mockReturnValue(Date.parse("2026-08-08T00:00:00.001Z"));
    await repository.listTrash();
    expect(await repository.getAsset("uploads/expired.png")).toBeUndefined();
  });
});
