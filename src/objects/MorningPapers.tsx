import { useMemo } from 'react';
import { FontWeight, Group, Line, Path, Rect, Shadow, type Transforms3d, vec } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { hasArt, TintedArt } from '../art/ArtSlot';
import { mornings } from '../content/loader';
import type { MorningLine, MorningPaper } from '../content/types';
import { matches } from '../logic/conditions';
import { Fade } from '../scene/Fade';
import { C } from '../scene/palette';
import { Para } from '../scene/Para';
import { roughRect } from '../scene/rough';
import { WORLD } from '../scene/world';
import { RoundMark } from './RoundMark';

const SHEET = { x: 270, y: 34, w: 460, h: 470 };
const PAPER = { x: 190, y: 18, w: 620, h: 500 };

const shown = (lines: MorningLine[], flags: ReadonlySet<string>) => lines.filter((l) => matches(l.when, flags));

/** The director's note: printed head, the clerk addressed, a few lines, the Şube's seal. */
function MudurNote({ paper, flags, date, lead }: { paper: Extract<MorningPaper, { kind: 'mudur' }>; flags: ReadonlySet<string>; date: string; lead: string[] }) {
  const r = SHEET;
  const m = mornings.mudur;
  const body = [...lead.map((text) => ({ text })), ...shown(paper.body, flags)];
  return (
    <Group>
      <Para text={m.head} x={r.x} y={r.y + 26} width={r.w} family="Cormorant" size={15} color={C.ink} weight={FontWeight.Bold} letterSpacing={2} align="center" />
      <Para text={m.sub} x={r.x} y={r.y + 46} width={r.w} family="Cormorant" size={13} color={C.inkFaded} italic align="center" />
      <Line p1={vec(r.x + r.w * 0.3, r.y + 66)} p2={vec(r.x + r.w * 0.7, r.y + 66)} strokeWidth={0.8} color="rgba(43,33,24,0.45)" />
      <Para text={date} x={r.x + r.w - 200} y={r.y + 74} width={170} family="Cormorant" size={13} color={C.ink} italic align="right" />
      <Para text={m.to} x={r.x + 34} y={r.y + 96} width={300} family="Cormorant" size={15} color={C.ink} weight={FontWeight.Bold} />
      <Para text={body.map((l) => l.text).join('\n\n')} x={r.x + 44} y={r.y + 126} width={r.w - 82} family="Cormorant" size={15} color={C.ink} weight={FontWeight.SemiBold} lineHeight={1.08} />
      <Para text={m.sign} x={r.x + r.w - 220} y={r.y + r.h - 92} width={180} family="Cormorant" size={14} color={C.ink} italic align="right" />
      <RoundMark cx={r.x + r.w - 110} cy={r.y + r.h - 50} scale={0.8} rotate={-0.2} color="#3b3566" legend="KİLİTBAHİR ŞUBESİ MÜDÜRİYETİ ★" symbol="crescent" opacity={0.6} />
    </Group>
  );
}

/** A letter from home, in Nazife's careful hand. */
function FamilyLetter({ paper, flags }: { paper: Extract<MorningPaper, { kind: 'family' }>; flags: ReadonlySet<string> }) {
  const r = SHEET;
  const body = shown(paper.body, flags);
  return (
    <Group>
      <Para text={paper.heading} x={r.x + 40} y={r.y + 40} width={300} family="Caveat" size={22} color={C.inkBlue} />
      <Para text={body.map((l) => l.text).join('\n\n')} x={r.x + 48} y={r.y + 80} width={r.w - 90} family="Caveat" size={19} color={C.inkBlue} lineHeight={1.02} />
      <Para text={paper.sign} x={r.x + r.w - 240} y={r.y + r.h - 70} width={200} family="Caveat" size={20} color={C.inkBlue} align="right" />
    </Group>
  );
}

const INK = '#1c1712';
const RULE = 'rgba(28,23,18,0.55)';

