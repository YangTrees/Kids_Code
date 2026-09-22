import { describe, expect, it } from "vitest";
import {
  collisionShapesTouch,
  sweepSolidMotion,
  rotatedBounds,
  type RectBounds,
} from "./geometry";

const rect = (
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): RectBounds => ({ kind: "rect", minX, minY, maxX, maxY });

describe("stage collision geometry", () => {
  it("stops a large movement at the first obstacle without tunnelling", () => {
    expect(
      sweepSolidMotion(
        rect(0, 0, 20, 20),
        [rect(80, 0, 100, 20), rect(40, 0, 60, 20)],
        200,
        0,
      ),
    ).toEqual({ x: 20, y: 0 });
    expect(
      sweepSolidMotion(rect(100, 0, 120, 20), [rect(40, 0, 60, 20)], -200, 0),
    ).toEqual({ x: -40, y: 0 });
  });

  it("allows leaving contact and sliding along a wall", () => {
    const wall = rect(20, 0, 40, 80);
    expect(sweepSolidMotion(rect(0, 0, 20, 20), [wall], 40, 30)).toEqual({
      x: 0,
      y: 30,
    });
    expect(sweepSolidMotion(rect(0, 0, 20, 20), [wall], -40, 0)).toEqual({
      x: -40,
      y: 0,
    });
  });

  it("does not pull a previously overlapping sprite to the opposite side", () => {
    expect(
      sweepSolidMotion(rect(10, 0, 30, 20), [rect(20, 0, 40, 20)], -10, 0),
    ).toEqual({ x: -10, y: 0 });
  });

  it("rotates the hit area around the sprite anchor", () => {
    const bounds = rotatedBounds(rect(-10, -40, 10, 0), 0, 0, Math.PI / 2);
    expect(bounds.minX).toBeCloseTo(0);
    expect(bounds.maxX).toBeCloseTo(40);
    expect(bounds.minY).toBeCloseTo(-10);
    expect(bounds.maxY).toBeCloseTo(10);
  });
  it("treats touching rectangle edges as an enter collision", () => {
    expect(collisionShapesTouch(rect(0, 0, 20, 20), rect(20, 0, 40, 20))).toBe(
      true,
    );
  });

  it("uses a circular hit area for collectibles", () => {
    const coin = { kind: "circle" as const, x: 30, y: 30, radius: 8 };
    expect(collisionShapesTouch(rect(0, 20, 22, 40), coin)).toBe(true);
    expect(collisionShapesTouch(rect(0, 20, 18, 40), coin)).toBe(false);
  });

  it("does not collide after two shapes separate", () => {
    expect(collisionShapesTouch(rect(0, 0, 10, 10), rect(11, 0, 20, 10))).toBe(
      false,
    );
  });
});
