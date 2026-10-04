import { BlurMask, Circle, Group, Path, RadialGradient, Skia, vec, type Transforms3d } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { ArtSlot } from '../art/ArtSlot';
import { ART_SLOTS } from '../art/slots';

const { w: W, h: H } = ART_SLOTS.kettle;
/** Where the steam comes out, relative to the kettle's centre. */
export const SPOUT = { dx: W / 2 - 4, dy: -4 };
export const KETTLE_R = 36;

/** The copper kettle, top down; lifted, it breathes steam from its spout. */
export function Kettle({ x, y, lift, puff }: { x: SharedValue<number>; y: SharedValue<number>; lift: SharedValue<number>; puff: SharedValue<number> }) {
  const transform = useDerivedValue<Transforms3d>(() => [{ translateX: x.value }, { translateY: y.value }, { scale: 1 + lift.value * 0.06 }]);
  const steam = useDerivedValue(() => lift.value * 0.55);
  // Three puffs climbing off the spout; `puff` is a 0..1 cycle.
  const p1 = useDerivedValue(() => vec(SPOUT.dx + 8 + puff.value * 14, SPOUT.dy - 4 - puff.value * 16));
  const p2 = useDerivedValue(() => vec(SPOUT.dx + 4 + ((puff.value + 0.33) % 1) * 14, SPOUT.dy - 2 - ((puff.value + 0.33) % 1) * 16));
  const p3 = useDerivedValue(() => vec(SPOUT.dx + 6 + ((puff.value + 0.66) % 1) * 14, SPOUT.dy - 3 - ((puff.value + 0.66) % 1) * 16));
  const body = Skia.PathBuilder.Make().addOval({ x: -W / 2 + 8, y: -H / 2 + 6, width: W - 30, height: H - 12 }).build();
  return (
    <Group transform={transform}>
      <ArtSlot slot="kettle" rect={{ x: -W / 2, y: -H / 2, w: W, h: H }} shadow>
        <Path path={body}>
          <RadialGradient c={vec(-10, -10)} r={50} colors={['#d8955e', '#9a5a2e', '#5a3016']} />
        </Path>
      </ArtSlot>
      <Group opacity={steam}>
        {[p1, p2, p3].map((c, i) => (
          <Circle key={i} c={c} r={9 + i * 2} color="rgba(240,240,236,0.55)">
            <BlurMask blur={6} style="normal" />
          </Circle>
        ))}
      </Group>
    </Group>
  );
}
