import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAssetBaseUrl,
  setAssetBaseUrl,
  resolveAssetUrl,
  registerLocalAssetUrl,
  unregisterLocalAssetUrl,
} from "./assets";

afterEach(() => {
  setAssetBaseUrl("/");
  unregisterLocalAssetUrl("uploads/test.png");
  vi.restoreAllMocks();
});
describe("renderer-free asset configuration", () => {
  it("normalizes root and subpath prefixes", () => {
    expect(getAssetBaseUrl()).toBe("/");
    setAssetBaseUrl(" /KidsCode ");
    expect(getAssetBaseUrl()).toBe("/KidsCode/");
    expect(resolveAssetUrl("characters/actor.webp")).toBe(
      "/KidsCode/assets/characters/actor.webp",
    );
    setAssetBaseUrl("/KidsCode/");
    expect(resolveAssetUrl("sounds/bell.wav")).toBe(
      "/KidsCode/assets/sounds/bell.wav",
    );
  });
  it("preserves a local upload across prefix changes and releases replaced URLs", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    registerLocalAssetUrl("uploads/test.png", "blob:first");
    setAssetBaseUrl("/KidsCode/");
    expect(resolveAssetUrl("uploads/test.png")).toBe("blob:first");
    registerLocalAssetUrl("uploads/test.png", "blob:first");
    expect(revoke).not.toHaveBeenCalled();
    registerLocalAssetUrl("uploads/test.png", "blob:second");
    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:first");
    expect(resolveAssetUrl("uploads/test.png")).toBe("blob:second");
    unregisterLocalAssetUrl("uploads/test.png");
    expect(revoke).toHaveBeenLastCalledWith("blob:second");
    expect(resolveAssetUrl("uploads/test.png")).toBe(
      "/KidsCode/assets/uploads/test.png",
    );
  });
});
