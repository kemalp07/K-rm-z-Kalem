import { memo, useMemo, type ReactNode } from 'react';
import {
  Blur,
  BlendColor,
  BlurMask,
  Circle,
  ColorMatrix,
  DashPathEffect,
  DiscretePathEffect,
  FractalNoise,
  Group,
  Line,
  Paint,
  Paragraph,
  Path,
  Rect,
  Shadow,
  Skia,
  vec,
  type SkPath,
  type Transforms3d,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { hasArt, TintedArt } from '../art/ArtSlot';
import type { Decision, Letter as LetterData, PaperMark } from '../content/types';
import { t } from '../content/strings';
import type { Rect as R } from '../logic/censor';
import { MARK_R, RoundMark } from './RoundMark';
import { C, STAMP_INK } from '../scene/palette';
import { between, rng } from '../scene/rand';
import { blob, roughRect, shakyLine } from '../scene/rough';
import { closeCorner, paperStyleOf, type Laid, type LaidSegment, type LetterLayout } from './letterLayout';
import { Para } from '../scene/Para';
import { Fade } from '../scene/Fade';

// Noise squeezed into a pale band, so multiplying it only dusts the paper.
const PALE = [0.09, 0.09, 0.09, 0, 0.74, 0.09, 0.09, 0.09, 0, 0.74, 0.09, 0.09, 0.09, 0, 0.74, 0, 0, 0, 0, 1];

export interface LetterProps {
  letter: LetterData;
  layout: LetterLayout;
  censored: string[];
  revealed: string[];
  strokes: SkPath[];
  /** The stroke being drawn right now, if any. */
  livePath?: SharedValue<SkPath>;
  /** Today's date as the decision stamp prints it ("7 MAYIS 331"). */
  today?: string;
  /** Sentence under the pen, while a stroke is going on. */
  hint?: SharedValue<PenHint>;
  /** Pen work fading under the eraser. */
  marksFade?: SharedValue<number>;
  /** Pre-rendered stand-ins for LetterStill / LetterMarks, when the screen has them. */
  still?: ReactNode;
  /** `null` when there is nothing to draw. */
  marks?: ReactNode;
  heat: SharedValue<Record<string, number>>;
  /** Some hidden ink is being heated right now. */
  warm?: boolean;
  imprint?: ImprintAt;
  /** 0→1 as the stamp's ink lands. */
  imprintIn?: SharedValue<number>;
}

function Block({ laid }: { laid: Laid }) {
  return (
    <Group transform={[{ rotate: laid.tilt }, { skewY: laid.skew }]} origin={{ x: laid.x, y: laid.y }}>
      <Paragraph paragraph={laid.para} x={laid.x} y={laid.y} width={laid.width} />
    </Group>
  );
}

function HiddenInk({ laid, heat, wasRead, warm }: { laid: LaidSegment; heat: SharedValue<Record<string, number>>; wasRead: boolean; warm: boolean }) {
  const id = laid.seg.id;
  // Mirrors logic/reveal displayedHeat (worklets can't call plain JS). A near-invisible
  // trace stays even when cold: the paper looks very faintly scratched there.
  const ink = useDerivedValue(() => {
    const h = heat.value[id] ?? 0;
    return Math.max(0.035, wasRead ? Math.max(h, 0.35) : h);
  });
  const bounds = useMemo(() => {
    const xs = laid.lines.flatMap((l) => [l.x, l.x + l.w]);
    const ys = laid.lines.flatMap((l) => [l.y, l.y + l.h]);
    const pad = 10;
    return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };
  }, [laid]);
  const glow = useDerivedValue(() => {
    const h = heat.value[id] ?? 0;
    return h * h * 0.9;
  });
  return (
    <Group transform={[{ rotate: laid.tilt }, { skewY: laid.skew }]} origin={{ x: laid.x, y: laid.y }}>
      {/* The blurred glow layer is expensive; it is only there while a flame is near. */}
      {warm && (
        <Group
          layer={
            <Paint opacity={glow}>
              <BlendColor color={C.hiddenGlow} mode="srcIn" />
              <Blur blur={4} />
            </Paint>
          }
        >
          <Paragraph paragraph={laid.para} x={laid.x} y={laid.y} width={laid.width} />
        </Group>
      )}
      <Fade opacity={ink} bounds={bounds}>
        <Paragraph paragraph={laid.para} x={laid.x} y={laid.y} width={laid.width} />
      </Fade>
    </Group>
  );
}

