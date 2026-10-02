// Hidden ink warms up under the candle. Heat follows the flame slowly — it
// climbs while the candle is close and fades back, more slowly, when it leaves.

export interface RevealTuning {
  /** Distance (px) at which the heat target is full. */
  near: number;
  /** Distance beyond which there is no heat at all. */
  far: number;
  /** Per-second rate towards a higher target. */
  rise: number;
  /** Per-second rate towards a lower target. */
  fall: number;
  /** Once heat reaches this, the line counts as read. */
  readAt: number;
}

export const DEFAULT_REVEAL: RevealTuning = { near: 24, far: 125, rise: 0.5, fall: 0.12, readAt: 0.85 };

export function heatTarget(distance: number, tune: RevealTuning = DEFAULT_REVEAL): number {
  if (distance <= tune.near) return 1;
  if (distance >= tune.far) return 0;
  const t = 1 - (distance - tune.near) / (tune.far - tune.near);
  return t * t; // eased: the last stretch matters most, like real heat
}

export function stepHeat(current: number, target: number, dtSeconds: number, tune: RevealTuning = DEFAULT_REVEAL): number {
  const rate = target > current ? tune.rise : tune.fall;
  const delta = rate * dtSeconds;
  if (Math.abs(target - current) <= delta) return target;
  return current + Math.sign(target - current) * delta;
}

/** Once read, the ink keeps a faint ghost so the player can find it again. */
export function displayedHeat(heat: number, wasRead: boolean): number {
  return wasRead ? Math.max(heat, 0.35) : heat;
}
