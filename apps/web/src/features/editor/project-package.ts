import { projectSchema, type Project } from "@kids-code/domain";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
export const MAX_PROJECT_PACKAGE_BYTES = 50 * 1024 * 1024;
const MAX_PROJECT_PACKAGE_ENTRIES = 2_000;
const MAX_PROJECT_ENTRY_BYTES = 25 * 1024 * 1024;

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function join(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(
    parts.reduce((size, part) => size + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(data.length);
  copy.set(data);
  return copy.buffer;
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

export function encodeZip(files: Map<string, Uint8Array>): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const [name, content] of files) {
    const nameBytes = encoder.encode(name.replaceAll("\\", "/"));
    const checksum = crc32(content);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, content.length, true);
    localView.setUint32(22, content.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    localParts.push(local, content);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, content.length, true);
    centralView.setUint32(24, content.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, localOffset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);
    localOffset += local.length + content.length;
  }

  const central = join(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.size, true);
  endView.setUint16(10, files.size, true);
  endView.setUint32(12, central.length, true);
  endView.setUint32(16, localOffset, true);
  return join([...localParts, central, end]);
}

export function decodeZip(data: Uint8Array): Map<string, Uint8Array> {
  if (data.length < 22 || data.length > MAX_PROJECT_PACKAGE_BYTES)
    throw new Error("KIDGAME_PACKAGE_TOO_LARGE_OR_INVALID");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let endOffset = data.length - 22;
  while (endOffset >= Math.max(0, data.length - 65_557)) {
    if (view.getUint32(endOffset, true) === 0x06054b50) break;
    endOffset -= 1;
  }
  if (endOffset < 0 || endOffset + 22 > data.length)
    throw new Error("INVALID_KIDGAME_PACKAGE");
  const entryCount = view.getUint16(endOffset + 10, true);
  if (entryCount > MAX_PROJECT_PACKAGE_ENTRIES)
    throw new Error("KIDGAME_TOO_MANY_ENTRIES");
  let offset = view.getUint32(endOffset + 16, true);
  const files = new Map<string, Uint8Array>();
  let totalContentSize = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > endOffset) throw new Error("INVALID_KIDGAME_DIRECTORY");
    if (view.getUint32(offset, true) !== 0x02014b50)
      throw new Error("INVALID_KIDGAME_DIRECTORY");
    const compression = view.getUint16(offset + 10, true);
    if (compression !== 0) throw new Error("UNSUPPORTED_KIDGAME_COMPRESSION");
    const expectedCrc = view.getUint32(offset + 16, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const directoryEntryEnd =
      offset + 46 + nameLength + extraLength + commentLength;
    if (directoryEntryEnd > endOffset)
      throw new Error("INVALID_KIDGAME_DIRECTORY");
    const name = decoder.decode(
      data.subarray(offset + 46, offset + 46 + nameLength),
    );
    if (
      !name ||
      name.includes("\\") ||
      name.startsWith("/") ||
      /^[A-Za-z]:/.test(name) ||
      name.split("/").includes("..")
    )
      throw new Error("UNSAFE_KIDGAME_PATH");
    if (files.has(name)) throw new Error("DUPLICATE_KIDGAME_ENTRY");
    if (size > MAX_PROJECT_ENTRY_BYTES)
      throw new Error("KIDGAME_ENTRY_TOO_LARGE");
    totalContentSize += size;
    if (totalContentSize > MAX_PROJECT_PACKAGE_BYTES)
      throw new Error("KIDGAME_CONTENT_TOO_LARGE");
    if (localOffset + 30 > data.length)
      throw new Error("INVALID_KIDGAME_ENTRY");
    if (view.getUint32(localOffset, true) !== 0x04034b50)
      throw new Error("INVALID_KIDGAME_ENTRY");
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const contentOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (contentOffset + size > data.length)
      throw new Error("INVALID_KIDGAME_ENTRY");
    const content = data.slice(contentOffset, contentOffset + size);
    if (crc32(content) !== expectedCrc)
      throw new Error("CORRUPT_KIDGAME_ENTRY");
    files.set(name, content);
    offset = directoryEntryEnd;
  }
  return files;
}

export async function createProjectPackage(
  project: Project,
  thumbnail?: Blob | null,
  resolveLocalAsset?: (path: string) => Promise<Blob | undefined>,
): Promise<Blob> {
  const files = new Map<string, Uint8Array>();
  files.set("project.json", encoder.encode(JSON.stringify(project, null, 2)));
  if (thumbnail) {
    const extension = thumbnail.type === "image/png" ? "png" : "webp";
    files.set(
      `thumbnail.${extension}`,
      new Uint8Array(await readBlob(thumbnail)),
    );
  }
  files.set(
    "manifest.json",
    encoder.encode(
      JSON.stringify(
        { format: "kidgame", version: 1, projectFile: "project.json" },
        null,
        2,
      ),
    ),
  );
  for (const asset of project.assets) {
    const localAsset = await resolveLocalAsset?.(asset.path);
    const response = localAsset
      ? undefined
      : await fetch(`/assets/${asset.path}`);
    if (response && !response.ok)
      throw new Error(`ASSET_EXPORT_FAILED:${asset.assetId}`);
    files.set(
      `assets/${asset.path}`,
      new Uint8Array(await readBlob(localAsset ?? (await response!.blob()))),
    );
  }
  return new Blob([toArrayBuffer(encodeZip(files))], {
    type: "application/vnd.kids-code.kidgame+zip",
  });
}

export interface ProjectPackageContents {
  project: Project;
  assets: Map<string, Blob>;
}

function mimeTypeForPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  if (extension === "wav") return "audio/wav";
  if (extension === "mp3") return "audio/mpeg";
  return "application/octet-stream";
}

export async function readProjectPackageContents(
  file: File,
): Promise<ProjectPackageContents> {
  if (file.size > MAX_PROJECT_PACKAGE_BYTES)
    throw new Error("KIDGAME_PACKAGE_TOO_LARGE");
  const files = decodeZip(new Uint8Array(await readBlob(file)));
  const projectFile = files.get("project.json");
  if (!projectFile) throw new Error("KIDGAME_PROJECT_MISSING");
  const project = projectSchema.parse(JSON.parse(decoder.decode(projectFile)));
  const assets = new Map<string, Blob>();
  for (const asset of project.assets) {
    const bytes = files.get(`assets/${asset.path}`);
    if (!bytes) throw new Error(`KIDGAME_ASSET_MISSING:${asset.assetId}`);
    assets.set(
      asset.path,
      new Blob([toArrayBuffer(bytes)], { type: mimeTypeForPath(asset.path) }),
    );
  }
  return { project, assets };
}

export async function readProjectPackage(file: File): Promise<Project> {
  return (await readProjectPackageContents(file)).project;
}