/** Printed or ruled furniture of a sheet: the same over drawn or illustrated paper. */
function PaperPrint({ letter, rect }: { letter: LetterData; rect: R }) {
  const style = paperStyleOf(letter.hand);
  return (
    <>
      {style.ruled &&
        Array.from({ length: Math.floor((rect.h - 50) / 23) }, (_, i) => (
          <Line key={i} p1={vec(rect.x + 8, rect.y + 52 + i * 23)} p2={vec(rect.x + rect.w - 8, rect.y + 52 + i * 23)} strokeWidth={0.7} color={style.ruled!} />
        ))}
      {style.border && (
        <Group style="stroke" color={style.border}>
          <Rect x={rect.x + 12} y={rect.y + 12} width={rect.w - 24} height={rect.h - 24} strokeWidth={0.8} />
          <Rect x={rect.x + 15} y={rect.y + 15} width={rect.w - 30} height={rect.h - 30} strokeWidth={0.5} />
        </Group>
      )}
      {letter.letterhead && (
        <Group color="rgba(58,47,42,0.75)">
          <Line p1={vec(rect.x + 40, rect.y + 46)} p2={vec(rect.x + rect.w - 40, rect.y + 46)} strokeWidth={1} />
          <Line p1={vec(rect.x + 40, rect.y + 49)} p2={vec(rect.x + rect.w - 40, rect.y + 49)} strokeWidth={0.5} />
        </Group>
      )}
    </>
  );
}

const PAPER_ART = hasArt('paper');

function Paper({ letter, rect }: { letter: LetterData; rect: R }) {
  if (PAPER_ART) {
    // One illustrated sheet for every letter, tinted to each writer's paper.
    return (
      <Group>
        <TintedArt slot="paper" rect={rect} tint={paperStyleOf(letter.hand).color} shadow />
        <PaperPrint letter={letter} rect={rect} />
      </Group>
    );
  }
  return <DrawnPaper letter={letter} rect={rect} />;
}

function DrawnPaper({ letter, rect }: { letter: LetterData; rect: R }) {
  const style = paperStyleOf(letter.hand);
  const shape = useMemo(() => roughRect(rect, `paper-${letter.id}`, style.wobble, style.torn), [rect, letter.id, style.wobble, style.torn]);
  const folds = [rect.y + rect.h / 3, rect.y + (rect.h * 2) / 3];
  return (
    <Group>
      <Path path={shape} color={style.color}>
        <Shadow dx={-6} dy={9} blur={10} color="rgba(0,0,0,0.6)" />
      </Path>
      <Group clip={shape}>
        {(
          <Group blendMode="multiply">
            <Rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} opacity={0.5 + style.grain}>
              <FractalNoise freqX={0.7} freqY={0.7} octaves={2} seed={Math.round(rect.x)} />
              <ColorMatrix matrix={PALE} />
            </Rect>
            {/* Larger clouds: the paper was never quite even */}
            <Rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} opacity={style.grain * 1.6}>
              <FractalNoise freqX={0.012} freqY={0.016} octaves={3} seed={7} />
              <ColorMatrix matrix={PALE} />
            </Rect>
          </Group>
        )}
        {/* Age at the edges: handled paper browns from the outside in */}
        <Path path={shape} style="stroke" strokeWidth={16} color="rgba(130,90,40,0.2)">
          <BlurMask blur={9} style="normal" />
        </Path>
        <PaperPrint letter={letter} rect={rect} />
        {/* Fold creases: a shadow line and a lit lip beside it */}
        {folds.map((fy) => (
          <Group key={fy}>
            <Path path={shakyLine(rect.x, fy, rect.x + rect.w, fy + 1, `fold${fy}${letter.id}`, 0.5)} style="stroke" strokeWidth={1.4} color="rgba(60,40,20,0.13)" />
            <Path path={shakyLine(rect.x, fy + 1.6, rect.x + rect.w, fy + 2.6, `foldl${fy}${letter.id}`, 0.5)} style="stroke" strokeWidth={1} color="rgba(255,250,235,0.35)" />
          </Group>
        ))}
      </Group>
    </Group>
  );
}

