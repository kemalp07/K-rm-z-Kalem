// Pure geometry for touches on the board. No React, no Skia — easy to test.
import type { Point, Rect } from '../logic/censor';

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

export function distToRect(p: Point, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** Is p inside a w×h rect whose top-left sits at (x,y) and is rotated by `angle` about that corner? */
export function inRotatedRect(p: Point, x: number, y: number, w: number, h: number, angle: number): boolean {
  const dx = p.x - x;
  const dy = p.y - y;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const lx = dx * c + dy * s;
  const ly = -dx * s + dy * c;
  return lx >= 0 && lx <= w && ly >= 0 && ly <= h;
}

/** The far end of a stick drawn from `nib` along local -y, turned by `angle`. */
export const stickEnd = (nib: Point, angle: number, length: number): Point => ({
  x: nib.x + Math.sin(angle) * length,
  y: nib.y - Math.cos(angle) * length,
});

export const clampTo = (p: Point, r: Rect, margin = 0): Point => ({
  x: Math.min(r.x + r.w - margin, Math.max(r.x + margin, p.x)),
  y: Math.min(r.y + r.h - margin, Math.max(r.y + margin, p.y)),
});
