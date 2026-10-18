import { afterEach, describe, expect, it } from "vitest";
import { getMediaBaseUrl, setMediaBaseUrl } from "./media";

afterEach(() => setMediaBaseUrl("/"));
describe("Scratch-free media configuration", () => {
  it("supports the domain root", () => {
    expect(getMediaBaseUrl()).toBe("/");
  });
  it("normalizes the shared deployment prefix without doubling slashes", () => {
    setMediaBaseUrl(" /KidsCode ");
    expect(getMediaBaseUrl()).toBe("/KidsCode/");
    setMediaBaseUrl("/KidsCode/");
    expect(getMediaBaseUrl()).toBe("/KidsCode/");
  });
});
