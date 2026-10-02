// The desk is laid out on a fixed 1000×560 board and scaled to cover the screen.
// Every hit test and every rect below is in board ("world") units.
import type { Rect } from '../logic/censor';

export const WORLD = { w: 1000, h: 560 };

export interface Fit {
  scale: number;
  ox: number;
  oy: number;
}

/** Contain-fit: the whole board is always visible; the margins are dark desk. */
export function fitWorld(screenW: number, screenH: number): Fit {
  const scale = Math.min(screenW / WORLD.w, screenH / WORLD.h);
  return { scale, ox: (screenW - WORLD.w * scale) / 2, oy: (screenH - WORLD.h * scale) / 2 };
}

export const toWorld = (fit: Fit, x: number, y: number) => ({ x: (x - fit.ox) / fit.scale, y: (y - fit.oy) / fit.scale });

export const inRect = (p: { x: number; y: number }, r: Rect, pad = 0) =>
  p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;

export const LAYOUT = {
  window: { x: 0, y: 0, w: 150, h: 235 },
  calendar: { x: 172, y: 26, w: 92, h: 118 },
  stack: { x: 34, y: 286, w: 200, h: 170 },
  plate: { x: 26, y: 500, w: 170, h: 40 },
  letter: { x: 300, y: 22, w: 360, h: 410 },
  dropZone: { x: 270, y: 10, w: 420, h: 440 },
  stamps: { x: 296, y: 446, w: 368, h: 64 },
  items: { x: 196, y: 458, w: 100, h: 90 },
  lamp: { cx: 905, cy: 92, r: 62 },
  tray: { x: 804, y: 196, w: 180, h: 120 },
  purse: { x: 836, y: 410, w: 120, h: 64 },
  ledger: { x: 240, y: 40, w: 520, h: 470 },
  rest: {
    pen: { x: 700, y: 118, angle: Math.PI - 0.22 },
    candle: { x: 760, y: 352 },
    magnifier: { x: 735, y: 470 },
  },
} as const;
