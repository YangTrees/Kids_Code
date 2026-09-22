export interface RectBounds {
  kind: "rect";
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface CircleBounds {
  kind: "circle";
  x: number;
  y: number;
  radius: number;
}

export type CollisionBounds = RectBounds | CircleBounds;

const EPSILON = 0.001;

export const rectsTouch = (a: RectBounds, b: RectBounds): boolean =>
  !(
    a.maxX < b.minX - EPSILON ||
    a.minX > b.maxX + EPSILON ||
    a.maxY < b.minY - EPSILON ||
    a.minY > b.maxY + EPSILON
  );

/** Sweep to the first solid edge, allowing movement away from / along contact. */
export function sweepSolidMotion(
  moving: RectBounds,
  obstacles: RectBounds[],
  dx: number,
  dy: number,
) {
  let x = dx;
  for (const b of obstacles) {
    if (moving.maxY <= b.minY + EPSILON || moving.minY >= b.maxY - EPSILON)
      continue;
    if (dx > 0 && moving.maxX <= b.minX + EPSILON)
      x = Math.min(x, Math.max(0, b.minX - moving.maxX));
    if (dx < 0 && moving.minX >= b.maxX - EPSILON)
      x = Math.max(x, Math.min(0, b.maxX - moving.minX));
  }
  let y = dy;
  for (const b of obstacles) {
    if (
      moving.maxX + x <= b.minX + EPSILON ||
      moving.minX + x >= b.maxX - EPSILON
    )
      continue;
    if (dy > 0 && moving.maxY <= b.minY + EPSILON)
      y = Math.min(y, Math.max(0, b.minY - moving.maxY));
    if (dy < 0 && moving.minY >= b.maxY - EPSILON)
      y = Math.max(y, Math.min(0, b.maxY - moving.minY));
  }
  return { x, y };
}

export function rotatedBounds(
  bounds: RectBounds,
  x: number,
  y: number,
  angle: number,
): RectBounds {
  const points = [
    [bounds.minX, bounds.minY],
    [bounds.maxX, bounds.minY],
    [bounds.maxX, bounds.maxY],
    [bounds.minX, bounds.maxY],
  ].map(([px, py]) => ({
    x: x + (px! - x) * Math.cos(angle) - (py! - y) * Math.sin(angle),
    y: y + (px! - x) * Math.sin(angle) + (py! - y) * Math.cos(angle),
  }));
  return {
    kind: "rect",
    minX: Math.min(...points.map((p) => p.x)),
    maxX: Math.max(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxY: Math.max(...points.map((p) => p.y)),
  };
}

export function collisionShapesTouch(
  a: CollisionBounds,
  b: CollisionBounds,
): boolean {
  if (a.kind === "circle" && b.kind === "circle") {
    return Math.hypot(a.x - b.x, a.y - b.y) <= a.radius + b.radius;
  }
  if (a.kind === "rect" && b.kind === "rect") return rectsTouch(a, b);
  const circle: CircleBounds = a.kind === "circle" ? a : (b as CircleBounds);
  const rect: RectBounds = a.kind === "rect" ? a : (b as RectBounds);
  const nearestX = Math.max(rect.minX, Math.min(circle.x, rect.maxX));
  const nearestY = Math.max(rect.minY, Math.min(circle.y, rect.maxY));
  return Math.hypot(circle.x - nearestX, circle.y - nearestY) <= circle.radius;
}