/** A small woodcut under the masthead. The picture changes with the issue; the type does not. */
function Woodcut({ n, x, y, w, h }: { n: number; x: number; y: number; w: number; h: number }) {
  const kind = n % 3;
  const lines = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const hatch = (x0: number, y0: number, x1: number, y1: number, step: number) => {
      for (let t = 0; t <= 1; t += step) out.push({ x1: x0 + (x1 - x0) * t, y1: y0, x2: x0 + (x1 - x0) * t + 8, y2: y1 });
    };
    const X = (t: number) => x + w * t;
    const Y = (t: number) => y + h * t;
    if (kind === 0) {
      // A steamer leaving the strait.
      out.push({ x1: X(0.08), y1: Y(0.62), x2: X(0.92), y2: Y(0.62) });
      out.push({ x1: X(0.18), y1: Y(0.62), x2: X(0.28), y2: Y(0.4) });
      out.push({ x1: X(0.72), y1: Y(0.62), x2: X(0.82), y2: Y(0.4) });
      out.push({ x1: X(0.28), y1: Y(0.4), x2: X(0.82), y2: Y(0.4) });
      out.push({ x1: X(0.5), y1: Y(0.4), x2: X(0.5), y2: Y(0.16) });
      out.push({ x1: X(0.5), y1: Y(0.16), x2: X(0.64), y2: Y(0.16) });
      out.push({ x1: X(0.64), y1: Y(0.16), x2: X(0.64), y2: Y(0.4) });
      hatch(X(0.08), Y(0.72), X(0.9), Y(0.92), 0.18);
    } else if (kind === 1) {
      // A queue at a bakery door.
      out.push({ x1: X(0.72), y1: Y(0.08), x2: X(0.72), y2: Y(0.92) });
      out.push({ x1: X(0.72), y1: Y(0.08), x2: X(0.92), y2: Y(0.08) });
      out.push({ x1: X(0.92), y1: Y(0.08), x2: X(0.92), y2: Y(0.92) });
      for (let i = 0; i < 4; i++) {
        const px = X(0.12 + i * 0.14);
        out.push({ x1: px, y1: Y(0.55), x2: px, y2: Y(0.34) });
        out.push({ x1: px - w * 0.04, y1: Y(0.8), x2: px, y2: Y(0.55) });
        out.push({ x1: px + w * 0.04, y1: Y(0.8), x2: px, y2: Y(0.55) });
      }
    } else {
      // Domes over the water.
      out.push({ x1: X(0.06), y1: Y(0.58), x2: X(0.94), y2: Y(0.58) });
      out.push({ x1: X(0.16), y1: Y(0.58), x2: X(0.16), y2: Y(0.28) });
      out.push({ x1: X(0.16), y1: Y(0.28), x2: X(0.32), y2: Y(0.14) });
      out.push({ x1: X(0.32), y1: Y(0.14), x2: X(0.48), y2: Y(0.28) });
      out.push({ x1: X(0.48), y1: Y(0.28), x2: X(0.48), y2: Y(0.58) });
      out.push({ x1: X(0.62), y1: Y(0.58), x2: X(0.62), y2: Y(0.2) });
      out.push({ x1: X(0.78), y1: Y(0.58), x2: X(0.78), y2: Y(0.2) });
      hatch(X(0.06), Y(0.68), X(0.92), Y(0.9), 0.2);
    }
    return out;
  }, [kind, x, y, w, h]);
  return (
    <Group>
      <Rect x={x} y={y} width={w} height={h} style="stroke" strokeWidth={0.8} color={INK} />
      {lines.map((l, i) => (
        <Line key={i} p1={vec(l.x1, l.y1)} p2={vec(l.x2, l.y2)} strokeWidth={0.8} color={INK} />
      ))}
    </Group>
  );
}

