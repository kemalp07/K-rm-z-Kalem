import { useMemo } from 'react';
import { Circle, FontWeight, Group, Line, Paragraph, Path, Rect, vec, type SkParagraph, type SkTypefaceFontProvider } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { ArtSlot } from '../art/ArtSlot';
import { booklet, itemText } from '../content/booklet';
import type { BookletPage, BookletSeal } from '../content/types';
import { Fade } from '../scene/Fade';
import { RoundMark } from './RoundMark';
import { makeParagraph, useSceneFonts, type TextSpec } from '../scene/fonts';
import { C } from '../scene/palette';
import { Para } from '../scene/Para';
import { roughRect } from '../scene/rough';
import { LAYOUT, WORLD } from '../scene/world';
import type { Rect as Box } from '../logic/censor';

// Where the printed area sits inside booklet_open.png (827×604), as fractions.
const FRAME = { top: 76 / 604, h: 384 / 604, left: 64 / 827, right: 462 / 827, w: 306 / 827 };

export function bookletFrames(r: Box) {
  const y = r.y + r.h * FRAME.top;
  const h = r.h * FRAME.h;
  const w = r.w * FRAME.w;
  return { left: { x: r.x + r.w * FRAME.left, y, w, h }, right: { x: r.x + r.w * FRAME.right, y, w, h } };
}

/** Spread k shows the cover (k = 0) or page 2k-1 on the left, and page 2k on the right. */
export const spreadCount = (pages: number) => Math.ceil((pages + 1) / 2);

const BODY: TextSpec = { family: 'Cormorant', size: 12.5, color: C.ink, weight: FontWeight.SemiBold, lineHeight: 1.02 };
const SMALL: TextSpec = { ...BODY, size: 11.5 };
const RED = '#8c2a1f';
const SEAL_R = 32;
const SEAL_SCALE = 1;

type Drawn =
  | { k: 'text'; p: SkParagraph; x: number; y: number }
  | { k: 'rule'; x1: number; x2: number; y: number; color: string }
  | { k: 'box'; r: Box }
  | { k: 'seal'; seal: BookletSeal; cx: number; cy: number };

function layoutPage(provider: SkTypefaceFontProvider, page: BookletPage, r: Box): Drawn[] {
  const out: Drawn[] = [];
  const text = (s: string, spec: TextSpec, x: number, y: number, w: number) => {
    const p = makeParagraph(provider, s, spec, w);
    out.push({ k: 'text', p, x, y });
    return p.getHeight();
  };
  let y = r.y + 4;
  y += text(page.title, { family: 'Cormorant', size: 14.5, color: C.ink, weight: FontWeight.Bold, letterSpacing: 1.6, align: 'center' }, r.x, y, r.w) + 3;
  out.push({ k: 'rule', x1: r.x + r.w * 0.3, x2: r.x + r.w * 0.7, y, color: 'rgba(43,33,24,0.5)' });
  y += 9;

  for (const b of page.blocks) {
    if (b.t === 'p') {
      y += text(b.text, BODY, r.x, y, r.w) + 6;
    } else if (b.t === 'num' || b.t === 'dash') {
      b.items.forEach((it, i) => {
        text(b.t === 'num' ? `${i + 1}.` : '—', { ...BODY, color: C.ink, weight: FontWeight.Bold }, r.x + 2, y, 16);
        y += text(itemText(it), BODY, r.x + 18, y, r.w - 18) + 3;
      });
      y += 4;
    } else if (b.t === 'no') {
      const top = y;
      y += 4;
      y += text(booklet.noTitle, { ...SMALL, color: RED, weight: FontWeight.Bold, letterSpacing: 1.4 }, r.x + 8, y, r.w - 16) + 1;
      for (const it of b.items) {
        text('×', { ...SMALL, color: RED, weight: FontWeight.Bold }, r.x + 8, y, 10);
        y += text(itemText(it), SMALL, r.x + 20, y, r.w - 28) + 2;
      }
      y += 4;
      out.push({ k: 'box', r: { x: r.x + 2, y: top, w: r.w - 4, h: y - top } });
      y += 6;
    } else if (b.t === 'table') {
      const cols = b.rows[0]?.length ?? 3;
      // First column takes the slack; numbers are narrow.
      const widths = cols === 4 ? [0.32, 0.18, 0.32, 0.18] : [0.52, 0.22, 0.26];
      b.rows.forEach((row, ri) => {
        const head = b.head && ri === 0;
        let x = r.x + 4;
        let rowH = 0;
        row.forEach((cell, ci) => {
          const w = (r.w - 8) * (widths[ci] ?? 0.3);
          rowH = Math.max(rowH, text(cell, { ...SMALL, weight: head ? FontWeight.Bold : SMALL.weight, color: head ? C.inkFaded : C.ink }, x, y, w - 4));
          x += w;
        });
        y += rowH + 2;
        out.push({ k: 'rule', x1: r.x + 4, x2: r.x + r.w - 4, y, color: head ? 'rgba(43,33,24,0.45)' : 'rgba(43,33,24,0.15)' });
        y += 2;
      });
      y += 6;
    } else if (b.t === 'seals') {
      const perRow = 2;
      const cellW = r.w / perRow;
      const d = SEAL_R * 2 * SEAL_SCALE;
      b.items.forEach((s, i) => {
        const col = i % perRow;
        const cx = r.x + cellW * (col + 0.5);
        const rowTop = y + Math.floor(i / perRow) * (d + 30);
        out.push({ k: 'seal', seal: s, cx, cy: rowTop + d / 2 + 2 });
        text(s.caption, { ...SMALL, size: 10.5, align: 'center', italic: true, color: C.inkFaded }, cx - cellW / 2, rowTop + d + 6, cellW);
      });
      y += Math.ceil(b.items.length / perRow) * (d + 30) + 4;
    }
  }
  if (__DEV__ && y > r.y + r.h) console.warn(`booklet page "${page.id}" overflows by ${Math.round(y - r.y - r.h)}`);
  return out;
}

