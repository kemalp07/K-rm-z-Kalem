import { Skia, type SkPath } from '@shopify/react-native-skia';
import { between, rng } from './rand';
import type { Rect } from '../logic/censor';

/**
 * A rectangle whose edges wander a little, like cut paper.
 * `torn` gives one edge (top) a ragged, fibrous tear instead.
 */
export function roughRect(r: Rect, seed: string, wobble = 1.2, torn = false): SkPath {
  const rand = rng(seed);
  const p = Skia.Path.Make();
  const edge = (x0: number, y0: number, x1: number, y1: number, amp: number, step: number, first: boolean) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.round(len / step));
    const nx = -(y1 - y0) / len;
    const ny = (x1 - x0) / len;
    for (let i = first ? 0 : 1; i <= n; i++) {
      const t = i / n;
      const j = i === 0 || i === n ? 0 : between(rand, -amp, amp);
      const x = x0 + (x1 - x0) * t + nx * j;
      const y = y0 + (y1 - y0) * t + ny * j;
      if (first && i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
  };
  const { x, y, w, h } = r;
  edge(x, y, x + w, y, torn ? wobble * 3.2 : wobble, torn ? 3 : 14, true);
  edge(x + w, y, x + w, y + h, wobble, 16, false);
  edge(x + w, y + h, x, y + h, wobble, 16, false);
  edge(x, y + h, x, y, wobble, 16, false);
  p.close();
  return p;
}

/** A loose closed blob — stains, wax drips, felt. */
export function blob(cx: number, cy: number, r: number, seed: string, irregularity = 0.25, points = 14): SkPath {
  const rand = rng(seed);
  const p = Skia.Path.Make();
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const rr = r * (1 + between(rand, -irregularity, irregularity));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  // Smooth through midpoints with quads.
  const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
  const first = mid(pts[pts.length - 1]!, pts[0]!);
  p.moveTo(first[0], first[1]);
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i]!;
    const next = pts[(i + 1) % pts.length]!;
    const m = mid(cur, next);
    p.quadTo(cur[0], cur[1], m[0], m[1]);
  }
  p.close();
  return p;
}

/** A hand-drawn line: slight bow and drift, never ruler-straight. */
export function shakyLine(x0: number, y0: number, x1: number, y1: number, seed: string, amp = 0.8): SkPath {
  const rand = rng(seed);
  const p = Skia.Path.Make();
  p.moveTo(x0, y0);
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 18));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    p.lineTo(x0 + (x1 - x0) * t + between(rand, -amp, amp), y0 + (y1 - y0) * t + between(rand, -amp, amp));
  }
  return p;
}
