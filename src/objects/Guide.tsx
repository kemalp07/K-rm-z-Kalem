import { useMemo } from 'react';
import { BlurMask, Group, Path, Shadow, Skia, type SkPath } from '@shopify/react-native-skia';
import type { GuideCard } from '../logic/guide';
import type { Point, Rect } from '../logic/censor';
import { C } from '../scene/palette';
import { Para } from '../scene/Para';
import { between, rng } from '../scene/rand';
import { roughRect, shakyLine } from '../scene/rough';

/** A scrap torn off a sheet, a little yellower than the letter under it. */
const SCRAP = '#e4d3b0';

/** Where the arrow leaves the card: the edge facing the tip. */
function edgeToward(box: Rect, tip: Point): Point {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dx = tip.x - cx;
  const dy = tip.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx !== 0 ? box.w / 2 / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? box.h / 2 / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

function arrowHead(from: Point, to: Point, len = 11): SkPath {
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const wing = 0.42;
  const b = Skia.PathBuilder.Make();
  b.moveTo(to.x, to.y);
  b.lineTo(to.x - Math.cos(ang - wing) * len, to.y - Math.sin(ang - wing) * len);
  b.lineTo(to.x - Math.cos(ang + wing) * len, to.y - Math.sin(ang + wing) * len);
  b.close();
  return b.build();
}

/**
 * A torn scrap with the instruction on it, and a pencil line pointing at the thing.
 * The top edge is torn, like a leaf pulled out of a notebook.
 */
export function GuideCallout({ card }: { card: GuideCard }) {
  const { box, tip, what, why } = card;
  const shape = useMemo(() => roughRect(box, `guide-${what}`, 1.35, true), [box.x, box.y, box.w, box.h, what]);
  const tilt = useMemo(() => between(rng(`guide-tilt-${what}`), -0.03, 0.03), [what]);
  const from = edgeToward(box, tip);
  const ang = Math.atan2(tip.y - from.y, tip.x - from.x);
  const end = { x: tip.x - Math.cos(ang) * 9, y: tip.y - Math.sin(ang) * 9 };
  const shaft = useMemo(
    () => shakyLine(from.x, from.y, end.x, end.y, `guide-arrow-${what}`, 0.6),
    [from.x, from.y, end.x, end.y, what],
  );
  const head = arrowHead(from, tip, 12);
  const inner = arrowHead(from, { x: tip.x - Math.cos(ang) * 1.8, y: tip.y - Math.sin(ang) * 1.8 }, 8);
  const rails = (card.along ?? []).map((s, i) => shakyLine(s.a.x, s.a.y, s.b.x, s.b.y, `guide-rail-${what}-${i}`, 0.45));
  const origin = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  return (
    <Group>
      {rails.map((rail, i) => (
        <Path key={i} path={rail} style="stroke" strokeWidth={2.4} color="#6b4423" strokeCap="round" />
      ))}
      <Path path={shaft} style="stroke" strokeWidth={4.2} color="#1a100c" strokeCap="round" />
      <Path path={shaft} style="stroke" strokeWidth={1.8} color={SCRAP} strokeCap="round" />
      <Path path={head} color="#1a100c" />
      <Path path={inner} color={SCRAP} />
      <Group origin={origin} transform={[{ rotate: tilt }]}>
        <Path path={shape} color={SCRAP}>
          <Shadow dx={1.5} dy={3} blur={5} color="rgba(20,10,4,0.4)" />
        </Path>
        <Group clip={shape}>
          <Path path={shape} style="stroke" strokeWidth={14} color="rgba(120,78,32,0.28)">
            <BlurMask blur={6} style="normal" />
          </Path>
          <Para text={what} x={box.x + 12} y={box.y + 10} width={box.w - 24} family="Kalam" size={15} color={C.ink} align="center" />
          <Para text={why} x={box.x + 12} y={box.y + 30} width={box.w - 24} family="Kalam" size={13} color={C.inkFaded} align="center" />
        </Group>
      </Group>
    </Group>
  );
}
