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
});
