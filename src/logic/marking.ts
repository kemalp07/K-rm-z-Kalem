/** Ringing something in red pencil: telling a closed loop from a scribble, and what it holds. */

export interface Pt {
  x: number;
  y: number;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

function area(points: Pt[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

/**
 * A ring: ends close together compared with how far the line went, and it encloses a real
 * area (a back-and-forth scribble over a line does not).
 */
export function isClosedLoop(points: Pt[]): boolean {
  if (points.length < 8) return false;
  let length = 0;
  for (let i = 1; i < points.length; i++) length += dist(points[i - 1]!, points[i]!);
  if (length < 60) return false;
  const gap = dist(points[0]!, points[points.length - 1]!);
  if (gap > Math.max(26, length * 0.2)) return false;
  return area(points) > length * 4;
}

/** Ray casting; the loop is closed implicitly. */
export function inside(polygon: Pt[], p: Pt): boolean {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

export interface MarkTarget extends Pt {
  target: string;
  /** True when the thing is really wrong. */
  anomaly: boolean;
}

/** Targets whose centre the ring encloses. */
export function ringed(loop: Pt[], targets: MarkTarget[]): MarkTarget[] {
  return targets.filter((t) => inside(loop, t));
}
