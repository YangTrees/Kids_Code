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

export interface LocalDataSnapshot {
  projects: Project[];
  trash: TrashRecord[];
  thumbnails: Array<{
    projectId: string;
    updatedAt: string;
    mimeType: string;
    bytes: Uint8Array;
  }>;
  assets: Array<{
    path: string;
    updatedAt: string;
    mimeType: string;
    bytes: Uint8Array;
  }>;
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
  snapshotAll(): Promise<LocalDataSnapshot>;
  replaceAll(snapshot: LocalDataSnapshot): Promise<void>;
  /** 家长区“删除全部数据”：清空本机作品、回收站、缩略图与本地素材。 */
  clearAll(): Promise<void>;
}

export class IndexedDbProjectRepository implements ProjectRepository {
  readonly #db: KidsCodeDatabase;

  constructor(name?: string) {
    this.#db = new KidsCodeDatabase(name);
  }

  /** Release only this repository's connection after an aborted initial read. */
  close(): void {
    this.#db.close();
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
        this.#db.projects,
        this.#db.localAssets,
        async () => {
          const ids = expired.map((record) => record.projectId);
          await this.#db.trash.bulkDelete(ids);
          await this.#db.thumbnails.bulkDelete(ids);
          await this.#pruneUnusedAssets(
            expired.flatMap((record) =>
              record.project.assets.map((asset) => asset.path),
            ),
          );
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
      this.#db.projects,
      this.#db.localAssets,
      async () => {
        const record = await this.#db.trash.get(projectId);
        await this.#db.trash.delete(projectId);
        await this.#db.thumbnails.delete(projectId);
        if (record)
          await this.#pruneUnusedAssets(
            record.project.assets.map((asset) => asset.path),
          );
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

  async snapshotAll(): Promise<LocalDataSnapshot> {
    const [projects, trash, thumbnails, assets] = await this.#db.transaction(
      "r",
      this.#db.projects,
      this.#db.trash,
      this.#db.thumbnails,
      this.#db.localAssets,
      () =>
        Promise.all([
          this.#db.projects.toArray(),
          this.#db.trash.toArray(),
          this.#db.thumbnails.toArray(),
          this.#db.localAssets.toArray(),
        ]),
    );
    return {
      projects: projects.map((record) => record.project),
      trash,
      thumbnails: await Promise.all(
        thumbnails.map(async (record) => ({
          projectId: record.projectId,
          updatedAt: record.updatedAt,
          mimeType: record.mimeType ?? record.blob?.type ?? "image/png",
          bytes:
            record.bytes ?? new Uint8Array(await record.blob!.arrayBuffer()),
        })),
      ),
      assets,
    };
  }

  async replaceAll(snapshot: LocalDataSnapshot): Promise<void> {
    await this.#db.transaction(
      "rw",
      this.#db.projects,
      this.#db.trash,
      this.#db.thumbnails,
      this.#db.localAssets,
      async () => {
        await Promise.all([
          this.#db.projects.clear(),
          this.#db.trash.clear(),
          this.#db.thumbnails.clear(),
          this.#db.localAssets.clear(),
        ]);
        await this.#db.projects.bulkPut(
          snapshot.projects.map((project) => ({
            projectId: project.projectId,
            revision: Date.now(),
            updatedAt: project.updatedAt,
            project,
          })),
        );
        await this.#db.trash.bulkPut(snapshot.trash);
        await this.#db.thumbnails.bulkPut(snapshot.thumbnails);
        await this.#db.localAssets.bulkPut(snapshot.assets);
      },
    );
  }

  async clearAll(): Promise<void> {
    await this.#db.transaction(
      "rw",
      this.#db.projects,
      this.#db.trash,
      this.#db.thumbnails,
      this.#db.localAssets,
      async () => {
        await Promise.all([
          this.#db.projects.clear(),
          this.#db.trash.clear(),
          this.#db.thumbnails.clear(),
          this.#db.localAssets.clear(),
        ]);
      },
    );
  }

  async #pruneUnusedAssets(paths: string[]): Promise<void> {
    const candidates = [
      ...new Set(paths.filter((path) => path.startsWith("uploads/"))),
    ];
    if (candidates.length === 0) return;
    const [projects, trash] = await Promise.all([
      this.#db.projects.toArray(),
      this.#db.trash.toArray(),
    ]);
    const used = new Set(
      [
        ...projects.map((record) => record.project),
        ...trash.map((record) => record.project),
      ].flatMap((project) => project.assets.map((asset) => asset.path)),
    );
    await this.#db.localAssets.bulkDelete(
      candidates.filter((path) => !used.has(path)),
    );
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
