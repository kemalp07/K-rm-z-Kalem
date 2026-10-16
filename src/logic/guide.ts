import { t } from '../content/strings';
import type { Point, Rect } from './censor';
import type { DayState } from './dayFlow';
import { LAYOUT } from '../scene/world';

/** The first morning's voice. Each step waits until the clerk has done it. */
export type GuideStep = 'pile' | 'pen' | 'glass' | 'stamp';

type Taught = { segments: { id: string; kind: string }[] } | undefined;

/**
 * Day 1 only, and only until the first letter is decided.
 * The pen step is the open letter's sensitive lines; a letter with none goes on to the glass.
 */
export function guideStep(s: DayState, letterOf: (id: string) => Taught): GuideStep | null {
  if (s.day !== 1 || s.phase !== 'desk' || !s.morningDone) return null;
  if (s.done.length > 0) return null;
  if (!s.open) return 'pile';
  const letter = letterOf(s.open);
  const prog = s.letters[s.open];
  const sensitive = letter?.segments.filter((seg) => seg.kind === 'sensitive').map((seg) => seg.id) ?? [];
  const censored = new Set(prog?.censored ?? []);
  if (sensitive.some((id) => !censored.has(id))) return 'pen';
  const rang = (prog?.marked?.length ?? 0) + (prog?.wrongMarked?.length ?? 0) > 0;
  if (!rang) return 'glass';
  return 'stamp';
}

/** Which thing is in hand, so the next scrap can wait for it. */
export type GuideHold = 'letter' | 'pen' | 'glass' | null;

export interface GuideCard {
  what: string;
  why: string;
  box: Rect;
  /** Where the arrow lands. */
  tip: Point;
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
  stamps: Point;
}

const card = (x: number, y: number, w: number, h: number, tip: Point, what: string, why: string): GuideCard => ({
  box: { x, y, w, h },
  tip,
  what,
  why,
});

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
      const w = 250;
      const h = 58;
      const x = Math.max(308, Math.min(tip.x - w / 2, 650 - w));
      const below = tip.y + 20;
      const y = below + h < LAYOUT.letter.y + LAYOUT.letter.h - 8 ? below : tip.y - h - 14;
      return [card(x, y, w, h, tip, copy.what, copy.why)];
    }
    return [card(548, 300, 230, 58, input.pen, t('guide.pen.what'), t('guide.pen.why'))];
  }
  if (step === 'glass') {
    // A wrong date is a line under the words, drawn as soon as the pen step is done.
    if (input.mark?.kind === 'date') {
      const w = 250;
      const h = 58;
      const x = Math.max(308, Math.min(input.mark.x - w / 2, 660 - w));
      return [card(x, input.mark.y + 16, w, h, { x: input.mark.x, y: input.mark.y }, t('guide.mark.what'), t('guide.mark.why'))];
    }
    if (hold === 'glass' && input.mark) {
      const seal = input.mark.kind === 'seal';
      const w = 268;
      const h = 58;
      const x = Math.max(308, Math.min(input.mark.x - w / 2, 660 - w));
      const y = seal ? input.mark.y - h - 18 : input.mark.y + 26;
      return [
        card(
          x,
          Math.max(28, y),
          w,
          h,
          { x: input.mark.x, y: input.mark.y },
          t(seal ? 'guide.mark.seal.what' : 'guide.mark.what'),
          t(seal ? 'guide.mark.seal.why' : 'guide.mark.why'),
        ),
      ];
    }
    return [card(430, 300, 210, 58, input.lens, t('guide.glass.what'), t('guide.glass.why'))];
  }
  return [card(318, 364, 340, 64, input.stamps, t('guide.stamp.what'), t('guide.stamp.why'))];
}
