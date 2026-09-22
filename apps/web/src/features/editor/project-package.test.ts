import { createDefaultProject } from "@kids-code/domain";
import { describe, expect, it } from "vitest";
import {
  decodeZip,
  encodeZip,
  createProjectPackage,
  MAX_PROJECT_PACKAGE_BYTES,
  readProjectPackage,
  readProjectPackageContents,
} from "./project-package";

const encoder = new TextEncoder();
const asBuffer = (data: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(data.length);
  copy.set(data);
  return copy.buffer;
};
const readTestBlob = (blob: Blob): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () =>
      resolve(reader.result as ArrayBuffer),
    );
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsArrayBuffer(blob);
  });

describe("kidgame project package", () => {
  it("round-trips UTF-8 file names and contents", () => {
    const files = new Map([
      ["project.json", encoder.encode('{"name":"森林寻宝"}')],
      ["assets/sounds/成功.wav", new Uint8Array([1, 2, 3, 4])],
    ]);

    const restored = decodeZip(encodeZip(files));

    expect(new TextDecoder().decode(restored.get("project.json"))).toContain(
      "森林寻宝",
    );
    expect(restored.get("assets/sounds/成功.wav")).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
  });

  it("validates the project and every referenced asset before import", async () => {
    const project = createDefaultProject();
    const files = new Map<string, Uint8Array>([
      ["project.json", encoder.encode(JSON.stringify(project))],
    ]);
    for (const asset of project.assets)
      files.set(`assets/${asset.path}`, new Uint8Array([1]));
    const archive = encodeZip(files);
    const file = new File([asBuffer(archive)], "forest.kidgame");

    await expect(readProjectPackage(file)).resolves.toEqual(project);

    files.delete(`assets/${project.assets[0]!.path}`);
    const incomplete = new File([asBuffer(encodeZip(files))], "broken.kidgame");
    await expect(readProjectPackage(incomplete)).rejects.toThrow(
      "KIDGAME_ASSET_MISSING",
    );
  });

  it("rejects unsafe paths in imported archives", () => {
    const archive = encodeZip(
      new Map([["../project.json", encoder.encode("{}")]]),
    );
    expect(() => decodeZip(archive)).toThrow("UNSAFE_KIDGAME_PATH");
  });

  it("includes the current stage thumbnail in exported packages", async () => {
    const project = createDefaultProject();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    try {
      const packageBlob = await createProjectPackage(
        project,
        new Blob(["thumbnail"], { type: "image/png" }),
      );
      const files = decodeZip(new Uint8Array(await readTestBlob(packageBlob)));
      expect(files.has("thumbnail.png")).toBe(true);
      expect(files.has("project.json")).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("exports and restores uploaded binary assets through a resolver", async () => {
    const project = createDefaultProject();
    project.assets.push({
      assetId: "upload_sprite_example",
      type: "sprite",
      path: "uploads/example.png",
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(new Uint8Array([1]), { status: 200 });
    try {
      const uploadedBytes = new Uint8Array([137, 80, 78, 71]);
      const packageBlob = await createProjectPackage(
        project,
        null,
        async (path) =>
          path === "uploads/example.png"
            ? new Blob([uploadedBytes], { type: "image/png" })
            : undefined,
      );
      const contents = await readProjectPackageContents(
        new File([await readTestBlob(packageBlob)], "custom.kidgame"),
      );
      const restored = contents.assets.get("uploads/example.png");
      expect(restored?.type).toBe("image/png");
      expect(new Uint8Array(await readTestBlob(restored!))).toEqual(
        uploadedBytes,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects oversized packages before reading their contents", async () => {
    const oversized = {
      name: "oversized.kidgame",
      size: MAX_PROJECT_PACKAGE_BYTES + 1,
      arrayBuffer: () => {
        throw new Error("should not read oversized file");
      },
    } as unknown as File;

    await expect(readProjectPackage(oversized)).rejects.toThrow(
      "KIDGAME_PACKAGE_TOO_LARGE",
    );
  });
});
