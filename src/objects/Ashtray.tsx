import { BlurMask, Circle, Group, Oval, Path, RadialGradient, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { teardrop } from '../scene/Lamp';
import { LAYOUT } from '../scene/world';

const FLAME = teardrop(5, 16);

/**
 * A brass ashtray in front of the lamp, with a low fire in the ash.
 * A letter thrown here burns; the dish itself stays.
 */
export function Ashtray({ flicker, flare }: { flicker: SharedValue<number>; flare: SharedValue<number> }) {
  const { x, y, r } = LAYOUT.ashtray;
  const flame = useDerivedValue(() => {
    const k = flicker.value * (0.85 + flare.value * 0.9);
    return [{ translateX: x }, { translateY: y - 2 }, { scaleY: 0.7 + (k - 0.8) * 0.8 }, { scaleX: 1.15 - (k - 1) * 0.35 }];
  });
  return (
    <Group>
      <Oval x={x - r - 4} y={y - r * 0.28} width={(r + 4) * 2} height={r * 0.7} color="rgba(0,0,0,0.35)">
        <BlurMask blur={4} style="normal" />
      </Oval>
      <Oval x={x - r} y={y - r * 0.42} width={r * 2} height={r * 0.95} color="#4a3014">
        <RadialGradient c={vec(x - 4, y - 2)} r={r} colors={['#e6c98a', '#a8843f', '#5c3d16', '#2a1a0c']} />
      </Oval>
      <Oval x={x - r + 5} y={y - r * 0.28} width={(r - 5) * 2} height={r * 0.62} color="#1a120c" />
      <Circle cx={x - 6} cy={y + 1} r={2.2} color="#3a3532" />
      <Circle cx={x + 7} cy={y + 2} r={1.6} color="#2c2826" />
      <Circle cx={x + 1} cy={y - 1} r={14} color="rgba(255,140,40,0.18)">
        <BlurMask blur={6} style="normal" />
      </Circle>
      <Group transform={flame}>
        <Path path={FLAME} color="#ffb25a" opacity={0.9}>
          <BlurMask blur={1.4} style="solid" />
        </Path>
        <Path path={FLAME} color="#fff1c4" opacity={0.8} transform={[{ scale: 0.45 }]} />
      </Group>
    </Group>
  );
}
