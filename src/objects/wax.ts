import { Skia, type SkPath } from '@shopify/react-native-skia';

export interface WaxPoint {
  x: number;
  y: number;
  r: number;
}

/**
 * How fat this bit of grease pencil is. A slow hand leaves a short gap between
 * samples and lays down thick wax; a fast hand leaves a thin, broken line.
 */
export function waxRadius(gap: number): number {
  if (gap < 3.5) return 8.4;
  if (gap < 7) return 6.4;
  if (gap < 12) return 4.6;
  return 3.1;
}

/** A gap wider than this splits the stroke, so a rushed line breaks. */
const BREAK = 16;

function circle(b: ReturnType<typeof Skia.PathBuilder.Make>, x: number, y: number, r: number) {
  const k = 0.5522847498 * r;
  b.moveTo(x, y - r);
  b.cubicTo(x + k, y - r, x + r, y - k, x + r, y);
  b.cubicTo(x + r, y + k, x + k, y + r, x, y + r);
  b.cubicTo(x - k, y + r, x - r, y + k, x - r, y);
  b.cubicTo(x - r, y - k, x - k, y - r, x, y - r);
  b.close();
}

/** The pencil's own mark: a filled ribbon, thick where the hand was slow. */
export function waxRibbon(pts: WaxPoint[]): SkPath {
  const b = Skia.PathBuilder.Make();
  const runs: WaxPoint[][] = [];
  let run: WaxPoint[] = [];
  for (const p of pts) {
    const prev = run[run.length - 1];
    if (prev && Math.hypot(p.x - prev.x, p.y - prev.y) > BREAK) {
      runs.push(run);
      run = [];
    }
    run.push(p);
  }
  if (run.length) runs.push(run);

  for (const r of runs) {
    const first = r[0];
    if (!first) continue;
    if (r.length === 1) {
      circle(b, first.x, first.y, first.r);
      continue;
    }
    const left: { x: number; y: number }[] = [];
    const right: { x: number; y: number }[] = [];
    for (let i = 0; i < r.length; i++) {
      const p = r[i]!;
      const a = r[Math.max(0, i - 1)]!;
      const c = r[Math.min(r.length - 1, i + 1)]!;
      let dx = c.x - a.x;
      let dy = c.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const nx = -dy;
      const ny = dx;
      left.push({ x: p.x + nx * p.r, y: p.y + ny * p.r });
      right.push({ x: p.x - nx * p.r, y: p.y - ny * p.r });
    }
    const start = left[0]!;
    b.moveTo(start.x, start.y);
    for (let i = 1; i < left.length; i++) b.lineTo(left[i]!.x, left[i]!.y);
    for (let i = right.length - 1; i >= 0; i--) b.lineTo(right[i]!.x, right[i]!.y);
    b.close();
  }
  return b.build();
}
