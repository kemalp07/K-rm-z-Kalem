// Censoring is measured, not guessed: each line the pen must cover is cut into
// narrow columns. One slow sweep of the nib marks a column. A fast, thin stroke
// is told not to count, so the words stay.

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
  /** How many separate sweeps have crossed this column. */
  cols: number[];
  /** The nib is on this column during the sweep in progress. */
  down: boolean[];
  /** +1 when the current sweep runs to the right, −1 to the left. */
  dir: number;
}

export const COLUMN_WIDTH = 6;
export const COVERED_RATIO = 0.9;
/** One slow pass lays enough wax. The desk only counts a stroke this fat. */
export const PASSES_TO_BURY = 1;

export function makeCoverage(rects: Rect[], columnWidth = COLUMN_WIDTH): LineCoverage[] {
  return rects.map((rect) => {
    const n = Math.max(1, Math.ceil(rect.w / columnWidth));
    return {
      rect,
      cols: new Array<number>(n).fill(0),
      down: new Array<boolean>(n).fill(false),
      dir: 0,
    };
  });
}

/**
 * Marks every column the segment a→b passes over. `reach` is how far from a
 * line's centre the nib may wander and still hit it (pen thickness + slack).
 * A column counts once per sweep: the nib must leave it, or reverse direction,
 * before the next pass counts. `counts` is false for a thin, rushed stroke:
 * the wax is on the paper, but the line is not censored. Mutates in place;
 * returns true when a column gained a pass.
 */
export function strokeOver(lines: LineCoverage[], a: Point, b: Point, reach: number, counts = true): boolean {
  if (!counts) return false;
  const dx = b.x - a.x;
  if (Math.abs(dx) > 0.4) {
    const dir = dx > 0 ? 1 : -1;
    for (const line of lines) {
      if (line.dir !== 0 && line.dir !== dir) line.down.fill(false);
      line.dir = dir;
    }
  }

  let changed = false;
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    for (const line of lines) {
      const { rect, cols, down } = line;
      const cy = rect.y + rect.h / 2;
      const onLine = Math.abs(y - cy) <= rect.h / 2 + reach;
      const colW = rect.w / cols.length;
      for (let c = 0; c < cols.length; c++) {
        const cx = rect.x + (c + 0.5) * colW;
        const hit = onLine && Math.abs(x - cx) <= colW / 2 + reach;
        if (hit) {
          if (!down[c]) {
            cols[c] = (cols[c] ?? 0) + 1;
            down[c] = true;
            changed = true;
          }
        } else if (down[c]) {
          down[c] = false;
        }
      }
    }
  }
  return changed;
}

/** Share of columns the nib has crossed at least once. */
export function coverageRatio(lines: LineCoverage[]): number {
  let total = 0;
  let hit = 0;
  for (const { cols } of lines) {
    total += cols.length;
    for (const c of cols) if (c >= 1) hit++;
  }
  return total === 0 ? 0 : hit / total;
}

function buryRatio(line: LineCoverage): number {
  const n = line.cols.length;
  if (n === 0) return 0;
  let buried = 0;
  for (const c of line.cols) if (c >= PASSES_TO_BURY) buried++;
  return buried / n;
}

export function isBlackedOut(lines: LineCoverage[], threshold = COVERED_RATIO): boolean {
  // Every line must be buried, not just the sum — one untouched line leaks.
  return lines.length > 0 && lines.every((l) => buryRatio(l) >= threshold);
}

/** How much of an underline has to run under the words before it counts. */
export const UNDERLINE_RATIO = 0.55;

/**
 * The strip just under a date, where a line is drawn. A tick through the
 * words stays above it; a stroke along the feet of the letters lands in it.
 */
export function underlineBand(rect: Rect): Rect {
  const h = 10;
  return { x: rect.x - 6, y: rect.y + rect.h - 3, w: rect.w + 12, h };
}

/** True once the nib has travelled most of the way along every line of the sentence. */
export function isUnderlined(lines: LineCoverage[], threshold = UNDERLINE_RATIO): boolean {
  return lines.length > 0 && lines.every((line) => {
    const n = line.cols.length;
    if (n === 0) return false;
    let hit = 0;
    for (const c of line.cols) if (c >= 1) hit++;
    return hit / n >= threshold;
  });
}