/** The war gazette: a letterpress masthead, a woodcut, four narrow columns. */
function Newspaper({ paper, flags, date }: { paper: Extract<MorningPaper, { kind: 'newspaper' }>; flags: ReadonlySet<string>; date: string }) {
  const r = PAPER;
  const n = mornings.newspaper;
  const items = shown(paper.items, flags);
  const count = Math.min(4, Math.max(1, items.length));
  const gap = 10;
  const innerX = r.x + 18;
  const innerW = r.w - 36;
  const colW = (innerW - gap * (count - 1)) / count;
  const cols: MorningLine[][] = Array.from({ length: count }, () => []);
  items.forEach((it, i) => cols[i % count]!.push(it));
  const cut = { x: r.x + r.w / 2 - 48, y: r.y + 92, w: 96, h: 54 };
  return (
    <Group>
      <Para text={n.title} x={r.x + 12} y={r.y + 16} width={r.w - 24} family="Cormorant" size={22} color={INK} weight={FontWeight.Bold} letterSpacing={1.4} align="center" />
      <Line p1={vec(r.x + 16, r.y + 46)} p2={vec(r.x + r.w - 16, r.y + 46)} strokeWidth={1.6} color={INK} />
      <Line p1={vec(r.x + 16, r.y + 50)} p2={vec(r.x + r.w - 16, r.y + 50)} strokeWidth={0.6} color={INK} />
      <Para text={n.line.replace('{n}', String(paper.n)).replace('{date}', date)} x={r.x + 16} y={r.y + 54} width={r.w - 32} family="Cormorant" size={11} color="#3a3128" italic align="center" />
      <Line p1={vec(r.x + 16, r.y + 72)} p2={vec(r.x + r.w - 16, r.y + 72)} strokeWidth={0.6} color={INK} />
      <Woodcut n={paper.n} x={cut.x} y={cut.y} w={cut.w} h={cut.h} />
      <Line p1={vec(r.x + 16, r.y + 154)} p2={vec(r.x + r.w - 16, r.y + 154)} strokeWidth={0.7} color={INK} />
      {cols.map((col, ci) => (
        <Group key={ci}>
          {ci > 0 && <Line p1={vec(innerX + ci * (colW + gap) - gap / 2, r.y + 162)} p2={vec(innerX + ci * (colW + gap) - gap / 2, r.y + r.h - 16)} strokeWidth={0.5} color={RULE} />}
          {col.map((it, i) => (
            <Group key={i}>
              {it.head && (
                <Para
                  text={it.head}
                  x={innerX + ci * (colW + gap)}
                  y={r.y + 162 + i * 150}
                  width={colW}
                  family="Cormorant"
                  size={12}
                  color={INK}
                  weight={FontWeight.Bold}
                  align="center"
                  lineHeight={0.95}
                />
              )}
              <Para
                text={it.text}
                x={innerX + ci * (colW + gap)}
                y={r.y + 162 + i * 150 + (it.head ? 32 : 0)}
                width={colW}
                family="Cormorant"
                size={11}
                color={INK}
                weight={FontWeight.Medium}
                lineHeight={1.05}
              />
            </Group>
          ))}
        </Group>
      ))}
    </Group>
  );
}

const FOLDED = { x: 400, y: 188, w: 176, h: 118 };

/** The gazette as it sits on the desk before anyone opens it. */
function FoldedNewspaper({ n }: { n: number }) {
  const r = FOLDED;
  const shape = useMemo(() => roughRect(r, 'news-fold', 0.6), [r]);
  return (
    <Group>
      <Path path={shape} color="#cfc6b0">
        <Shadow dx={-4} dy={7} blur={8} color="rgba(0,0,0,0.55)" />
      </Path>
      <Rect x={r.x + 10} y={r.y + 12} width={r.w - 20} height={8} color={INK} />
      <Line p1={vec(r.x + 8, r.y + r.h / 2)} p2={vec(r.x + r.w - 8, r.y + r.h / 2)} strokeWidth={1.2} color="rgba(40,32,24,0.35)" />
      <Line p1={vec(r.x + 14, r.y + 28)} p2={vec(r.x + r.w - 14, r.y + 28)} strokeWidth={0.6} color={RULE} />
      <Line p1={vec(r.x + 14, r.y + 36)} p2={vec(r.x + r.w * 0.55, r.y + 36)} strokeWidth={0.5} color={RULE} />
      <Woodcut n={n} x={r.x + r.w - 58} y={r.y + 30} w={44} h={28} />
      <Line p1={vec(r.x + 14, r.y + r.h / 2 + 10)} p2={vec(r.x + r.w - 14, r.y + r.h / 2 + 10)} strokeWidth={0.5} color={RULE} />
      <Line p1={vec(r.x + 14, r.y + r.h / 2 + 18)} p2={vec(r.x + r.w * 0.7, r.y + r.h / 2 + 18)} strokeWidth={0.5} color={RULE} />
    </Group>
  );
}

