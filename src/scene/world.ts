// The desk is laid out on a fixed 1000×560 board and scaled to cover the screen.
// Every hit test and every rect below is in board ("world") units.
import type { Rect } from '../logic/censor';

export const WORLD = { w: 1000, h: 560 };

/**
 * The desk itself runs past the board on both sides, so phones wider than 16:9
 * see more wood instead of a black edge. Nothing interactive lives out there.
 */
export const DESK_EXTENT = { x: -320, y: 0, w: 1640, h: 560 };

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
  plate: { x: 816, y: 497, w: 150, h: 60 },
  letter: { x: 300, y: 22, w: 360, h: 410 },
  dropZone: { x: 270, y: 10, w: 420, h: 440 },
  stamps: { x: 296, y: 446, w: 368, h: 64 },
  items: { x: 196, y: 458, w: 100, h: 90 },
  /** Oil lamp drawn in three-quarter view: base on the desk, flame up in the chimney. */
  lamp: { cx: 905, baseY: 96, flameY: 96 },
  tray: { x: 804, y: 196, w: 180, h: 120 },
  purse: { x: 836, y: 398, w: 120, h: 93 },
  ledger: { x: 240, y: 40, w: 520, h: 470 },
  rest: {
    pen: { x: 700, y: 118, angle: Math.PI - 0.22 },
    candle: { x: 790, y: 360 },
    magnifier: { x: 704, y: 384 },
  },
} as const;
