import { createDefaultProject } from "@kids-code/domain";
import { afterEach, describe, expect, it } from "vitest";
import {
  captureScopedStorage,
  clearAppStorage,
  createLocalBackup,
  readLocalBackup,
  restoreScopedStorage,
} from "./local-backup";

describe("complete local backup", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("round-trips active and trashed projects, binaries, and progress", async () => {
    const project = createDefaultProject();
    project.assets.push({
      assetId: "upload_test",
      type: "sprite",
      path: "uploads/test.png",
    });
    const backup = createLocalBackup({
      snapshot: {
        projects: [project],
        trash: [
          {
            projectId: "prj_trash",
            deletedAt: "2026-08-01T00:00:00.000Z",
            project: { ...createDefaultProject(), projectId: "prj_trash" },
          },
        ],
        thumbnails: [
          {
            projectId: project.projectId,
            updatedAt: project.updatedAt,
            mimeType: "image/webp",
            bytes: new Uint8Array([4, 5]),
          },
        ],
        assets: [
          {
            path: "uploads/test.png",
            updatedAt: project.updatedAt,
            mimeType: "image/png",
            bytes: new Uint8Array([1, 2, 3]),
          },
        ],
      },
      storage: {
        local: { "kids-code:completed-tasks": '["move"]' },
        session: { "kids-code:task-hints:one:move": "2" },
      },
    });

    const restored = await readLocalBackup(backup);
    expect(restored.snapshot.projects[0]?.projectId).toBe(project.projectId);
    expect(restored.snapshot.trash[0]?.projectId).toBe("prj_trash");
    expect(restored.snapshot.assets[0]?.bytes).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(restored.snapshot.thumbnails[0]?.bytes).toEqual(
      new Uint8Array([4, 5]),
    );
    expect(restored.storage.local["kids-code:completed-tasks"]).toBe(
      '["move"]',
    );
  });

  it("rejects backups missing referenced uploaded bytes", async () => {
    const project = createDefaultProject();
    project.assets.push({
      assetId: "upload_missing",
      type: "sprite",
      path: "uploads/missing.png",
    });
    const backup = createLocalBackup({
      snapshot: { projects: [project], trash: [], thumbnails: [], assets: [] },
      storage: { local: {}, session: {} },
    });
    await expect(readLocalBackup(backup)).rejects.toThrow(
      "LOCAL_BACKUP_MISSING_ASSET",
    );
  });

  it("only clears and restores this application's storage keys", () => {
    localStorage.setItem("another-app", "keep");
    localStorage.setItem("kids-code:draft:one", "old");
    sessionStorage.setItem("kids-code:task-hints:one:move", "2");
    const captured = captureScopedStorage();
    clearAppStorage();
    expect(localStorage.getItem("another-app")).toBe("keep");
    expect(localStorage.getItem("kids-code:draft:one")).toBeNull();
    expect(sessionStorage.getItem("kids-code:task-hints:one:move")).toBeNull();
    restoreScopedStorage(captured);
    expect(localStorage.getItem("kids-code:draft:one")).toBe("old");
    expect(sessionStorage.getItem("kids-code:task-hints:one:move")).toBe("2");
  });
});
