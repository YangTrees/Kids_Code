import { projectSchema, type Project } from "@kids-code/domain";
import type { LocalDataSnapshot, TrashRecord } from "@kids-code/persistence";
import {
  decodeZip,
  encodeZip,
  MAX_PROJECT_ENTRY_BYTES,
  MAX_PROJECT_PACKAGE_ENTRIES,
} from "../editor/project-package";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
export const MAX_LOCAL_BACKUP_BYTES = 250 * 1024 * 1024;

export interface ScopedStorageSnapshot {
  local: Record<string, string>;
  session: Record<string, string>;
}

export interface LocalBackup {
  snapshot: LocalDataSnapshot;
  storage: ScopedStorageSnapshot;
}

const isAppKey = (key: string) =>
  key.startsWith("kids-code:") || key === "kids-code-tutorial-step";

function readScopedStorage(storage: Storage): Record<string, string> {
  const entries: Record<string, string> = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !isAppKey(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) entries[key] = value;
  }
  return entries;
}

export function captureScopedStorage(): ScopedStorageSnapshot {
  return {
    local: readScopedStorage(localStorage),
    session: readScopedStorage(sessionStorage),
  };
}

function clearScopedStorage(storage: Storage): void {
  for (const key of Object.keys(readScopedStorage(storage)))
    storage.removeItem(key);
}

export function clearAppStorage(): void {
  clearScopedStorage(localStorage);
  clearScopedStorage(sessionStorage);
}

export function restoreScopedStorage(snapshot: ScopedStorageSnapshot): void {
  clearAppStorage();
  for (const [key, value] of Object.entries(snapshot.local))
    localStorage.setItem(key, value);
  for (const [key, value] of Object.entries(snapshot.session))
    sessionStorage.setItem(key, value);
}

async function readBlob(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () =>
      resolve(reader.result as ArrayBuffer),
    );
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsArrayBuffer(blob);
  });
}

function bytesForBlob(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data);
  return copy.buffer;
}

export function createLocalBackup(backup: LocalBackup): Blob {
  const files = new Map<string, Uint8Array>();
  const manifest = {
    kind: "kids-code-studio/local-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: backup.snapshot.projects,
    trash: backup.snapshot.trash,
    thumbnails: backup.snapshot.thumbnails.map((record, index) => {
      files.set(`binary/thumbnail/${index}`, new Uint8Array(record.bytes));
      return {
        projectId: record.projectId,
        updatedAt: record.updatedAt,
        mimeType: record.mimeType,
        file: `binary/thumbnail/${index}`,
      };
    }),
    assets: backup.snapshot.assets.map((record, index) => {
      files.set(`binary/asset/${index}`, new Uint8Array(record.bytes));
      return {
        path: record.path,
        updatedAt: record.updatedAt,
        mimeType: record.mimeType,
        file: `binary/asset/${index}`,
      };
    }),
    storage: backup.storage,
  };
  files.set("manifest.json", encoder.encode(JSON.stringify(manifest)));
  if (
    files.size > MAX_PROJECT_PACKAGE_ENTRIES ||
    [...files.values()].some(
      (bytes) => bytes.byteLength > MAX_PROJECT_ENTRY_BYTES,
    )
  )
    throw new Error("LOCAL_BACKUP_TOO_LARGE");
  const zip = encodeZip(files);
  if (zip.byteLength > MAX_LOCAL_BACKUP_BYTES)
    throw new Error("LOCAL_BACKUP_TOO_LARGE");
  return new Blob([bytesForBlob(zip)], { type: "application/zip" });
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`LOCAL_BACKUP_INVALID_${label}`);
  return value;
}

function readStorage(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("LOCAL_BACKUP_INVALID_STORAGE");
  const entries = Object.entries(value);
  if (entries.some(([key, item]) => !isAppKey(key) || typeof item !== "string"))
    throw new Error("LOCAL_BACKUP_INVALID_STORAGE");
  return Object.fromEntries(entries) as Record<string, string>;
}

