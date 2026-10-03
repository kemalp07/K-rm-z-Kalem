import type { MarkTarget } from '../logic/marking';
import { FontWeight, type SkParagraph, type SkTypefaceFontProvider } from '@shopify/react-native-skia';
import type { Hand, Letter, Postmark, Segment } from '../content/types';
import type { Rect } from '../logic/censor';
import { makeParagraph, type TextSpec } from '../scene/fonts';
import { C } from '../scene/palette';
import { between, rng } from '../scene/rand';

export interface PaperStyle {
  color: string;
  /** Top edge torn out of a notebook. */
  torn: boolean;
  wobble: number;
  ruled?: string;
  border?: string;
  grain: number;
}

interface HandStyle {
  text: TextSpec;
  hidden: TextSpec;
  /** Horizontal shear of the writing, radians; negative leans the letters right. */
  skew: number;
  /** How far each line drifts from where it should start, in px. */
  drift: number;
  /** Max tilt per line, radians. */
  tilt: number;
  /** Lean every line shares: hurried lines climb, slow dictation sags. */
  rise: number;
  gap: number;
  paper: PaperStyle;
}

const hiddenSpec = (size: number): TextSpec => ({ family: 'Caveat', size, color: '#7a3a12', weight: FontWeight.Medium });

const HANDS: Record<Hand, HandStyle> = {
  hurried: {
    text: { family: 'Caveat', size: 19, color: C.ink, weight: FontWeight.Medium, lineHeight: 1.02 },
    hidden: hiddenSpec(16),
    skew: -0.1,
    drift: 3,
    tilt: 0.008,
    rise: -0.018,
    gap: 5,
    paper: { color: '#e6dcc2', torn: true, wobble: 1.4, ruled: 'rgba(80,100,130,0.16)', grain: 0.22 },
  },
  elegant: {
    text: { family: 'Caveat', size: 19, color: C.inkBlue, letterSpacing: 0.3, lineHeight: 1.05 },
    hidden: hiddenSpec(16),
    skew: -0.18,
    drift: 0.8,
    tilt: 0.004,
    rise: 0,
    gap: 7,
    paper: { color: '#f1e6cc', torn: false, wobble: 0.5, border: 'rgba(150,80,80,0.35)', grain: 0.14 },
  },
  dictated: {
    text: { family: 'Caveat', size: 19, color: '#1d1813', weight: FontWeight.SemiBold, lineHeight: 1.0 },
    hidden: hiddenSpec(16),
    skew: 0.05,
    drift: 4.5,
    tilt: 0.016,
    rise: 0.01,
    gap: 6,
    paper: { color: C.paperCheap, torn: false, wobble: 1.8, grain: 0.3 },
  },
  careful: {
    text: { family: 'Caveat', size: 19, color: '#3b2b1d', lineHeight: 1.04 },
    hidden: hiddenSpec(16),
    skew: -0.03,
    drift: 1.2,
    tilt: 0.006,
    rise: -0.004,
    gap: 7,
    paper: { color: C.paper, torn: false, wobble: 1.0, grain: 0.18 },
  },
  clerical: {
    text: { family: 'Cormorant', size: 15.5, color: '#2a2522', letterSpacing: 0.5, weight: FontWeight.SemiBold, lineHeight: 1.12 },
    hidden: hiddenSpec(15),
    skew: 0,
    drift: 0.3,
    tilt: 0,
    rise: 0,
    gap: 8,
    paper: { color: '#f2ead8', torn: false, wobble: 0.35, grain: 0.1 },
  },
};

export const paperStyleOf = (hand: Hand) => HANDS[hand].paper;

export interface Laid {
  para: SkParagraph;
  x: number;
  y: number;
  width: number;
  /** Tilt and shear applied around the block's top-left. */
  tilt: number;
  skew: number;
}

export interface LaidSegment extends Laid {
  seg: Segment;
  /**
   * One rect per wrapped line, in the block's upright frame (before tilt and shear).
   * Compare against points passed through toLocalFrame; draw inside the block transform.
   */
  lines: Rect[];
}

export interface LetterLayout {
  paper: Rect;
  letterhead?: Laid;
  date?: Laid & { rect: Rect };
  heading: Laid;
  segments: LaidSegment[];
  signature?: Laid;
  seal?: { cx: number; cy: number; r: number };
  postmark?: Postmark & { cx: number; cy: number; r: number; rot: number };
}

