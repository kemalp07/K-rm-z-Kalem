import { BlurMask, Circle, Group, LinearGradient, Oval, Path, RadialGradient, Rect, RoundedRect, Shadow, Skia, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { ArtSlot } from '../art/ArtSlot';
import { C } from '../scene/palette';
import { blob } from '../scene/rough';

export const PEN_LENGTH = 168;
export const CANDLE_R = 26;
export const LENS_R = 44;

interface Pose {
  x: SharedValue<number>;
  y: SharedValue<number>;
}

const tri = (w: number, h: number) => {
  const p = Skia.Path.Make();
  p.moveTo(0, 0);
  p.lineTo(-w, -h);
  p.lineTo(w, -h);
  p.close();
  return p;
};
const cone = tri(5, 16);
const lead = tri(1.8, 5.5);
const drips = [blob(6, -4, 3.5, 'drip1', 0.3), blob(-7, 5, 3, 'drip2', 0.35)];

/**
 * Red grease pencil, nib at the local origin, body along -y.
 * `lift` 0..1: how far off the desk it is (shadow grows and drifts).
 */
export function RedPen({ x, y, angle, lift }: Pose & { angle: SharedValue<number>; lift: SharedValue<number> }) {
  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }, { rotate: angle.value }]);
  // Shadow falls down-left in board space whatever way the pen is turned.
  const shadow = useDerivedValue(() => {
    const wx = -3 - lift.value * 12;
    const wy = 4 + lift.value * 16;
    const c = Math.cos(-angle.value);
    const s = Math.sin(-angle.value);
    return [{ translateX: wx * c - wy * s }, { translateY: wx * s + wy * c }];
  });
  const shadowOpacity = useDerivedValue(() => 0.55 - lift.value * 0.25);
  return (
    <Group transform={transform}>
      <ArtSlot slot="pen" rect={{ x: -9, y: -PEN_LENGTH, w: 18, h: PEN_LENGTH }}>
        <Group>
          <Group transform={shadow} opacity={shadowOpacity}>
            <Rect x={-5} y={-PEN_LENGTH} width={10} height={PEN_LENGTH} color="#000">
              <BlurMask blur={4} style="normal" />
            </Rect>
          </Group>
          <Path path={cone} color="#d9b98a" />
          <Path path={lead} color={C.censor} />
          {/* Hexagonal body: three faces catch the light differently */}
          <Rect x={-5} y={-PEN_LENGTH + 4} width={10} height={PEN_LENGTH - 20} color={C.censor} />
          <Rect x={-5} y={-PEN_LENGTH + 4} width={3} height={PEN_LENGTH - 20} color="#c2392c" />
          <Rect x={2.5} y={-PEN_LENGTH + 4} width={2.5} height={PEN_LENGTH - 20} color={C.censorDark} />
          {/* Cut end, wood showing */}
          <Rect x={-5} y={-PEN_LENGTH} width={10} height={4} color="#c9a676" />
        </Group>
      </ArtSlot>
    </Group>
  );
}

export function Candle({ x, y, flicker, lift }: Pose & { flicker: SharedValue<number>; lift: SharedValue<number> }) {
  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }]);
  const shadow = useDerivedValue(() => [{ translateX: -4 - lift.value * 10 }, { translateY: 5 + lift.value * 12 }]);
  const flameR = useDerivedValue(() => 4.2 * flicker.value);
  const haloR = useDerivedValue(() => 15 * flicker.value);
  return (
    <Group transform={transform}>
      <ArtSlot slot="candle" rect={{ x: -28, y: -28, w: 56, h: 56 }}>
        <Group>
          <Group transform={shadow} opacity={0.6}>
            <Circle cx={0} cy={0} r={CANDLE_R} color="#000">
              <BlurMask blur={6} style="normal" />
            </Circle>
          </Group>
          {/* Saucer with a finger ring */}
          <Circle cx={CANDLE_R + 4} cy={4} r={7} style="stroke" strokeWidth={3} color={C.brassDark} />
          <Circle cx={0} cy={0} r={CANDLE_R}>
            <RadialGradient c={vec(8, -10)} r={CANDLE_R * 1.4} colors={[C.brassLight, C.brass, C.brassDark]} />
          </Circle>
          <Circle cx={0} cy={0} r={CANDLE_R - 5} style="stroke" strokeWidth={1} color="rgba(60,40,10,0.5)" />
          {/* Tallow, top-down, with the cup of melt */}
          <Circle cx={0} cy={0} r={10} color="#e9dfc4" />
          {drips.map((d, i) => (
            <Path key={i} path={d} color="#e2d6b6" />
          ))}
          <Circle cx={0} cy={0} r={6} color="#f4ecd6" />
          <Circle cx={0} cy={0} r={1.4} color="#2a1e14" />
        </Group>
      </ArtSlot>
      <Circle cx={0} cy={0} r={haloR} color={C.lamp} opacity={0.45}>
        <BlurMask blur={8} style="normal" />
      </Circle>
      <Circle cx={0} cy={0} r={flameR} color={C.flameCore}>
        <BlurMask blur={2} style="solid" />
      </Circle>
    </Group>
  );
}

/** Frame and handle only; the lens content is drawn separately by the screen. */
export function MagnifierFrame({ x, y, lift }: Pose & { lift: SharedValue<number> }) {
  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }]);
  const shadow = useDerivedValue(() => [{ translateX: -5 - lift.value * 14 }, { translateY: 7 + lift.value * 18 }]);
  return (
    <Group transform={transform}>
      <ArtSlot slot="magnifier" rect={{ x: -60, y: -60, w: 120, h: 120 }}>
        <Group>
          <Group transform={shadow} opacity={0.45}>
            <Circle cx={0} cy={0} r={LENS_R + 4} style="stroke" strokeWidth={7} color="#000">
              <BlurMask blur={5} style="normal" />
            </Circle>
            <Group transform={[{ rotate: Math.PI / 4 }]}>
              <RoundedRect x={LENS_R} y={-6} width={70} height={12} r={6} color="#000">
                <BlurMask blur={5} style="normal" />
              </RoundedRect>
            </Group>
          </Group>
          <Group transform={[{ rotate: Math.PI / 4 }]}>
            <Rect x={LENS_R - 2} y={-4} width={14} height={8} color={C.brassDark} />
            <RoundedRect x={LENS_R + 10} y={-6.5} width={62} height={13} r={6}>
              <LinearGradient start={vec(0, -6)} end={vec(0, 7)} colors={['#5a3720', '#2e1b0e', '#1a0f07']} />
            </RoundedRect>
          </Group>
          <Circle cx={0} cy={0} r={LENS_R + 2} style="stroke" strokeWidth={6}>
            <LinearGradient start={vec(-LENS_R, -LENS_R)} end={vec(LENS_R, LENS_R)} colors={[C.brassLight, C.brass, C.brassDark]} />
          </Circle>
        </Group>
      </ArtSlot>
      {/* Glass: one curved reflection of the lamp, up and to the right */}
      <Oval x={8} y={-LENS_R + 8} width={22} height={10} color="rgba(255,240,210,0.22)" transform={[{ rotate: 0.6 }]} origin={{ x: 19, y: -LENS_R + 13 }}>
        <BlurMask blur={2} style="normal" />
      </Oval>
      <Circle cx={0} cy={0} r={LENS_R - 1} style="stroke" strokeWidth={2} color="rgba(255,255,255,0.08)">
        <Shadow dx={0} dy={0} blur={6} color="rgba(0,0,0,0.5)" inner />
      </Circle>
    </Group>
  );
}