export async function readLocalBackup(file: Blob): Promise<LocalBackup> {
  if (file.size > MAX_LOCAL_BACKUP_BYTES)
    throw new Error("LOCAL_BACKUP_TOO_LARGE");
  const files = decodeZip(
    new Uint8Array(await readBlob(file)),
    MAX_LOCAL_BACKUP_BYTES,
  );
  const raw = files.get("manifest.json");
  if (!raw) throw new Error("LOCAL_BACKUP_MISSING_MANIFEST");
  const manifest: unknown = JSON.parse(decoder.decode(raw));
  if (!manifest || typeof manifest !== "object")
    throw new Error("LOCAL_BACKUP_INVALID_MANIFEST");
  const data = manifest as Record<string, unknown>;
  if (data.kind === "kids-code-studio/export-all")
    throw new Error("LEGACY_BACKUP_INCOMPLETE");
  if (data.kind !== "kids-code-studio/local-backup" || data.version !== 1)
    throw new Error("LOCAL_BACKUP_UNSUPPORTED");
  if (
    !Array.isArray(data.projects) ||
    !Array.isArray(data.trash) ||
    !Array.isArray(data.thumbnails) ||
    !Array.isArray(data.assets) ||
    !data.storage ||
    typeof data.storage !== "object"
  )
    throw new Error("LOCAL_BACKUP_INVALID_MANIFEST");
  const projects = data.projects.map((item) => projectSchema.parse(item));
  const trash: TrashRecord[] = data.trash.map((item) => {
    if (!item || typeof item !== "object")
      throw new Error("LOCAL_BACKUP_INVALID_TRASH");
    const record = item as Record<string, unknown>;
    const project = projectSchema.parse(record.project);
    const projectId = readString(record.projectId, "TRASH");
    if (projectId !== project.projectId)
      throw new Error("LOCAL_BACKUP_INVALID_TRASH");
    return {
      projectId,
      deletedAt: readString(record.deletedAt, "TRASH"),
      ...(record.expiresAt === undefined
        ? {}
        : { expiresAt: readString(record.expiresAt, "TRASH") }),
      project,
    };
  });
  const readBinary = (item: unknown, kind: string) => {
    if (!item || typeof item !== "object")
      throw new Error("LOCAL_BACKUP_INVALID_BINARY");
    const record = item as Record<string, unknown>;
    const filePath = readString(record.file, "BINARY");
    if (!filePath.startsWith(`binary/${kind}/`))
      throw new Error("LOCAL_BACKUP_INVALID_BINARY");
    const bytes = files.get(filePath);
    if (!bytes) throw new Error("LOCAL_BACKUP_MISSING_BINARY");
    return {
      updatedAt: readString(record.updatedAt, "BINARY"),
      mimeType: readString(record.mimeType, "BINARY"),
      bytes,
    };
  };
  const thumbnails = data.thumbnails.map((item) => ({
    projectId: readString(
      (item as Record<string, unknown>)?.projectId,
      "THUMBNAIL",
    ),
    ...readBinary(item, "thumbnail"),
  }));
  const assets = data.assets.map((item) => {
    const path = readString((item as Record<string, unknown>)?.path, "ASSET");
    if (!path.startsWith("uploads/"))
      throw new Error("LOCAL_BACKUP_INVALID_ASSET");
    return { path, ...readBinary(item, "asset") };
  });
  const unique = (items: string[]) => new Set(items).size === items.length;
  if (
    !unique(projects.map((project: Project) => project.projectId)) ||
    !unique(trash.map((record) => record.projectId)) ||
    !unique(thumbnails.map((record) => record.projectId)) ||
    !unique(assets.map((record) => record.path))
  )
    throw new Error("LOCAL_BACKUP_DUPLICATE_RECORD");
  const assetPaths = new Set(assets.map((record) => record.path));
  for (const project of [
    ...projects,
    ...trash.map((record) => record.project),
  ]) {
    for (const asset of project.assets) {
      if (asset.path.startsWith("uploads/") && !assetPaths.has(asset.path))
        throw new Error("LOCAL_BACKUP_MISSING_ASSET");
    }
  }
  const storage = data.storage as Record<string, unknown>;
  return {
    snapshot: { projects, trash, thumbnails, assets },
    storage: {
      local: readStorage(storage.local),
      session: readStorage(storage.session),
    },
  };
}
