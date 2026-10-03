import { useMemo } from 'react';
import { BlurMask, Circle, FontWeight, Group, LinearGradient, RadialGradient, RoundedRect, Shadow, vec, type Transforms3d } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { ArtSlot, PlacedArt, placed } from '../art/ArtSlot';
import { t } from '../content/strings';
import type { Decision } from '../content/types';
import type { Rect } from '../logic/censor';
import { C, STAMP_INK } from '../scene/palette';
import { Para } from '../scene/Para';
import { LAYOUT } from '../scene/world';
import { Fade } from '../scene/Fade';

export const DECISIONS: Decision[] = ['delivered', 'held', 'stopped', 'reported'];

const KNOB_DY = 28;
const PLATE = { w: 86, h: 28, dy: 58 };

/** The four rubber stamps in a row under the letter, each above a small brass plate naming it. */
export function stampSlots(): { d: Decision; rect: Rect; knob: { x: number; y: number }; plate: Rect }[] {
  const { x, y, w } = LAYOUT.stamps;
  const sw = w / 4;
  return DECISIONS.map((d, i) => {
    const cx = x + sw * (i + 0.5);
    return {
      d,
      rect: { x: cx - 40, y, w: 80, h: PLATE.dy + PLATE.h },
      knob: { x: cx, y: y + KNOB_DY },
      plate: { x: cx - PLATE.w / 2, y: y + PLATE.dy, w: PLATE.w, h: PLATE.h },
    };
  });
}

/** Brass plate, the small kind: one engraved word. */
function Plate({ r, label }: { r: Rect; label: string }) {
  return (
    <Group>
      <ArtSlot slot="brass_plate" rect={r} shadow>
        <RoundedRect x={r.x} y={r.y} width={r.w} height={r.h} r={2}>
          <LinearGradient start={vec(r.x, r.y)} end={vec(r.x + r.w * 0.6, r.y + r.h)} colors={[C.brassLight, C.brass, C.brassDark, C.brass]} positions={[0, 0.35, 0.7, 1]} />
          <Shadow dx={-1.5} dy={2} blur={2} color="rgba(0,0,0,0.6)" />
        </RoundedRect>
      </ArtSlot>
      {/* Engraving: dark fill with a lit lower lip, so the letters read as cut. */}
      <Para text={label} x={r.x + 4} y={r.y + r.h / 2 - 5.6} width={r.w - 8} family="Cormorant" size={label.length > 7 ? 8.4 : 10} color="rgba(255,236,190,0.35)" align="center" weight={FontWeight.Bold} letterSpacing={label.length > 7 ? 0.2 : 0.8} />
      <Para text={label} x={r.x + 4} y={r.y + r.h / 2 - 6.2} width={r.w - 8} family="Cormorant" size={label.length > 7 ? 8.4 : 10} color="#3a2808" align="center" weight={FontWeight.Bold} letterSpacing={label.length > 7 ? 0.2 : 0.8} />
    </Group>
  );
}

/**
 * The stamps standing in their row. A ring of the stamp's ink on the wood shows where
 * each one stands, and stays when it is picked up.
 */
export function Stamps({ enabled, carried }: { enabled: boolean; carried: Decision | null }) {
  const slots = useMemo(stampSlots, []);
  return (
    <Fade opacity={enabled ? 1 : 0.45}>
      {slots.map((s) => (
        <Group key={s.d}>
          <Circle cx={s.knob.x} cy={s.knob.y + 1} r={26} style="stroke" strokeWidth={2.4} color={STAMP_INK[s.d]} opacity={0.45}>
            <BlurMask blur={1.2} style="normal" />
          </Circle>
          {carried !== s.d && (
            <Group transform={[{ translateX: s.knob.x }, { translateY: s.knob.y }]}>
              <PlacedArt slot="stamp" shadow={RESTING}>
                <Circle cx={0} cy={0} r={22} color="#4a2c15" />
              </PlacedArt>
            </Group>
          )}
          <Plate r={s.plate} label={t(`decision.${s.d}`)} />
        </Group>
      ))}
    </Fade>
  );
}

const RESTING = { transform: [{ translateX: -3 }, { translateY: 4 }], opacity: 0.55, restBlur: 3 };

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
export const stampHome = (d: Decision) => stampSlots().find((s) => s.d === d)!.knob;

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
