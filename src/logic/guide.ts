import { t } from '../content/strings';
import type { Point, Rect } from './censor';
import type { DayState } from './dayFlow';
import { LAYOUT } from '../scene/world';

/** The first morning's voice. Each step waits until the clerk has done it. */
export type GuideStep = 'pile' | 'pen' | 'glass' | 'date' | 'seal' | 'stamp';

type Taught =
  | {
      segments: { id: string; kind: string }[];
      inspectables?: { id: string; target: string; line?: boolean; anomaly?: boolean }[];
    }
  | undefined;

/**
 * Day 1 only. The first letter is taught through to the stamp.
 * A later letter is quiet unless it carries a false seal: that one is still taught,
 * first the writing in the ring, then the thin red circle.
 */
export function guideStep(s: DayState, letterOf: (id: string) => Taught): GuideStep | null {
  if (s.day !== 1 || s.phase !== 'desk' || !s.morningDone) return null;
  const first = s.done.length === 0;
  if (!s.open) return first ? 'pile' : null;
  const letter = letterOf(s.open);
  const prog = s.letters[s.open];
  const sensitive = letter?.segments.filter((seg) => seg.kind === 'sensitive').map((seg) => seg.id) ?? [];
  const censored = new Set(prog?.censored ?? []);
  const dateJob = letter?.inspectables?.find((i) => i.target === 'date' && i.line);
  const sealJob = letter?.inspectables?.find((i) => i.target === 'seal' && i.anomaly);
  const seen = new Set(prog?.inspected ?? []);
  const marked = new Set([...(prog?.marked ?? []), ...(prog?.wrongMarked ?? [])]);
  if (first && sensitive.some((id) => !censored.has(id))) return 'pen';
  if (first && dateJob && !seen.has(dateJob.id)) return 'glass';
  if (first && dateJob && !marked.has('date')) return 'date';
  if (sealJob && !seen.has(sealJob.id)) return 'glass';
  if (sealJob && !marked.has('seal')) return 'seal';
  if (first || sealJob) return 'stamp';
  return null;
}

/** Which thing is in hand, so the next scrap can wait for it. */
export type GuideHold = 'letter' | 'pen' | 'glass' | null;

/** A pencil stroke along one whole line of a sentence. */
export interface GuideStroke {
  a: Point;
  b: Point;
}

export interface GuideCard {
  what: string;
  why: string;
  box: Rect;
  /** Where the arrow lands. */
  tip: Point;
  /** The whole sentence, so the mark is not one word. */
  along?: GuideStroke[];
}

export interface GuideCardInput {
  step: GuideStep;
  hold: GuideHold;
  letterId: string | null;
  /** Top envelope, top-left and size. */
  envelope: { x: number; y: number; w: number; h: number } | null;
  pen: Point;
  /** Middle of the line that still has to be crossed. */
  line: Point | null;
  lens: Point;
  mark: { x: number; y: number; kind: 'date' | 'seal' } | null;
  /** Every line of the sentence the pen still has to cross. */
  lineAlong?: GuideStroke[];
  /** Every line of the place-and-date sentence. */
  markAlong?: GuideStroke[];
  /** The checkbox on the reason slip, once that slip is open. */
  reason?: { x: number; y: number; id: string } | null;
  stamps: Point;
}

const card = (x: number, y: number, w: number, h: number, tip: Point, what: string, why: string, along?: GuideStroke[]): GuideCard => ({
  box: { x, y, w, h },
  tip,
  what,
  why,
  along,
});

function reasonWhy(id: string): string {
  if (id === 'askeri') return t('guide.reason.askeri');
  if (id === 'moral') return t('guide.reason.moral');
  if (id === 'sahte') return t('guide.reason.sahte');
  return t('guide.reason.why');
}

function lineCopy(letterId: string | null): { what: string; why: string } {
  if (letterId === 'd1_mehmet') return { what: t('guide.line.mehmet.what'), why: t('guide.line.mehmet.why') };
  if (letterId === 'd1_hatice') return { what: t('guide.line.hatice.what'), why: t('guide.line.hatice.why') };
  return { what: t('guide.line.what'), why: t('guide.line.why') };
}

/**
 * One scrap at a time. The pile points at the envelope until it is in hand,
 * and only then at the place it goes. The pen and the glass do the same.
 */
