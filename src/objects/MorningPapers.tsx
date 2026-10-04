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

/** The war gazette: masthead, issue line, headed items in two columns. */
function Newspaper({ paper, flags, date }: { paper: Extract<MorningPaper, { kind: 'newspaper' }>; flags: ReadonlySet<string>; date: string }) {
  const r = PAPER;
  const n = mornings.newspaper;
  const items = shown(paper.items, flags);
  const colW = (r.w - 70) / 2;
  const cols: MorningLine[][] = [[], []];
  items.forEach((it, i) => cols[i < Math.ceil(items.length / 2) ? 0 : 1]!.push(it));
  return (
    <Group>
      <Para text={n.title} x={r.x} y={r.y + 22} width={r.w} family="Cormorant" size={30} color="#1c1712" weight={FontWeight.Bold} letterSpacing={2} align="center" />
      <Line p1={vec(r.x + 24, r.y + 66)} p2={vec(r.x + r.w - 24, r.y + 66)} strokeWidth={2} color="#1c1712" />
      <Para text={n.line.replace('{n}', String(paper.n)).replace('{date}', date)} x={r.x} y={r.y + 70} width={r.w} family="Cormorant" size={12} color="#3a3128" italic align="center" />
      <Line p1={vec(r.x + 24, r.y + 88)} p2={vec(r.x + r.w - 24, r.y + 88)} strokeWidth={0.8} color="#1c1712" />
      <Line p1={vec(r.x + r.w / 2, r.y + 98)} p2={vec(r.x + r.w / 2, r.y + r.h - 30)} strokeWidth={0.6} color="rgba(28,23,18,0.5)" />
      {cols.map((col, ci) => (
        <Group key={ci}>
          {col.map((it, i) => (
            <Group key={i}>
              {it.head && <Para text={it.head} x={r.x + 30 + ci * (colW + 10)} y={r.y + 100 + i * 128} width={colW - 10} family="Cormorant" size={15} color="#1c1712" weight={FontWeight.Bold} align="center" lineHeight={0.95} />}
              <Para text={it.text} x={r.x + 30 + ci * (colW + 10)} y={r.y + 100 + i * 128 + (it.head ? 40 : 0)} width={colW - 10} family="Cormorant" size={13} color="#1c1712" weight={FontWeight.Medium} lineHeight={1.02} />
            </Group>
          ))}
        </Group>
      ))}
    </Group>
  );
}

/** The morning's papers, one at a time over the desk; a touch puts each away. */
export function MorningPapers({ paper, flags, date, opacity, lead = [] }: { paper: MorningPaper; flags: ReadonlySet<string>; date: string; opacity: SharedValue<number>; lead?: string[] }) {
  const isNews = paper.kind === 'newspaper';
  const r = isNews ? PAPER : SHEET;
  const shape = useMemo(() => roughRect(r, `morning-${paper.kind}`, 0.9), [r, paper.kind]);
  const rise = useDerivedValue<Transforms3d>(() => [{ translateY: (1 - opacity.value) * 18 }]);
  const tint = isNews ? '#ddd3bd' : paper.kind === 'family' ? '#ece2cc' : '#e9dcbd';
  return (
    <Fade opacity={opacity}>
      <Rect x={-400} y={-200} width={WORLD.w + 800} height={WORLD.h + 400} color="rgba(5,4,3,0.5)" />
      <Group transform={rise}>
        {hasArt('paper') && !isNews ? (
          <TintedArt slot="paper" rect={r} tint={tint} shadow />
        ) : (
          <Path path={shape} color={tint}>
            <Shadow dx={-6} dy={10} blur={12} color="rgba(0,0,0,0.65)" />
          </Path>
        )}
        {paper.kind === 'mudur' && <MudurNote paper={paper} flags={flags} date={date} lead={lead} />}
        {paper.kind === 'family' && <FamilyLetter paper={paper} flags={flags} />}
        {paper.kind === 'newspaper' && <Newspaper paper={paper} flags={flags} date={date} />}
        <Para text={mornings.hint} x={0} y={r.y + r.h + 12} width={WORLD.w} family="Cormorant" size={14} color="rgba(232,218,190,0.75)" italic align="center" />
      </Group>
    </Fade>
  );
}
