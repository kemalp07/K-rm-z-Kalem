// Censoring is measured, not guessed: each line the pen must cover is cut into
// narrow columns, and a column counts once the stroke has passed over it.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface LineCoverage {
  rect: Rect;
  cols: boolean[];
}

export const COLUMN_WIDTH = 6;
export const COVERED_RATIO = 0.9;

export function makeCoverage(rects: Rect[], columnWidth = COLUMN_WIDTH): LineCoverage[] {
  return rects.map((rect) => ({
    rect,
    cols: new Array<boolean>(Math.max(1, Math.ceil(rect.w / columnWidth))).fill(false),
  }));
}

/**
 * Marks every column the segment a→b passes over. `reach` is how far from a
 * line's centre the nib may wander and still hit it (pen thickness + slack).
 * Mutates in place; returns true when something new was covered.
 */
export function strokeOver(lines: LineCoverage[], a: Point, b: Point, reach: number): boolean {
  let changed = false;
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    for (const line of lines) {
      const { rect, cols } = line;
      const cy = rect.y + rect.h / 2;
      if (Math.abs(y - cy) > rect.h / 2 + reach) continue;
      const colW = rect.w / cols.length;
      const from = Math.floor((x - reach - rect.x) / colW);
      const to = Math.floor((x + reach - rect.x) / colW);
      for (let c = Math.max(0, from); c <= Math.min(cols.length - 1, to); c++) {
        if (!cols[c]) {
          cols[c] = true;
          changed = true;
        }
      }
    }
  }
  return changed;
}

export function coverageRatio(lines: LineCoverage[]): number {
  let total = 0;
  let hit = 0;
  for (const { cols } of lines) {
    total += cols.length;
    for (const c of cols) if (c) hit++;
  }
  return total === 0 ? 0 : hit / total;
}

export function isBlackedOut(lines: LineCoverage[], threshold = COVERED_RATIO): boolean {
  // Every line must be mostly covered, not just the sum — one untouched line leaks.
  return lines.length > 0 && lines.every((l) => coverageRatio([l]) >= threshold);
}
