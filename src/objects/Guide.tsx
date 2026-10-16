import { FontWeight, Group, Line, Path, RoundedRect, Skia, vec, type SkPath } from '@shopify/react-native-skia';
import type { GuideCard } from '../logic/guide';
import type { Point, Rect } from '../logic/censor';
import { C } from '../scene/palette';
import { Para } from '../scene/Para';

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
 * A paper label and an arrow. The arrow is cream with a dark edge so it
 * reads on the wood and on the letter.
 */
export function GuideCallout({ card }: { card: GuideCard }) {
  const { box, tip, what, why } = card;
  const from = edgeToward(box, tip);
  const ang = Math.atan2(tip.y - from.y, tip.x - from.x);
  const end = { x: tip.x - Math.cos(ang) * 9, y: tip.y - Math.sin(ang) * 9 };
  const head = arrowHead(from, tip, 12);
  const inner = arrowHead(from, { x: tip.x - Math.cos(ang) * 1.8, y: tip.y - Math.sin(ang) * 1.8 }, 8);
  return (
    <Group>
      <Line p1={vec(from.x, from.y)} p2={vec(end.x, end.y)} color="#1a100c" strokeWidth={5} />
      <Line p1={vec(from.x, from.y)} p2={vec(end.x, end.y)} color={C.paper} strokeWidth={2.4} />
      <Path path={head} color="#1a100c" />
      <Path path={inner} color={C.paper} />
      <RoundedRect x={box.x + 2} y={box.y + 3} width={box.w} height={box.h} r={3} color="rgba(20,10,4,0.45)" />
      <RoundedRect x={box.x} y={box.y} width={box.w} height={box.h} r={3} color={C.paper} />
      <RoundedRect x={box.x} y={box.y} width={box.w} height={box.h} r={3} style="stroke" strokeWidth={1.2} color={C.ink} />
      <Para text={what} x={box.x + 8} y={box.y + 5} width={box.w - 16} family="Cormorant" size={15} weight={FontWeight.SemiBold} color={C.ink} align="center" />
      <Para text={why} x={box.x + 8} y={box.y + 26} width={box.w - 16} family="Cormorant" size={13} color={C.inkFaded} align="center" />
    </Group>
  );
}
