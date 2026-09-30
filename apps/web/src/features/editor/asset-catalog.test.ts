import { describe, expect, it } from "vitest";
import {
  allLibraryAssets,
  backgroundLibrary,
  soundLibrary,
  spriteLibrary,
} from "./asset-catalog";

const assets = [...allLibraryAssets()];

describe("asset catalog", () => {
  it("meets the minimum built-in library size from appendix B", () => {
    expect(spriteLibrary.length).toBeGreaterThanOrEqual(12);
    expect(backgroundLibrary.length).toBeGreaterThanOrEqual(10);
    expect(soundLibrary.length).toBeGreaterThanOrEqual(15);
  });

  it("uses stable lowercase ids and paths", () => {
    for (const asset of assets) {
      expect(asset.assetId).toMatch(/^[a-z0-9_]+$/);
      expect(asset.path).toMatch(/^[a-z0-9/_.-]+$/);
      expect(asset.path).not.toMatch(/[\s一-龥]/);
    }
  });

  it("keeps asset ids unique across the whole catalog", () => {
    const ids = assets.map((asset) => asset.assetId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // 设计说明书 10.2.1：每个内置素材必须携带 provenance。
  it("records provenance for every built-in asset", () => {
    for (const asset of assets) {
      expect(asset.provenance, asset.assetId).toBeDefined();
      expect(asset.provenance.license.length).toBeGreaterThan(0);
      expect(["pending", "approved", "rejected"]).toContain(
        asset.provenance.commercialUseReview,
      );
      expect([
        "draft",
        "approved-prototype",
        "approved-release",
        "retired",
      ]).toContain(asset.provenance.reviewStatus);
      expect(typeof asset.provenance.canUnpublish).toBe("boolean");
    }
  });

  it("never ships third-party assets without a source location", () => {
    for (const asset of assets) {
      if (asset.provenance.sourceType !== "third-party-open-source") continue;
      expect(asset.provenance.sourceRepo).toBeTruthy();
      expect(asset.provenance.sourcePath).toBeTruthy();
      expect(asset.provenance.sourceCommit).toBeTruthy();
    }
  });

  it("blocks release while commercial review is unfinished", () => {
    const unreviewed = assets.filter(
      (asset) =>
        asset.provenance.reviewStatus === "approved-release" &&
        asset.provenance.commercialUseReview !== "approved",
    );
    expect(unreviewed).toEqual([]);
  });
});