function Mark({ mark, layout, seed }: { mark: PaperMark; layout: LetterLayout; seed: string }) {
  const r = rng(seed);
  const p = layout.paper;
  const anchor = layout.segments.find((s) => s.seg.id === mark.near)?.lines[0];
  switch (mark.kind) {
    case 'tear': {
      // A drop fell on the line and the ink ran a little.
      const cx = anchor ? anchor.x + anchor.w * 0.7 : p.x + p.w * 0.6;
      const cy = anchor ? anchor.y + anchor.h * 0.6 : p.y + p.h * 0.4;
      return (
        <Group>
          <Path path={blob(cx, cy, 10, seed, 0.18)} color="rgba(120,90,50,0.12)">
            <BlurMask blur={2} style="normal" />
          </Path>
          <Path path={blob(cx, cy, 10, seed, 0.18)} style="stroke" strokeWidth={1.1} color="rgba(110,80,40,0.25)" />
          <Path path={blob(cx - 2, cy + 1, 5, `${seed}b`, 0.4)} color="rgba(43,33,24,0.12)">
            <BlurMask blur={2.5} style="normal" />
          </Path>
        </Group>
      );
    }
    case 'thumb': {
      const cx = anchor ? anchor.x + anchor.w - 10 : p.x + between(r, 30, 70);
      const cy = anchor ? anchor.y + anchor.h + 4 : p.y + p.h - between(r, 40, 80);
      return (
        <Group transform={[{ rotate: between(r, -0.6, 0.6) }]} origin={{ x: cx, y: cy }}>
          <Path path={blob(cx, cy, 13, `${seed}t`, 0.12)} color="rgba(40,30,20,0.07)" />
          {Array.from({ length: 6 }, (_, i) => (
            <Path key={i} path={blob(cx, cy, 3 + i * 2, `${seed}r${i}`, 0.1, 10)} style="stroke" strokeWidth={0.6} color="rgba(30,22,15,0.13)" transform={[{ scaleY: 1.3 }]} origin={{ x: cx, y: cy }} />
          ))}
        </Group>
      );
    }
    case 'mud': {
      const cx = p.x + p.w - 40;
      const cy = p.y + p.h - 30;
      return (
        <Path path={blob(cx, cy, 22, seed, 0.45, 18)} color="rgba(85,62,35,0.16)">
          <BlurMask blur={5} style="normal" />
        </Path>
      );
    }
    case 'jasmine':
      return <Jasmine x={p.x + 44} y={p.y + p.h - 46} seed={seed} />;
  }
}

/** The dried sprig Saadet slipped in. Faded green, petals gone to ivory. */
function Jasmine({ x, y, seed }: { x: number; y: number; seed: string }) {
  const parts = useMemo(() => {
    const r = rng(seed);
    const sb = Skia.PathBuilder.Make();
    sb.moveTo(x - 30, y + 30).cubicTo(x - 10, y + 10, x + 10, y - 4, x + 44, y - 18);
    const stem = sb.build();
    const leaves = [0.25, 0.45, 0.62, 0.8].map((t, i) => {
      const lx = x - 30 + 74 * t;
      const ly = y + 30 - 48 * t;
      const side = i % 2 ? 1 : -1;
      return { path: blob(lx + side * 6, ly + side * 5, 5, `${seed}l${i}`, 0.15, 10), rot: between(r, -0.8, 0.8), lx, ly };
    });
    const flowers = [
      { cx: x + 46, cy: y - 20 },
      { cx: x + 30, cy: y - 26 },
      { cx: x + 12, cy: y - 2 },
    ];
    return { stem, leaves, flowers };
  }, [x, y, seed]);
  return (
    <Group>
      <Group>
        <Path path={parts.stem} style="stroke" strokeWidth={1.4} color="#6c6436">
          <Shadow dx={-1} dy={1.5} blur={1} color="rgba(0,0,0,0.25)" />
        </Path>
        {parts.leaves.map((l, i) => (
          <Path key={i} path={l.path} color="#7d7a46" transform={[{ scaleX: 1.8 }, { rotate: l.rot }]} origin={{ x: l.lx, y: l.ly }} />
        ))}
      </Group>
      {parts.flowers.map((f, i) => (
        <Group key={i}>
          {Array.from({ length: 5 }, (_, k) => {
            const a = (k / 5) * Math.PI * 2 + i;
            return <Circle key={k} cx={f.cx + Math.cos(a) * 3.4} cy={f.cy + Math.sin(a) * 3.4} r={2.7} color="#efe6cf" />;
          })}
          <Circle cx={f.cx} cy={f.cy} r={1.4} color="#c9a64a" />
        </Group>
      ))}
    </Group>
  );
}

