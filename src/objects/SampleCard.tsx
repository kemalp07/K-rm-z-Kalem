import { useMemo } from 'react';
import { FontWeight, Group, Path, Shadow } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import type { BookletSeal, SampleCard as Card } from '../content/types';
import type { Point, Rect as Box } from '../logic/censor';
import { C } from '../scene/palette';
import { Para } from '../scene/Para';
import { roughRect } from '../scene/rough';
import { SealExample } from './Booklet';

/** The card at full size, drawn around the origin's top-left; it is baked once and moved as an image. */
export const CARD = { w: 236, h: 206 };
/** What the card's raster covers, shadow included. */
export const CARD_REGION: Box = { x: -14, y: -12, w: CARD.w + 26, h: CARD.h + 28 };
/** Tucked under the window while not in use, at this fraction of its size. */
export const CARD_HOME = { x: 74, y: 250, scale: 0.42, rot: -0.05 };
const SEAL_SCALE = 0.86;

/** The card's face: title, then its seals two by two with what each belongs to. */
export function SampleCardFace({ card }: { card: Card & { seals: BookletSeal[] } }) {
  const shape = useMemo(() => roughRect({ x: 0, y: 0, w: CARD.w, h: CARD.h }, `card-${card.id}`, 0.7), [card.id]);
  const inner = useMemo(() => roughRect({ x: 7, y: 7, w: CARD.w - 14, h: CARD.h - 14 }, `card-in-${card.id}`, 0.4), [card.id]);
  const cellW = (CARD.w - 20) / 2;
  const rowH = 80;
  return (
    <Group>
      <Path path={shape} color="#dccba4">
        <Shadow dx={-3} dy={4} blur={4} color="rgba(0,0,0,0.55)" />
      </Path>
      <Path path={inner} style="stroke" strokeWidth={0.8} color="rgba(43,33,24,0.45)" />
      <Para text={card.title} x={0} y={13} width={CARD.w} family="Cormorant" size={12} color={C.ink} weight={FontWeight.Bold} letterSpacing={1.4} align="center" />
      {card.seals.slice(0, 4).map((s, i) => {
        const cx = 10 + cellW * (i % 2) + cellW / 2;
        const top = 36 + Math.floor(i / 2) * rowH;
        return (
          <Group key={s.legend}>
            <SealExample seal={s} cx={cx} cy={top + 28} scale={SEAL_SCALE} />
            <Para text={s.caption} x={cx - cellW / 2} y={top + 59} width={cellW} family="Cormorant" size={10} color={C.inkFaded} italic align="center" />
          </Group>
        );
      })}
    </Group>
  );
}

/** Board → card coordinates (origin at the card's top-left, full size). */
export function toCard(p: Point, at: { x: number; y: number; scale: number; rot: number }): Point {
  const dx = (p.x - at.x) / at.scale;
  const dy = (p.y - at.y) / at.scale;
  const c = Math.cos(-at.rot);
  const s = Math.sin(-at.rot);
  return { x: dx * c - dy * s + CARD.w / 2, y: dx * s + dy * c + CARD.h / 2 };
}

export const onCard = (p: Point, at: { x: number; y: number; scale: number; rot: number }) => {
  const q = toCard(p, at);
  return q.x >= -4 && q.x <= CARD.w + 4 && q.y >= -4 && q.y <= CARD.h + 4;
};

/** Transform that puts the baked card at its centre (x, y), scaled and turned. */
export function useCardTransform(x: SharedValue<number>, y: SharedValue<number>, scale: SharedValue<number>, rot: SharedValue<number>) {
  return useDerivedValue(() => [
    { translateX: x.value },
    { translateY: y.value },
    { rotate: rot.value },
    { scale: scale.value },
    { translateX: -CARD.w / 2 },
    { translateY: -CARD.h / 2 },
  ]);
}