/** The morning's papers, one at a time over the desk. The gazette starts folded. */
export function MorningPapers({
  paper,
  flags,
  date,
  opacity,
  lead = [],
  spread,
  opened,
}: {
  paper: MorningPaper;
  flags: ReadonlySet<string>;
  date: string;
  opacity: SharedValue<number>;
  lead?: string[];
  /** 0 folded, 1 open. Other papers ignore it. */
  spread: SharedValue<number>;
  opened: boolean;
}) {
  const isNews = paper.kind === 'newspaper';
  const r = isNews ? PAPER : SHEET;
  const shape = useMemo(() => roughRect(r, `morning-${paper.kind}`, 0.9), [r, paper.kind]);
  const rise = useDerivedValue<Transforms3d>(() => [{ translateY: (1 - opacity.value) * 18 }]);
  const dim = useDerivedValue(() => (isNews ? 0.12 + 0.4 * spread.value : 0.5));
  const foldOpacity = useDerivedValue(() => Math.max(0, 1 - spread.value * 1.35));
  const pageOpacity = useDerivedValue(() => Math.min(1, Math.max(0, (spread.value - 0.12) / 0.88)));
  const pageTransform = useDerivedValue<Transforms3d>(() => {
    const cx = PAPER.x + PAPER.w / 2;
    const cy = PAPER.y + PAPER.h / 2;
    const sx = 0.22 + 0.78 * spread.value;
    const sy = 0.42 + 0.58 * spread.value;
    return [{ translateX: cx }, { translateY: cy }, { scaleX: sx }, { scaleY: sy }, { translateX: -cx }, { translateY: -cy }];
  });
  const crease = useDerivedValue(() => Math.sin(Math.min(1, spread.value) * Math.PI) * 0.4);
  const tint = isNews ? '#d5ccb6' : paper.kind === 'family' ? '#ece2cc' : '#e9dcbd';
  const hint = isNews && !opened ? mornings.openHint : mornings.hint;
  return (
    <Fade opacity={opacity}>
      <Rect x={-400} y={-200} width={WORLD.w + 800} height={WORLD.h + 400} color="#050403" opacity={dim} />
      <Group transform={rise}>
        {isNews && (
          <Group opacity={foldOpacity}>
            <FoldedNewspaper n={paper.n} />
          </Group>
        )}
        <Group opacity={isNews ? pageOpacity : 1} transform={isNews ? pageTransform : undefined}>
          {hasArt('paper') && !isNews ? (
            <TintedArt slot="paper" rect={r} tint={tint} shadow />
          ) : (
            !isNews && (
              <Path path={shape} color={tint}>
                <Shadow dx={-6} dy={10} blur={12} color="rgba(0,0,0,0.65)" />
              </Path>
            )
          )}
          {isNews && (
            <Path path={shape} color={tint}>
              <Shadow dx={-6} dy={10} blur={12} color="rgba(0,0,0,0.65)" />
            </Path>
          )}
          {paper.kind === 'mudur' && <MudurNote paper={paper} flags={flags} date={date} lead={lead} />}
          {paper.kind === 'family' && <FamilyLetter paper={paper} flags={flags} />}
          {paper.kind === 'newspaper' && <Newspaper paper={paper} flags={flags} date={date} />}
          {isNews && <Line p1={vec(r.x + r.w / 2, r.y + 8)} p2={vec(r.x + r.w / 2, r.y + r.h - 8)} strokeWidth={2} color="rgba(40,30,20,0.8)" opacity={crease} />}
        </Group>
        <Para text={hint} x={0} y={(isNews && !opened ? FOLDED.y + FOLDED.h : r.y + r.h) + 12} width={WORLD.w} family="Cormorant" size={14} color="rgba(232,218,190,0.75)" italic align="center" />
      </Group>
    </Fade>
  );
}
