import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BLOCK_PALETTE } from "@kids-code/block-adapter/teaching";
import {
  BLOCK_CATEGORY_LABELS,
  BLOCK_CATEGORY_ORDER,
  blockCategoryStyle,
  BlockCategories,
  ProgrammingExample,
} from "./ProgrammingBlocks";

afterEach(cleanup);
describe("programming display blocks", () => {
  it("keeps text readable on every filled example block", () => {
    const luminance = (hex: string) => {
      const channels = hex
        .replace("#", "")
        .match(/.{2}/g)!
        .map((value) => {
          const normalized = parseInt(value, 16) / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
      return (
        channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
      );
    };
    for (const category of BLOCK_CATEGORY_ORDER) {
      const style = blockCategoryStyle(category) as Record<string, unknown>;
      const ink = luminance(String(style["--block-ink"]));
      const face = luminance(BLOCK_PALETTE[category]);
      expect(
        (Math.max(ink, face) + 0.05) / (Math.min(ink, face) + 0.05),
        category,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("shares the eight editor category colors and readable labels", () => {
    const { container } = render(
      <BlockCategories categories={BLOCK_CATEGORY_ORDER} />,
    );
    expect(screen.getByRole("group", { name: "积木类别" })).toBeInTheDocument();
    const chips = container.querySelectorAll<HTMLElement>(".program-category");
    expect(chips).toHaveLength(8);
    for (const [index, category] of BLOCK_CATEGORY_ORDER.entries()) {
      expect(chips[index]?.style.getPropertyValue("--block-color")).toBe(
        BLOCK_PALETTE[category],
      );
      expect(chips[index]).toHaveTextContent(BLOCK_CATEGORY_LABELS[category]);
    }
  });
  it.each(["row", "stack"] as const)(
    "labels the %s example as non-interactive",
    (layout) => {
      const { container } = render(<ProgrammingExample layout={layout} />);
      expect(
        screen.getByRole("img", { name: /非可拖动工作区/ }),
      ).toBeInTheDocument();
      expect(
        container.querySelectorAll("button, input, select, [draggable=true]"),
      ).toHaveLength(0);
      expect(container.querySelectorAll(".program-display-block")).toHaveLength(
        3,
      );
      expect(container.querySelector("[data-hat=true]")).toHaveAttribute(
        "data-category",
        "event",
      );
      expect(
        container.querySelector(".program-green-flag"),
      ).toBeInTheDocument();
    },
  );
});
