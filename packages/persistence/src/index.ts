import type { Project } from "@kids-code/domain";
import Dexie, { type EntityTable } from "dexie";

interface ProjectRecord {
  projectId: string;
  revision: number;
  updatedAt: string;
  project: Project;
}

export interface ProjectThumbnail {
  projectId: string;
  updatedAt: string;
  blob: Blob;
}

interface ProjectThumbnailRecord {
  projectId: string;
  updatedAt: string;
  bytes?: Uint8Array;
  mimeType?: string;
  // Kept for reading thumbnails written by the first implementation.
  blob?: Blob;
}

interface LocalAssetRecord {
  path: string;
  bytes: Uint8Array;
  mimeType: string;
  updatedAt: string;
}

export interface TrashRecord {
  projectId: string;
  deletedAt: string;
  expiresAt?: string;
  project: Project;
}

const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

class KidsCodeDatabase extends Dexie {
  projects!: EntityTable<ProjectRecord, "projectId">;
  trash!: EntityTable<TrashRecord, "projectId">;
  thumbnails!: EntityTable<ProjectThumbnailRecord, "projectId">;
  localAssets!: EntityTable<LocalAssetRecord, "path">;

  constructor(name = "kids-code-studio") {
    super(name);
    this.version(1).stores({ projects: "projectId, updatedAt, revision" });
    this.version(2).stores({
      projects: "projectId, updatedAt, revision",
      trash: "projectId, deletedAt",
    });
    this.version(3).stores({
      projects: "projectId, updatedAt, revision",
      trash: "projectId, deletedAt",
      thumbnails: "projectId, updatedAt",
    });
    this.version(4).stores({
      projects: "projectId, updatedAt, revision",
      trash: "projectId, deletedAt",
      thumbnails: "projectId, updatedAt",
      localAssets: "path, updatedAt",
    });
  }
}

export interface ProjectRepository {
  get(projectId: string): Promise<Project | undefined>;
  list(): Promise<Project[]>;
  save(project: Project, revision: number): Promise<void>;
  remove(projectId: string): Promise<void>;
  listTrash(): Promise<TrashRecord[]>;
  restore(projectId: string): Promise<void>;
  purge(projectId: string): Promise<void>;
  saveThumbnail(projectId: string, blob: Blob): Promise<void>;
  getThumbnail(projectId: string): Promise<ProjectThumbnail | undefined>;
  listThumbnails(): Promise<ProjectThumbnail[]>;
  saveAsset(path: string, blob: Blob): Promise<void>;
  getAsset(path: string): Promise<Blob | undefined>;
}

export class IndexedDbProjectRepository implements ProjectRepository {
  readonly #db: KidsCodeDatabase;

  constructor(name?: string) {
    this.#db = new KidsCodeDatabase(name);
  }

  async get(projectId: string): Promise<Project | undefined> {
    return (await this.#db.projects.get(projectId))?.project;
  }

  async list(): Promise<Project[]> {
    const records = await this.#db.projects
      .orderBy("updatedAt")
      .reverse()
      .toArray();
    return records.map((record) => record.project);
  }

  async save(project: Project, revision: number): Promise<void> {
    await this.#db.transaction("rw", this.#db.projects, async () => {
      const current = await this.#db.projects.get(project.projectId);
      if (current && current.revision > revision) return;
      await this.#db.projects.put({
        projectId: project.projectId,
        revision,
        updatedAt: project.updatedAt,
        project,
      });
    });
  }

  async remove(projectId: string): Promise<void> {
    await this.#db.transaction(
      "rw",
      this.#db.projects,
      this.#db.trash,
      async () => {
        const record = await this.#db.projects.get(projectId);
        if (!record) return;
        const deletedAt = Date.now();
        await this.#db.trash.put({
          projectId,
          deletedAt: new Date(deletedAt).toISOString(),
          expiresAt: new Date(deletedAt + TRASH_RETENTION_MS).toISOString(),
          project: record.project,
        });
        await this.#db.projects.delete(projectId);
      },
    );
  }

  async listTrash(): Promise<TrashRecord[]> {
    const records = await this.#db.trash
      .orderBy("deletedAt")
      .reverse()
      .toArray();
    const now = Date.now();
    const expired = records.filter(
      (record) => record.expiresAt && Date.parse(record.expiresAt) <= now,
    );
    if (expired.length > 0) {
      await this.#db.transaction(
        "rw",
        this.#db.trash,
        this.#db.thumbnails,
        async () => {
          const ids = expired.map((record) => record.projectId);
          await this.#db.trash.bulkDelete(ids);
          await this.#db.thumbnails.bulkDelete(ids);
        },
      );
    }
    const expiredIds = new Set(expired.map((record) => record.projectId));
    return records.filter((record) => !expiredIds.has(record.projectId));
  }

  async restore(projectId: string): Promise<void> {
    await this.#db.transaction(
      "rw",
      this.#db.projects,
      this.#db.trash,
      async () => {
        const record = await this.#db.trash.get(projectId);
        if (!record) return;
        const restored = {
          ...record.project,
          updatedAt: new Date().toISOString(),
        };
        await this.#db.projects.put({
          projectId,
          revision: Date.now(),
          updatedAt: restored.updatedAt,
          project: restored,
        });
        await this.#db.trash.delete(projectId);
      },
    );
  }

  async purge(projectId: string): Promise<void> {
    await this.#db.transaction(
      "rw",
      this.#db.trash,
      this.#db.thumbnails,
      async () => {
        await this.#db.trash.delete(projectId);
        await this.#db.thumbnails.delete(projectId);
      },
    );
  }

  async saveThumbnail(projectId: string, blob: Blob): Promise<void> {
    await this.#db.thumbnails.put({
      projectId,
      updatedAt: new Date().toISOString(),
      bytes: new Uint8Array(await blob.arrayBuffer()),
      mimeType: blob.type || "image/webp",
    });
  }

  async getThumbnail(projectId: string): Promise<ProjectThumbnail | undefined> {
    const record = await this.#db.thumbnails.get(projectId);
    return record ? this.#toThumbnail(record) : undefined;
  }

  async listThumbnails(): Promise<ProjectThumbnail[]> {
    return (await this.#db.thumbnails.toArray()).map((record) =>
      this.#toThumbnail(record),
    );
  }

  async saveAsset(path: string, blob: Blob): Promise<void> {
    await this.#db.localAssets.put({
      path,
      bytes: new Uint8Array(await blob.arrayBuffer()),
      mimeType: blob.type || "application/octet-stream",
      updatedAt: new Date().toISOString(),
    });
  }

  async getAsset(path: string): Promise<Blob | undefined> {
    const record = await this.#db.localAssets.get(path);
    return record
      ? new Blob([Uint8Array.from(record.bytes)], { type: record.mimeType })
      : undefined;
  }

  #toThumbnail(record: ProjectThumbnailRecord): ProjectThumbnail {
    return {
      projectId: record.projectId,
      updatedAt: record.updatedAt,
      blob:
        record.blob ??
        new Blob([Uint8Array.from(record.bytes ?? [])], {
          type: record.mimeType ?? "image/png",
        }),
    };
  }
}