/** A seal or postmark as the Şube wants it, drawn the same way the letters draw theirs. */
export function SealExample({ seal, cx, cy, scale = SEAL_SCALE }: { seal: BookletSeal; cx: number; cy: number; scale?: number }) {
  return <RoundMark cx={cx} cy={cy} scale={scale} color={seal.color} legend={seal.legend} symbol={seal.symbol} center={seal.center} double={seal.double} />;
}

function PageView({ page, r }: { page: BookletPage; r: Box }) {
  const { provider } = useSceneFonts();
  const drawn = useMemo(() => layoutPage(provider, page, r), [provider, page, r]);
  const label = booklet.pageLabel.replace('{n}', page.label ?? String(page.n));
  return (
    <Group>
      {drawn.map((d, i) => {
        if (d.k === 'text') return <Paragraph key={i} paragraph={d.p} x={d.x} y={d.y} width={d.p.getMaxWidth()} />;
        if (d.k === 'rule') return <Line key={i} p1={vec(d.x1, d.y)} p2={vec(d.x2, d.y)} strokeWidth={0.8} color={d.color} />;
        if (d.k === 'box') return <Rect key={i} x={d.r.x} y={d.r.y} width={d.r.w} height={d.r.h} style="stroke" strokeWidth={0.9} color="rgba(140,42,31,0.55)" />;
        return <SealExample key={i} seal={d.seal} cx={d.cx} cy={d.cy} />;
      })}
      <Para text={label} x={r.x} y={r.y + r.h + 6} width={r.w} family="Cormorant" size={10} color={C.inkFaded} italic align="center" />
    </Group>
  );
}

function CoverPage({ r }: { r: Box }) {
  const c = booklet.cover;
  return (
    <Group>
      <Para text={c.title} x={r.x + 20} y={r.y + 56} width={r.w - 40} family="Cormorant" size={19} color={C.ink} weight={FontWeight.Bold} letterSpacing={2} align="center" lineHeight={1.1} />
      <Line p1={vec(r.x + r.w * 0.25, r.y + 112)} p2={vec(r.x + r.w * 0.75, r.y + 112)} strokeWidth={0.8} color="rgba(43,33,24,0.5)" />
      <Para text={c.subtitle} x={r.x} y={r.y + 120} width={r.w} family="Cormorant" size={14} color={C.inkFaded} italic align="center" />
      {c.lines.map((l, i) => (
        <Para key={i} text={l} x={r.x + 10} y={r.y + 168 + i * 20} width={r.w - 20} family="Cormorant" size={12.5} color={C.ink} weight={FontWeight.SemiBold} align="center" />
      ))}
      {/* The Şube's stamp, as on any book it issues. */}
      <Circle cx={r.x + r.w / 2} cy={r.y + 262} r={22} style="stroke" strokeWidth={2} color="rgba(91,46,74,0.5)" />
      <Circle cx={r.x + r.w / 2} cy={r.y + 262} r={15} style="stroke" strokeWidth={0.8} color="rgba(91,46,74,0.45)" />
      <Para text={c.note} x={r.x + 10} y={r.y + r.h - 22} width={r.w - 20} family="Cormorant" size={10.5} color={C.inkFaded} italic align="center" />
    </Group>
  );
}

/** The closed booklet lying on the desk, with its paper label. */
export function BookletOnDesk() {
  const r = LAYOUT.help.rules;
  const label = { x: r.x + r.w * (88 / 380), y: r.y + r.h * (178 / 701), w: r.w * (220 / 380), h: r.h * (112 / 701) };
  const fallback = useMemo(() => roughRect(r, 'booklet', 0.6), [r]);
  return (
    <Group transform={[{ rotate: r.rot }]} origin={{ x: r.x + r.w / 2, y: r.y + r.h / 2 }}>
      <ArtSlot slot="booklet" rect={r} shadow>
        <Path path={fallback} color="#5a2a24" />
        <Rect x={label.x} y={label.y} width={label.w} height={label.h} color="#e4d6b4" />
      </ArtSlot>
      <Para text={booklet.cover.label} x={label.x - 6} y={label.y + label.h / 2 - 4} width={label.w + 12} family="Cormorant" size={5.4} color={C.ink} weight={FontWeight.Bold} align="center" />
    </Group>
  );
}

/** The booklet opened over the desk: two pages a spread, turned by tapping a page edge. */
export function BookletView({ pages, spread, opacity }: { pages: BookletPage[]; spread: number; opacity: SharedValue<number> }) {
  const r = LAYOUT.bookletOpen;
  const frames = useMemo(() => bookletFrames(r), [r]);
  const rise = useDerivedValue(() => [{ translateY: (1 - opacity.value) * 16 }]);
  const left = spread === 0 ? null : pages[spread * 2 - 1];
  const right = pages[spread * 2];
  return (
    <Fade opacity={opacity}>
      <Rect x={-400} y={-200} width={WORLD.w + 800} height={WORLD.h + 400} color="rgba(5,4,3,0.6)" />
      <Group transform={rise}>
        <ArtSlot slot="booklet_open" rect={r} shadow>
          <Rect x={r.x} y={r.y} width={r.w} height={r.h} color="#ece1c6" />
        </ArtSlot>
        {spread === 0 ? <CoverPage r={frames.left} /> : left && <PageView page={left} r={frames.left} />}
        {right && <PageView page={right} r={frames.right} />}
      </Group>
    </Fade>
  );
}
