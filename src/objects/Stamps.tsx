import { useMemo } from 'react';
import { BlurMask, Circle, Group, Path, RadialGradient, Shadow, vec, type Transforms3d } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { ArtSlot, PlacedArt, placed } from '../art/ArtSlot';
import type { ArtSlotId } from '../art/slots';
import { t } from '../content/strings';
import type { Decision } from '../content/types';
import type { Rect } from '../logic/censor';
import { STAMP_INK } from '../scene/palette';
import { roughRect } from '../scene/rough';
import { LAYOUT } from '../scene/world';
import { StampMark } from './StampMark';
import { Fade } from '../scene/Fade';

export const DECISIONS: Decision[] = ['delivered', 'held', 'stopped', 'reported'];
const TILT: Record<Decision, number> = { delivered: -0.05, held: 0.035, stopped: -0.025, reported: 0.06 };

/** The four sample impressions under the letter, each on its own scrap of card. */
export function stampSlots(): { d: Decision; rect: Rect }[] {
  const { x, y, w, h } = LAYOUT.stamps;
  const gap = 8;
  const sw = (w - gap * 3) / 4;
  return DECISIONS.map((d, i) => ({ d, rect: { x: x + i * (sw + gap), y: y + 6, w: sw, h: h - 12 } }));
}

/** The four rubber stamps, each standing on a card that shows its impression. */
export function Stamps({ enabled }: { enabled: boolean }) {
  const slots = useMemo(stampSlots, []);
  const cards = useMemo(() => slots.map((s) => roughRect({ x: s.rect.x - 3, y: s.rect.y - 3, w: s.rect.w + 6, h: s.rect.h + 6 }, `card-${s.d}`, 0.9)), [slots]);
  return (
    <Fade opacity={enabled ? 1 : 0.4}>
      {slots.map((s, i) => (
        <Group key={s.d} transform={[{ rotate: TILT[s.d] }]} origin={{ x: s.rect.x + s.rect.w / 2, y: s.rect.y + s.rect.h / 2 }}>
          <ArtSlot slot={`card_${i + 1}` as ArtSlotId} rect={{ x: s.rect.x - 4, y: s.rect.y - 3, w: s.rect.w + 8, h: s.rect.h + 6 }} shadow>
            <Path path={cards[i]!} color="#e2d5b8">
              <Shadow dx={-2} dy={3} blur={3} color="rgba(0,0,0,0.5)" />
            </Path>
          </ArtSlot>
          <StampMark x={s.rect.x + 4} y={s.rect.y + 6} w={s.rect.w - 8} h={s.rect.h - 12} label={t(`decision.${s.d}`)} color={STAMP_INK[s.d]} rotate={0} seed={`sample-${s.d}`} size={s.d === 'reported' ? 10.5 : 13.5} opacity={0.8} />
        </Group>
      ))}
    </Fade>
  );
}

/**
 * The rubber stamp in hand: it follows the finger, raised, and comes down as the finger
 * holds still over the paper. The cards themselves live in the desk's baked layer.
 */
export function StampPress({ pressing, progress, x, y }: { pressing: Decision | null; progress: SharedValue<number>; x: SharedValue<number>; y: SharedValue<number> }) {
  if (!pressing) return null;
  if (STAMP_ART) return <StampArt x={x} y={y} progress={progress} />;
  return <StampDisc x={x} y={y} progress={progress} />;
}

/** Where a stamp rests on its card. */
export const stampHome = (d: Decision) => {
  const r = stampSlots().find((s) => s.d === d)!.rect;
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};

const STAMP_ART = placed('stamp');

function StampArt({ x, y, progress }: { x: SharedValue<number>; y: SharedValue<number>; progress: SharedValue<number> }) {
  // Seen from above, a raised stamp is a larger one; it shrinks onto the paper as it lands.
  const transform = useDerivedValue<Transforms3d>(() => [
    { translateX: x.value },
    { translateY: y.value },
    { scale: 1.28 - progress.value * 0.28 },
  ]);
  const shadow = useDerivedValue<Transforms3d>(() => [{ translateX: -6 - (1 - progress.value) * 10 }, { translateY: 4 + (1 - progress.value) * 18 }]);
  return (
    <Group transform={transform}>
      <PlacedArt slot="stamp" shadow={{ transform: shadow, opacity: 0.55, restBlur: 4 }}>
        {null}
      </PlacedArt>
    </Group>
  );
}

function StampDisc({ x, y, progress }: { x: SharedValue<number>; y: SharedValue<number>; progress: SharedValue<number> }) {
  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }, { scale: 1.35 - progress.value * 0.35 }]);
  const shadow = useDerivedValue(() => [{ translateX: x.value - 4 - (1 - progress.value) * 14 }, { translateY: y.value + 5 + (1 - progress.value) * 16 }]);
  const shadowOpacity = useDerivedValue(() => 0.3 + progress.value * 0.4);
  return (
    <Group>
      <Group transform={shadow} opacity={shadowOpacity}>
        <Circle cx={0} cy={0} r={22} color="#000">
          <BlurMask blur={8} style="normal" />
        </Circle>
      </Group>
      <Group transform={transform}>
        <Circle cx={0} cy={0} r={22}>
          <RadialGradient c={vec(-6, -8)} r={30} colors={['#7a4e2c', '#4a2c15', '#26160a']} />
        </Circle>
        <Circle cx={0} cy={0} r={14} style="stroke" strokeWidth={1} color="rgba(255,220,170,0.15)" />
        <Circle cx={-6} cy={-7} r={5} color="rgba(255,230,190,0.12)">
          <BlurMask blur={3} style="normal" />
        </Circle>
      </Group>
    </Group>
  );
}