const PAD = 28;

function lineRects(para: SkParagraph, len: number, ox: number, oy: number): Rect[] {
  // Skia gives one box per run; merge boxes sharing a baseline into a line.
  const boxes = para.getRectsForRange(0, len);
  const byLine = new Map<number, Rect>();
  for (const b of boxes) {
    const key = Math.round(b.y / 4);
    const prev = byLine.get(key);
    const r = { x: ox + b.x, y: oy + b.y, w: b.width, h: b.height };
    if (!prev) byLine.set(key, r);
    else {
      const x0 = Math.min(prev.x, r.x);
      const x1 = Math.max(prev.x + prev.w, r.x + r.w);
      byLine.set(key, { x: x0, y: Math.min(prev.y, r.y), w: x1 - x0, h: Math.max(prev.h, r.h) });
    }
  }
  return [...byLine.values()].filter((r) => r.w > 1).sort((a, b) => a.y - b.y);
}

export function layoutLetter(provider: SkTypefaceFontProvider, letter: Letter, segments: Segment[], paper: Rect, postmark?: Postmark): LetterLayout {
  const hand = HANDS[letter.hand];
  // If a long letter overflows, the writer simply wrote smaller.
  for (let shrink = 0; shrink < 5; shrink++) {
    const result = attempt(provider, letter, segments, paper, hand, shrink, postmark);
    const bottom = result.signature ? result.signature.y + result.signature.para.getHeight() : 0;
    if (bottom <= paper.y + paper.h - 80 || shrink === 4) return result;
  }
  throw new Error('unreachable');
}