export function guideCards(input: GuideCardInput): GuideCard[] {
  const { step, hold } = input;
  if (step === 'pile' && input.envelope) {
    const e = input.envelope;
    const tip = { x: e.x + e.w / 2, y: e.y + e.h / 2 };
    const drop = { x: LAYOUT.letter.x + LAYOUT.letter.w / 2, y: LAYOUT.letter.y + 150 };
    if (hold === 'letter') return [card(drop.x - 118, 52, 236, 58, drop, t('guide.drop.what'), t('guide.drop.why'))];
    return [card(e.x + e.w + 14, e.y + 6, 210, 58, tip, t('guide.pile.what'), t('guide.pile.why'))];
  }
  if (step === 'pen') {
    if (hold === 'pen' && input.line) {
      const copy = lineCopy(input.letterId);
      const tip = input.line;
      const w = 268;
      const h = 72;
      const x = Math.max(308, Math.min(tip.x - w / 2, 650 - w));
      const below = tip.y + 20;
      const y = below + h < LAYOUT.letter.y + LAYOUT.letter.h - 8 ? below : tip.y - h - 14;
      return [card(x, y, w, h, tip, copy.what, copy.why, input.lineAlong)];
    }
    return [card(548, 300, 230, 58, input.pen, t('guide.pen.what'), t('guide.pen.why'))];
  }
  if (step === 'glass') {
    if (input.mark?.kind === 'date' && hold === 'glass') {
      const w = 250;
      const h = 58;
      const x = Math.max(308, Math.min(input.mark.x - w / 2, 660 - w));
      const y = input.mark.y + 22;
      return [card(x, y, w, h, { x: input.mark.x, y: input.mark.y }, t('guide.look.what'), t('guide.look.why'))];
    }
    if (input.mark?.kind === 'seal' && hold === 'glass') {
      const w = 250;
      const h = 58;
      const x = Math.max(308, Math.min(input.mark.x - w / 2, 660 - w));
      const y = Math.max(28, input.mark.y - h - 18);
      return [card(x, y, w, h, { x: input.mark.x, y: input.mark.y }, t('guide.seal.look.what'), t('guide.seal.look.why'))];
    }
    if (hold === 'glass' && input.mark) {
      const w = 268;
      const h = 58;
      const x = Math.max(308, Math.min(input.mark.x - w / 2, 660 - w));
      const y = input.mark.y + 26;
      return [card(x, y, w, h, { x: input.mark.x, y: input.mark.y }, t('guide.mark.what'), t('guide.mark.why'))];
    }
    if (input.mark?.kind === 'seal') return [card(430, 300, 220, 58, input.lens, t('guide.glass.what'), t('guide.seal.pick.why'))];
    return [card(430, 300, 210, 58, input.lens, t('guide.glass.what'), t('guide.glass.why'))];
  }
  if (step === 'seal') {
    if (hold === 'glass' && input.mark) {
      const w = 248;
      const h = 58;
      const x = Math.max(308, Math.min(input.mark.x - w / 2, 660 - w));
      const y = Math.max(28, input.mark.y - h - 18);
      return [card(x, y, w, h, { x: input.mark.x, y: input.mark.y }, t('guide.seal.what'), t('guide.seal.why'))];
    }
    return [card(430, 300, 230, 58, input.lens, t('guide.seal.glass.what'), t('guide.seal.glass.why'))];
  }
  if (step === 'date') {
    if (hold === 'pen' && input.mark) {
      const w = 268;
      const h = 72;
      const x = Math.max(308, Math.min(input.mark.x - w / 2, 660 - w));
      const below = input.mark.y + 18;
      const y = below + h < LAYOUT.letter.y + LAYOUT.letter.h - 8 ? below : input.mark.y - h - 14;
      return [card(x, y, w, h, { x: input.mark.x, y: input.mark.y }, t('guide.date.what'), t('guide.date.why'), input.markAlong)];
    }
    return [card(548, 300, 240, 58, input.pen, t('guide.date.pen.what'), t('guide.date.pen.why'))];
  }
  if (input.reason) {
    const r = input.reason;
    const w = 214;
    const h = 58;
    return [card(Math.max(16, r.x - w - 18), r.y - 6, w, h, { x: r.x, y: r.y + 6 }, t('guide.reason.what'), reasonWhy(r.id))];
  }
  return [card(318, 364, 340, 64, input.stamps, t('guide.stamp.what'), t('guide.stamp.why'))];
}
