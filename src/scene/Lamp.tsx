import { BlurMask, Circle, Group, LinearGradient, RadialGradient, RoundedRect, Shadow, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { ArtSlot } from '../art/ArtSlot';
import { C } from './palette';
import { LAYOUT } from './world';

interface Props {
  flicker: SharedValue<number>;
  level: SharedValue<number>;
}

/** Oil lamp seen from above: brass font, glass chimney, the flame at the centre. */
export function Lamp({ flicker, level }: Props) {
  const { cx, cy, r } = LAYOUT.lamp;
  const halo = useDerivedValue(() => 30 * flicker.value * (0.35 + 0.65 * level.value));
  const haloOpacity = useDerivedValue(() => 0.55 * level.value);
  const core = useDerivedValue(() => 6.5 * (0.5 + 0.5 * level.value) * (0.92 + (flicker.value - 0.92) * 1.6));
  const coreOpacity = useDerivedValue(() => 0.25 + 0.75 * level.value);
  // The flame leans away from the window draught a hair as it flickers.
  const lean = useDerivedValue(() => [{ translateX: (flicker.value - 1) * 18 }]);

  return (
    <Group>
      <ArtSlot slot="lamp" rect={{ x: cx - 75, y: cy - 75, w: 150, h: 150 }}>
        <Group>
          {/* Wick key sticking out of the collar */}
          <RoundedRect x={cx - r - 10} y={cy + 6} width={20} height={6} r={2} color={C.brassDark} />
          <Circle cx={cx - r - 12} cy={cy + 9} r={6} color={C.brass}>
            <Shadow dx={-2} dy={3} blur={2} color="rgba(0,0,0,0.6)" />
          </Circle>
          {/* Font */}
          <Circle cx={cx} cy={cy} r={r}>
            <RadialGradient c={vec(cx + 18, cy - 20)} r={r * 1.3} colors={[C.brassLight, C.brass, C.brassDark, '#3c2c12']} positions={[0, 0.3, 0.75, 1]} />
            <Shadow dx={-8} dy={10} blur={12} color="rgba(0,0,0,0.75)" />
          </Circle>
          <Circle cx={cx} cy={cy} r={r - 7} style="stroke" strokeWidth={1.4} color="rgba(60,40,12,0.6)" />
          {/* Burner gallery */}
          <Circle cx={cx} cy={cy} r={r * 0.55}>
            <LinearGradient start={vec(cx - 30, cy - 30)} end={vec(cx + 30, cy + 30)} colors={['#8a6a30', '#4f3a16']} />
          </Circle>
          {Array.from({ length: 18 }, (_, i) => {
            const a = (i / 18) * Math.PI * 2;
            return <Circle key={i} cx={cx + Math.cos(a) * r * 0.47} cy={cy + Math.sin(a) * r * 0.47} r={1.4} color="rgba(20,12,4,0.7)" />;
          })}
          {/* Glass chimney: mostly invisible, a rim and one highlight */}
          <Circle cx={cx} cy={cy} r={r * 0.38} color="rgba(255,240,210,0.07)" />
          <Circle cx={cx} cy={cy} r={r * 0.38} style="stroke" strokeWidth={1.6} color="rgba(255,236,200,0.28)" />
        </Group>
      </ArtSlot>
      <Group transform={lean}>
        <Circle cx={cx} cy={cy} r={halo} color={C.lamp} opacity={haloOpacity}>
          <BlurMask blur={14} style="normal" />
        </Circle>
        <Circle cx={cx} cy={cy} r={core} color={C.flameCore} opacity={coreOpacity}>
          <BlurMask blur={3} style="solid" />
        </Circle>
      </Group>
    </Group>
  );
}
