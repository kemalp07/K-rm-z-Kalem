// Content schema. Everything a player reads comes from /content as JSON
// shaped like this; components never hold story text.

export type Direction = 'cepheden' | 'cepheye';
export type LetterKind = 'mektup' | 'paket';
export type SegmentKind = 'normal' | 'sensitive' | 'hiddenInk';
export type RevealTool = 'mum';
export type Decision = 'delivered' | 'held' | 'stopped' | 'reported';

/** How the letter was written. Drives font, slant, ink colour and wobble. */
export type Hand = 'careful' | 'hurried' | 'dictated' | 'elegant' | 'clerical';

/** Where hidden ink sits: squeezed between lines, up the left margin, or under the signature. */
export type InkPlace = 'between' | 'margin' | 'foot';

export interface Segment {
  id: string;
  text: string;
  kind: SegmentKind;
  revealBy?: RevealTool;
  /** Hidden ink only; `between` when absent. */
  place?: InkPlace;
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
 *   "d1_mehmet:revealed:s5", "d1_imzasiz:marked:seal" (ringed in red),
 *   "d1_mehmet:wrongmark:date" (ringed, but it was in order).
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
  /**
   * Reasons (booklet `reasons` ids) that hold for stopping or reporting this letter.
   * Empty: nothing in it justifies either. Absent: the ledger does not judge the reason.
   */
  reasons?: string[];
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
  /** How many one-off side letters (content/pool_letters.json) join the day's stack. */
  sideLetters?: number;
}

export type Tool = 'pen' | 'magnifier' | 'candle';

export interface Desk {
  rank: { name: string; title: string };
  /** The day each tool is issued; until then it is not on the desk. */
  tools: Record<Tool, number>;
}

export type HelpId = 'rules' | 'pen' | 'candle' | 'magnifier' | 'stamps';

/** An instruction sheet on the desk: the Şube's rules, or the note left beside a tool. */
export interface HelpSheet {
  id: HelpId;
  /** Word written on the folded slip. */
  tag: string;
  title: string;
  subtitle?: string;
  lines: string[];
  footer?: string;
}

/** One numbered or dashed line in the Talimatname; a line may arrive on a later day. */
export type BookletItem = string | { text: string; day: number };

export interface BookletSeal {
  legend: string;
  color: string;
  /** Drawn in the middle; a postmark carries a date instead. */
  symbol?: 'anchor' | 'wheat' | 'crescent';
  center?: string;
  double?: boolean;
  caption: string;
}

export type BookletBlock =
  | { t: 'p'; text: string }
  | { t: 'num' | 'dash' | 'no'; items: BookletItem[] }
  | { t: 'table'; rows: string[][]; head?: boolean }
  | { t: 'seals'; items: BookletSeal[] };

export interface BookletPage {
  id: string;
  /** Sort key; continuation pages sit at n + 0.5. */
  n: number;
  /** Shown instead of n when present ("6 (devamı)"). */
  label?: string;
  /** First day the page is pasted into the booklet. */
  day: number;
  title: string;
  blocks: BookletBlock[];
}

/** A stiff sample card for the desk, carrying one page's seal examples to set beside a letter. */
export interface SampleCard {
  id: string;
  day: number;
  title: string;
  note: string;
  /** Booklet page whose `seals` block the card shows. */
  page: string;
}

/** One line of the reason slip that comes with DURDUR and İSTİHBARAT. */
export interface Reason {
  id: string;
  day: number;
  label: string;
}

export interface Booklet {
  cards: SampleCard[];
  reasonSlip: { title: string; hint: string };
  reasons: Reason[];
  cover: { label: string; title: string; subtitle: string; lines: string[]; note: string };
  noTitle: string;
  pageLabel: string;
  turnHint: string;
  pages: BookletPage[];
}