function Seal({ letter, at }: { letter: LetterData; at: NonNullable<LetterLayout['seal']> }) {
  const seal = letter.seal!;
  const worn = useMemo(() => [...letter.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 97, [letter.id]);
  return (
    <RoundMark
      cx={at.cx}
      cy={at.cy}
      scale={at.r / MARK_R}
      rotate={-0.18}
      color={seal.color}
      legend={seal.legend}
      symbol={seal.symbol ?? 'star'}
      double={seal.double}
      mirrored={seal.mirrored}
      worn={worn}
    />
  );
}

/**
 * A censored line, done the way a clerk does it: the red pencil dragged back and forth
 * across the words until they are gone, over a first heavy pass that leaves nothing legible.
 */
function CensorBars({ segments, censored }: { segments: LaidSegment[]; censored: string[] }) {
  const blocks = useMemo(
    () =>
      segments
        .filter((s) => censored.includes(s.seg.id))
        .map((s) => ({
          laid: s,
          beds: s.lines.map((l, i) => roughRect({ x: l.x - 2, y: l.y + 2, w: l.w + 4, h: l.h - 3 }, `bed-${s.seg.id}-${i}`, 1.6)),
          scribbles: s.lines.map((l, i) => scribble(l, `scr-${s.seg.id}-${i}`)),
        })),
    [segments, censored],
  );
  return (
    <Group>
      {blocks.map(({ laid, beds, scribbles }) => (
        <Group key={laid.seg.id} transform={[{ rotate: laid.tilt }, { skewY: laid.skew }]} origin={{ x: laid.x, y: laid.y }}>
          {beds.map((b, i) => (
            <Path key={`b${i}`} path={b} color={C.censor} opacity={0.88}>
              <DiscretePathEffect length={5} deviation={1.4} seed={i} />
            </Path>
          ))}
          {scribbles.map((sc, i) => (
            <CensorStroke key={`s${i}`} path={sc} width={7} />
          ))}
        </Group>
      ))}
    </Group>
  );
}

/** Back-and-forth pencil marks across a line box, with rounded turns and a hand's unevenness. */
function scribble(r: R, seed: string): SkPath {
  const rand = rng(seed);
  const b = Skia.PathBuilder.Make();
  const top = r.y + 3;
  const bottom = r.y + r.h - 3;
  let x = r.x - 3;
  let up = false;
  b.moveTo(x, bottom);
  while (x < r.x + r.w + 3) {
    const step = between(rand, 3.2, 5.4);
    const nx = x + step;
    const ny = (up ? bottom : top) + between(rand, -1.5, 1.5);
    b.quadTo(x + step * 0.5, ny + (up ? 2 : -2), nx, ny);
    x = nx;
    up = !up;
  }
  return b.build();
}

/**
 * Red grease pencil on paper: a soft waxy body, the paper's tooth breaking it up into
 * grain, and a darker vein where the pencil pressed hardest.
 */
export function CensorStroke({ path, width = 9 }: { path: SkPath | SharedValue<SkPath>; width?: number }) {
  return (
    <Group layer={<Paint blendMode="multiply" />}>
      <Path path={path} style="stroke" strokeWidth={width} strokeCap="round" strokeJoin="round" color={C.censor} opacity={0.9}>
        <BlurMask blur={0.7} style="normal" />
      </Path>
      <Path path={path} style="stroke" strokeWidth={width + 1} strokeCap="round" strokeJoin="round" blendMode="dstOut" opacity={0.5}>
        <FractalNoise freqX={0.9} freqY={0.35} octaves={2} seed={11} />
      </Path>
      <Path path={path} style="stroke" strokeWidth={width * 0.3} strokeCap="round" strokeJoin="round" color={C.censorDark} opacity={0.35} transform={[{ translateX: 0.6 }, { translateY: 0.8 }]} />
    </Group>
  );
}

/** Everything on the sheet that only changes when a new letter is opened. */
export function LetterStill({ letter, layout }: { letter: LetterData; layout: LetterLayout }) {
  return (
    <Group>
      <Paper letter={letter} rect={layout.paper} />
      {(letter.marks ?? []).map((m, i) => (
        <Mark key={i} mark={m} layout={layout} seed={`${letter.id}-mark${i}`} />
      ))}
      {layout.letterhead && <Block laid={layout.letterhead} />}
      {layout.date && <Block laid={layout.date} />}
      <Block laid={layout.heading} />
      {layout.segments.map((s) => (s.seg.kind === 'hiddenInk' ? null : <Block key={s.seg.id} laid={s} />))}
      {layout.signature && <Block laid={layout.signature} />}
      {layout.seal && <Seal letter={letter} at={layout.seal} />}
      {letter.kind !== 'paket' && <CloseCorner paper={layout.paper} />}
      {layout.postmark && (
        <RoundMark cx={layout.postmark.cx} cy={layout.postmark.cy} scale={layout.postmark.r / MARK_R} rotate={layout.postmark.rot} color={layout.postmark.color ?? '#1f1a17'} legend={`${layout.postmark.office} ★`} center={layout.postmark.date} worn={(letter.id.length * 13) % 97} opacity={0.78} />
      )}
    </Group>
  );
}

/** A dog-ear at the bottom right: touch it and the letter goes back into its envelope. */
function CloseCorner({ paper }: { paper: R }) {
  const c = closeCorner(paper);
  const fold = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    b.moveTo(c.x + c.w, c.y).lineTo(c.x, c.y + c.h).lineTo(c.x + c.w, c.y + c.h).close();
    return b.build();
  }, [c.x, c.y, c.w, c.h]);
  const flap = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    b.moveTo(c.x + c.w, c.y).lineTo(c.x, c.y + c.h).lineTo(c.x + 4, c.y + 4).close();
    return b.build();
  }, [c.x, c.y, c.w, c.h]);
  return (
    <Group>
      <Path path={fold} color="#3a2a1c" opacity={0.85} />
      <Path path={flap} color="#e2d4b2">
        <Shadow dx={1.5} dy={1.5} blur={2} color="rgba(0,0,0,0.45)" />
      </Path>
      <Para text={t('letter.close')} x={c.x - 64} y={c.y + c.h - 15} width={58} family="Caveat" size={12} color="rgba(60,45,30,0.7)" align="right" />
    </Group>
  );
}

