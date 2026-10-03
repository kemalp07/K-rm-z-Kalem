import { Easing } from 'react-native-reanimated';

// One motion language for the desk: things are paper, brass and wood under a lamp,
// so nothing snaps. Movements start gently and settle slowly.

/** Settle: fast start, long soft landing — things put down, things arriving. */
export const SETTLE = Easing.bezier(0.22, 0.61, 0.36, 1);
/** Glide: eases in and out — things carried across the desk on their own. */
export const GLIDE = Easing.bezier(0.45, 0.05, 0.25, 1);

export const T = {
  /** Picking a tool up off the desk. */
  lift: 280,
  /** A tool going back to its place. */
  home: 650,
  /** A letter unfolding after the envelope is opened. */
  unfold: 950,
  /** Pause after the stamp lands, before the letter leaves. */
  stampRest: 650,
  /** The decided letter leaving the desk. */
  leave: 900,
  /** The note slipped beside the magnifier. */
  slipIn: 500,
  slipOut: 900,
  /** The day's ledger sliding in. */
  ledger: 1400,
};

/** An envelope that was let go away from the centre drifts back to the pile. */
export const RETURN_SPRING = { damping: 26, stiffness: 120, mass: 1 };
