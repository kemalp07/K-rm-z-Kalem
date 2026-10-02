// Content schema. Everything a player reads comes from /content as JSON
// shaped like this; components never hold story text.

export type Direction = 'cepheden' | 'cepheye';
export type LetterKind = 'mektup' | 'paket';
export type SegmentKind = 'normal' | 'sensitive' | 'hiddenInk';
export type RevealTool = 'mum';
export type Decision = 'delivered' | 'held' | 'stopped' | 'reported';

/** How the letter was written. Drives font, slant, ink colour and wobble. */
export type Hand = 'careful' | 'hurried' | 'dictated' | 'elegant' | 'clerical';

export interface Segment {
  id: string;
  text: string;
  kind: SegmentKind;
  revealBy?: RevealTool;
}

export interface PackageItem {
  id: string;
  name: string;
  /** Short line the clerk's eye catches when the item is unwrapped. */
  note?: string;
}

export type InspectTarget = 'seal' | 'date';

export interface Inspectable {
  id: string;
  target: InspectTarget;
  note: string;
  /** True when what the magnifier shows is wrong — it becomes a flag. */
  anomaly?: boolean;
}

export interface Seal {
  /** Text pressed into the ink ring. */
  legend: string;
  color: string;
  /** Cut the wrong way round, so the impression reads in a mirror. */
  mirrored?: boolean;
}

/** Things on the paper that are not writing. Purely visual, but authored. */
export interface PaperMark {
  kind: 'tear' | 'thumb' | 'jasmine' | 'mud';
  /** Segment the mark sits beside; omitted means the paper decides. */
  near?: string;
}

/**
 * Flag expressions. Flags are plain strings such as
 *   "d1_mehmet:delivered", "d1_mehmet:censored", "d1_mehmet:censored:s3",
 *   "d1_mehmet:revealed:s5", "d1_imzasiz:inspected:seal".
 */
export interface Condition {
  all?: string[];
  any?: string[];
  none?: string[];
}

export type VariantOp =
  | { op: 'insertAfter'; target: string; segment: Segment }
  | { op: 'insertBefore'; target: string; segment: Segment }
  | { op: 'replace'; target: string; segment: Segment }
  | { op: 'remove'; target: string };

export interface Variant {
  id: string;
  when: Condition;
  ops: VariantOp[];
}

export interface Outcome {
  when?: Condition;
  text: string;
}

export interface Letter {
  id: string;
  threadId: string;
  day: number;
  sender: string;
  recipient: string;
  /** Where it was posted, as written on the envelope. */
  from: string;
  to: string;
  direction: Direction;
  kind: LetterKind;
  /** Printed header on business paper. */
  letterhead?: string;
  /** Date as the writer put it; the magnifier's "date" target. */
  dateLine?: string;
  heading: string;
  hand: Hand;
  segments: Segment[];
  signature?: string;
  items?: PackageItem[];
  seal?: Seal;
  inspectables?: Inspectable[];
  marks?: PaperMark[];
  variants?: Variant[];
  /** First matching entry is shown on the day-end ledger. */
  outcomes: Outcome[];
  /** Free-form data that later systems may use (e.g. acrostics). Not shown. */
  meta?: Record<string, unknown>;
}

export interface Thread {
  id: string;
  /** Person at the front. */
  front: string;
  /** Person at home. */
  home: string;
  homePlace: string;
}

export interface Day {
  day: number;
  calendar: { dayOfMonth: string; month: string; year: string; weekday: string; rumi: string };
  purse: { kurus: number; line: string };
  /** Order envelopes sit in the stack, top first. */
  letters: Letter[];
}

export interface Desk {
  rank: { name: string; title: string };
}