/** The red pencil's finished work: bars over censored lines and the strokes themselves. */
export function LetterMarks({ layout, censored, strokes }: { layout: LetterLayout; censored: string[]; strokes: SkPath[] }) {
  return (
    <Group>
      <CensorBars segments={layout.segments} censored={censored} />
      {strokes.map((s, i) => (
        <CensorStroke key={i} path={s} />
      ))}
    </Group>
  );
}

export type PenHint = { hover: string; done: string[] };

/**
 * While the pen is down, a faint rule under the sentence it is over shows what one
 * stroke of censoring takes in; a covered sentence's rule turns red.
 */
function SentenceHints({ segments, hint }: { segments: LaidSegment[]; hint: SharedValue<PenHint> }) {
  return (
    <Group>
      {segments.map((s) => (s.seg.kind === 'hiddenInk' ? null : <SentenceHint key={s.seg.id} laid={s} hint={hint} />))}
    </Group>
  );
}

function SentenceHint({ laid, hint }: { laid: LaidSegment; hint: SharedValue<PenHint> }) {
  const id = laid.seg.id;
  const path = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (const l of laid.lines) b.moveTo(l.x, l.y + l.h - 1).lineTo(l.x + l.w, l.y + l.h - 1);
    return b.build();
  }, [laid]);
  const over = useDerivedValue(() => (hint.value.hover === id && !hint.value.done.includes(id) ? 0.55 : 0));
  const done = useDerivedValue(() => (hint.value.done.includes(id) ? 0.85 : 0));
  return (
    <Group transform={[{ rotate: laid.tilt }, { skewY: laid.skew }]} origin={{ x: laid.x, y: laid.y }}>
      <Path path={path} style="stroke" strokeWidth={1.2} color={C.inkFaded} opacity={over}>
        <DashPathEffect intervals={[4, 3]} />
      </Path>
      <Path path={path} style="stroke" strokeWidth={2} color={C.censor} opacity={done} />
    </Group>
  );
}

