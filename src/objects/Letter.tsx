import { memo, useMemo } from 'react';
import {
  Blur,
  BlendColor,
  BlurMask,
  Circle,
  ColorMatrix,
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
  TextPath,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { ArtSlot, hasArt } from '../art/ArtSlot';
import type { Decision, Letter as LetterData, PaperMark } from '../content/types';
import { t } from '../content/strings';
import type { Rect as R } from '../logic/censor';
import { useSceneFonts } from '../scene/fonts';
import { C, STAMP_INK } from '../scene/palette';
import { between, rng } from '../scene/rand';
import { blob, roughRect, shakyLine } from '../scene/rough';
import { paperStyleOf, type Laid, type LaidSegment, type LetterLayout } from './letterLayout';
import { StampMark } from './StampMark';
import { Fade } from '../scene/Fade';

// Noise squeezed into a pale band, so multiplying it only dusts the paper.
const PALE = [0.09, 0.09, 0.09, 0, 0.74, 0.09, 0.09, 0.09, 0, 0.74, 0.09, 0.09, 0.09, 0, 0.74, 0, 0, 0, 0, 1];

export interface LetterProps {
  letter: LetterData;
  layout: LetterLayout;
  censored: string[];
  revealed: string[];
  strokes: SkPath[];
  livePath: SharedValue<SkPath>;
  heat: SharedValue<Record<string, number>>;
  imprint?: Decision;
}

function Block({ laid }: { laid: Laid }) {
  return (
    <Group transform={[{ rotate: laid.tilt }, { skewX: laid.skew }]} origin={{ x: laid.x, y: laid.y }}>
      <Paragraph paragraph={laid.para} x={laid.x} y={laid.y} width={laid.width} />
    </Group>
  );
}

function HiddenInk({ laid, heat, wasRead }: { laid: LaidSegment; heat: SharedValue<Record<string, number>>; wasRead: boolean }) {
  const id = laid.seg.id;
  // Mirrors logic/reveal displayedHeat (worklets can't call plain JS). A near-invisible
  // trace stays even when cold: the paper looks very faintly scratched there.
  const ink = useDerivedValue(() => {
    const h = heat.value[id] ?? 0;
    return Math.max(0.035, wasRead ? Math.max(h, 0.35) : h);
  });
  const glow = useDerivedValue(() => {
    const h = heat.value[id] ?? 0;
    return h * h * 0.9;
  });
  return (
    <Group transform={[{ rotate: laid.tilt }, { skewX: laid.skew }]} origin={{ x: laid.x, y: laid.y }}>
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
      <Fade opacity={ink}>
        <Paragraph paragraph={laid.para} x={laid.x} y={laid.y} width={laid.width} />
      </Fade>
    </Group>
  );
}

function Paper({ letter, rect }: { letter: LetterData; rect: R }) {
  const style = paperStyleOf(letter.hand);
  const shape = useMemo(() => roughRect(rect, `paper-${letter.id}`, style.wobble, style.torn), [rect, letter.id, style.wobble, style.torn]);
  const folds = [rect.y + rect.h / 3, rect.y + (rect.h * 2) / 3];
  return (
    <Group>
      <Path path={shape} color={style.color}>
        <Shadow dx={-6} dy={9} blur={10} color="rgba(0,0,0,0.6)" />
      </Path>
      <Group clip={shape}>
        {hasArt('paper') ? (
          <ArtSlot slot="paper" rect={rect}>
            {null}
          </ArtSlot>
        ) : (
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
        {style.ruled &&
          Array.from({ length: Math.floor((rect.h - 50) / 23) }, (_, i) => (
            <Line key={i} p1={vec(rect.x, rect.y + 52 + i * 23)} p2={vec(rect.x + rect.w, rect.y + 52 + i * 23)} strokeWidth={0.7} color={style.ruled!} />
          ))}
        {style.border && (
          <Group style="stroke" color={style.border}>
            <Rect x={rect.x + 10} y={rect.y + 10} width={rect.w - 20} height={rect.h - 20} strokeWidth={0.8} />
            <Rect x={rect.x + 13} y={rect.y + 13} width={rect.w - 26} height={rect.h - 26} strokeWidth={0.5} />
          </Group>
        )}
        {letter.letterhead && (
          <Group color="rgba(58,47,42,0.75)">
            <Line p1={vec(rect.x + 40, rect.y + 46)} p2={vec(rect.x + rect.w - 40, rect.y + 46)} strokeWidth={1} />
            <Line p1={vec(rect.x + 40, rect.y + 49)} p2={vec(rect.x + rect.w - 40, rect.y + 49)} strokeWidth={0.5} />
          </Group>
        )}
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
  const { sealFont } = useSceneFonts();
  const seal = letter.seal!;
  const ring = useMemo(() => {
    return Skia.PathBuilder.Make().addCircle(at.cx, at.cy, at.r - 8).build();
  }, [at]);
  const star = useMemo(() => {
    const p = Skia.PathBuilder.Make();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? 4 : 9;
      const px = at.cx + Math.cos(a) * rr;
      const py = at.cy + Math.sin(a) * rr;
      if (i === 0) p.moveTo(px, py);
      else p.lineTo(px, py);
    }
    p.close();
    return p.build();
  }, [at]);
  return (
    <Group layer transform={[{ rotate: -0.18 }, { scaleX: seal.mirrored ? -1 : 1 }]} origin={{ x: at.cx, y: at.cy }} opacity={0.82}>
      <Circle cx={at.cx} cy={at.cy} r={at.r} style="stroke" strokeWidth={2.2} color={seal.color} />
      <Circle cx={at.cx} cy={at.cy} r={at.r - 14} style="stroke" strokeWidth={1} color={seal.color} />
      <TextPath path={ring} text={`${seal.legend} · `} font={sealFont} color={seal.color} />
      <Path path={star} color={seal.color} />
      {/* Uneven pressure: eat holes into the impression */}
      <Rect x={at.cx - at.r - 4} y={at.cy - at.r - 4} width={at.r * 2 + 8} height={at.r * 2 + 8} blendMode="dstOut" opacity={0.6}>
        <FractalNoise freqX={0.09} freqY={0.09} octaves={2} seed={3} />
      </Rect>
    </Group>
  );
}

function CensorBars({ segments, censored }: { segments: LaidSegment[]; censored: string[] }) {
  const bars = useMemo(
    () =>
      segments
        .filter((s) => censored.includes(s.seg.id))
        .flatMap((s) => s.lines.map((l, i) => roughRect({ x: l.x - 3, y: l.y + 1, w: l.w + 6, h: l.h - 2 }, `bar-${s.seg.id}-${i}`, 1.4))),
    [segments, censored],
  );
  // Opaque: once a line counts as censored, nothing of it may show through.
  return (
    <Group>
      {bars.map((b, i) => (
        <Path key={i} path={b} color={C.censor}>
          <DiscretePathEffect length={6} deviation={1.2} seed={i} />
        </Path>
      ))}
    </Group>
  );
}

/** A red grease pencil: waxy, a little broken at the edges, darker where it doubled back. */
export function CensorStroke({ path }: { path: SkPath | SharedValue<SkPath> }) {
  return (
    <Group blendMode="multiply">
      <Path path={path} style="stroke" strokeWidth={10} strokeCap="round" strokeJoin="round" color={C.censor} opacity={0.82}>
        <DiscretePathEffect length={5} deviation={1.6} seed={2} />
      </Path>
      <Path path={path} style="stroke" strokeWidth={4} strokeCap="round" strokeJoin="round" color={C.censorDark} opacity={0.35}>
        <DiscretePathEffect length={3} deviation={1} seed={5} />
      </Path>
    </Group>
  );
}

function LetterImpl({ letter, layout, censored, revealed, strokes, livePath, heat, imprint }: LetterProps) {
  const p = layout.paper;
  return (
    <Group>
      <Paper letter={letter} rect={p} />
      {(letter.marks ?? []).map((m, i) => (
        <Mark key={i} mark={m} layout={layout} seed={`${letter.id}-mark${i}`} />
      ))}
      {layout.letterhead && <Block laid={layout.letterhead} />}
      {layout.date && <Block laid={layout.date} />}
      <Block laid={layout.heading} />
      {layout.segments.map((s) =>
        s.seg.kind === 'hiddenInk' ? (
          <HiddenInk key={s.seg.id} laid={s} heat={heat} wasRead={revealed.includes(s.seg.id)} />
        ) : (
          <Block key={s.seg.id} laid={s} />
        ),
      )}
      {layout.signature && <Block laid={layout.signature} />}
      {layout.seal && <Seal letter={letter} at={layout.seal} />}
      <CensorBars segments={layout.segments} censored={censored} />
      {strokes.map((s, i) => (
        <CensorStroke key={i} path={s} />
      ))}
      <CensorStroke path={livePath} />
      {imprint && (
        <StampMark
          x={p.x + 34}
          y={p.y + p.h - 92}
          w={150}
          h={52}
          label={t(`decision.${imprint}`)}
          color={STAMP_INK[imprint]}
          rotate={-0.16}
          seed={`imprint-${letter.id}`}
          size={22}
        />
      )}
    </Group>
  );
}

export const Letter = memo(LetterImpl);