function attempt(
  provider: SkTypefaceFontProvider,
  letter: Letter,
  segments: Segment[],
  paper: Rect,
  hand: HandStyle,
  shrink: number,
  postmark?: Postmark,
): LetterLayout {
  const r = rng(letter.id);
  const text = { ...hand.text, size: hand.text.size - shrink };
  const hidden = { ...hand.hidden, size: hand.hidden.size - shrink * 0.6 };
  const width = paper.w - PAD * 2;
  const left = paper.x + PAD;
  let y = paper.y + PAD - 6;

  const out: LetterLayout = { paper } as LetterLayout;

  if (letter.letterhead) {
    const para = makeParagraph(provider, letter.letterhead, { family: 'Cormorant', size: 12.5, color: '#3a2f2a', weight: FontWeight.Bold, letterSpacing: 1.6, align: 'center' }, width);
    out.letterhead = { para, x: left, y, width, tilt: 0, skew: 0 };
    y += para.getHeight() + 14;
  }

  if (letter.dateLine) {
    // Wide enough for "Ordu-yı Hümayun, 26 Mayıs 1331" on one line.
    const dw = Math.min(230, paper.w - PAD * 2);
    const para = makeParagraph(provider, letter.dateLine, { ...text, size: text.size - 3, align: 'right' }, dw);
    const dx = paper.x + paper.w - PAD - dw;
    // Right-aligned: the ink sits at the right end of the box, as wide as the longest line.
    const inkW = Math.min(dw, para.getLongestLine());
    const box = { x: dx + dw - inkW, y, w: inkW, h: para.getHeight() };
    out.date = { para, x: dx, y, width: dw, tilt: 0, skew: hand.skew, rect: box };
    y += para.getHeight() + 2;
  }

  const headPara = makeParagraph(provider, letter.heading, { ...text, size: text.size + 1 }, width);
  out.heading = { para: headPara, x: left + between(r, -2, 2), y, width, tilt: hand.rise + between(r, -hand.tilt, hand.tilt), skew: hand.skew };
  y += headPara.getHeight() + hand.gap + 2;

  // Hidden ink in the margin or under the signature is placed once the writing is laid out.
  const offFlow = (seg: Segment) => seg.kind === 'hiddenInk' && (seg.place === 'margin' || seg.place === 'foot');
  out.segments = segments.map((seg) => {
    const isHidden = seg.kind === 'hiddenInk';
    if (offFlow(seg)) return { seg } as LaidSegment;
    const indent = isHidden ? 26 : between(r, 0, hand.drift);
    const w = width - indent - (isHidden ? 10 : 0);
    const para = makeParagraph(provider, seg.text, isHidden ? hidden : text, w);
    const x = left + indent;
    // Hidden ink is squeezed into the gap between lines; it barely takes any room of its own.
    const top = isHidden ? y - hand.gap + 1 : y + between(r, -hand.drift * 0.3, hand.drift * 0.3);
    const skew = isHidden ? -0.12 : hand.skew;
    const laid: LaidSegment = {
      seg,
      para,
      x,
      y: top,
      width: w,
      tilt: isHidden ? -0.006 : hand.rise + between(r, -hand.tilt, hand.tilt),
      skew,
      lines: lineRects(para, seg.text.length, x, top),
    };
    y = top + para.getHeight() * (isHidden ? 0.82 : 1) + hand.gap;
    return laid;
  });

  if (letter.signature) {
    const sw = 180;
    const para = makeParagraph(provider, letter.signature, { ...text, align: 'right' }, sw);
    out.signature = { para, x: paper.x + paper.w - PAD - sw + between(r, -6, 0), y: y + 6, width: sw, tilt: between(r, -0.03, 0.01), skew: hand.skew };
  }

  let foot = out.signature ? out.signature.y + out.signature.para.getHeight() + 10 : y + 10;
  out.segments = out.segments.map((laid) => {
    if (laid.para) return laid;
    const seg = laid.seg;
    if (seg.place === 'foot') {
      // A line under the signature, small, as if added after the letter was done.
      const w = width - 40;
      const para = makeParagraph(provider, seg.text, { ...hidden, size: hidden.size - 1 }, w);
      const x = left + 14;
      const placed: LaidSegment = { seg, para, x, y: foot, width: w, tilt: -0.01, skew: -0.08, lines: lineRects(para, seg.text.length, x, foot) };
      foot += para.getHeight() + 4;
      return placed;
    }
    // Up the left margin, turned a quarter, reading bottom to top.
    const w = 240;
    const para = makeParagraph(provider, seg.text, { ...hidden, size: hidden.size - 2 }, w);
    const x = paper.x + 7;
    const yy = paper.y + PAD + 20 + Math.min(w, para.getLongestLine());
    return { seg, para, x, y: yy, width: w, tilt: -Math.PI / 2, skew: 0, lines: lineRects(para, seg.text.length, x, yy) };
  });

  // Paper is as long as the writer needed, plus a foot for the seal and the clerk's stamp.
  const end = Math.max(out.signature ? out.signature.y + out.signature.para.getHeight() : y, foot - 10);
  const h = Math.min(paper.h, Math.max(300, end - paper.y + 96));
  out.paper = { ...paper, h };
  if (letter.seal) out.seal = { cx: paper.x + paper.w - 60, cy: paper.y + h - 46, r: 19 };
  // The post office stamps the bottom left, a little askew.
  if (postmark) out.postmark = { ...postmark, cx: paper.x + 52, cy: paper.y + h - 44, r: 19, rot: between(r, -0.35, 0.35) };
  return out;
}

/** What the red pencil can ring on this letter; `anomaly` from the letter's inspectables. */
export function markTargets(letter: Letter, layout: LetterLayout): MarkTarget[] {
  const wrong = new Set((letter.inspectables ?? []).filter((i) => i.anomaly).map((i) => i.target));
  const out: MarkTarget[] = [];
  if (layout.date) {
    const d = layout.date.rect;
    out.push({ target: 'date', x: d.x + d.w / 2, y: d.y + d.h / 2, anomaly: wrong.has('date') });
  }
  if (layout.seal) out.push({ target: 'seal', x: layout.seal.cx, y: layout.seal.cy, anomaly: wrong.has('seal') });
  if (layout.postmark) out.push({ target: 'postmark', x: layout.postmark.cx, y: layout.postmark.cy, anomaly: wrong.has('postmark') });
  return out;
}

/** Where the magnifier must hover for each inspectable. */
export function inspectPoints(letter: Letter, layout: LetterLayout): { id: string; x: number; y: number; note: string }[] {
  const out: { id: string; x: number; y: number; note: string }[] = [];
  for (const insp of letter.inspectables ?? []) {
    if (insp.target === 'date' && layout.date) {
      const d = layout.date.rect;
      out.push({ id: insp.id, x: d.x + d.w / 2, y: d.y + d.h / 2, note: insp.note });
    }
    if (insp.target === 'seal' && layout.seal) out.push({ id: insp.id, x: layout.seal.cx, y: layout.seal.cy, note: insp.note });
  }
  return out;
}