/** Area a letter can paint on, shadow included — what gets rasterised. */
export const letterRegion = (paper: R): R => ({ x: paper.x - 40, y: paper.y - 30, w: paper.w + 80, h: paper.h + 70 });

function LetterImpl({ letter, layout, censored, revealed, strokes, livePath, hint, today, heat, warm, imprint, imprintIn, marksFade, still, marks }: LetterProps) {
  return (
    <Group>
      {still ?? <LetterStill letter={letter} layout={layout} />}
      {layout.segments.map((s) =>
        s.seg.kind === 'hiddenInk' ? <HiddenInk key={s.seg.id} laid={s} heat={heat} wasRead={revealed.includes(s.seg.id)} warm={!!warm} /> : null,
      )}
      {marks !== undefined ? marks : (
        <Fade opacity={marksFade ?? 1}>
          <LetterMarks layout={layout} censored={censored} strokes={strokes} />
        </Fade>
      )}
      {hint && <SentenceHints segments={layout.segments} hint={hint} />}
      {livePath && <CensorStroke path={livePath} />}
      {imprint && imprintIn && <Imprint imprint={imprint} letter={letter} imprintIn={imprintIn} today={today} />}
    </Group>
  );
}

export interface ImprintAt {
  d: Decision;
  /** Centre of the impression, where the stamp came down. */
  x: number;
  y: number;
  rot: number;
}

/** The clerk's rubber stamp face, at the scale it lands on the paper. */
const IMPRINT_SCALE = 1.2;
const IMPRINT = { w: MARK_R * 2 * IMPRINT_SCALE, h: MARK_R * 2 * IMPRINT_SCALE };

/** The decision stamp landing on the letter: it settles from slightly larger and the ink comes up. */
function Imprint({ imprint, letter, imprintIn, today }: { imprint: ImprintAt; letter: LetterData; imprintIn: SharedValue<number>; today?: string }) {
  const { d, x: cx, y: cy, rot } = imprint;
  const transform = useDerivedValue<Transforms3d>(() => [{ translateX: cx }, { translateY: cy }, { scale: 1.1 - 0.1 * imprintIn.value }, { translateX: -cx }, { translateY: -cy }]);
  const worn = useMemo(() => [...letter.id].reduce((a, c) => a + c.charCodeAt(0), 7) % 97, [letter.id]);
  return (
    <Fade opacity={imprintIn} transform={transform}>
      <RoundMark cx={cx} cy={cy} scale={IMPRINT_SCALE} rotate={rot} color={STAMP_INK[d]} legend={t('imprint.ring')} band={t(`decision.${d}`)} foot={today} double worn={worn} opacity={0.9} />
    </Fade>
  );
}

/** Where a stamp pressed at p lands: wholly on the paper. */
export function imprintPoint(paper: R, p: { x: number; y: number }) {
  const mx = IMPRINT.w / 2 + 6;
  const my = IMPRINT.h / 2 + 6;
  return { x: Math.min(paper.x + paper.w - mx, Math.max(paper.x + mx, p.x)), y: Math.min(paper.y + paper.h - my, Math.max(paper.y + my, p.y)) };
}

export const Letter = memo(LetterImpl);
