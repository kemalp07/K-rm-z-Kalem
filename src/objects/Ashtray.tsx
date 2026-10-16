import { BlurMask, Circle, Group, Oval, Path, RadialGradient, RoundedRect, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { PlacedArt, placed } from '../art/ArtSlot';
import { teardrop } from '../scene/Lamp';
import { LAYOUT } from '../scene/world';

/** Short flame, only while a letter is in the dish. Idle, the ashtray just holds a coal. */
const FLAME = teardrop(8, 14);

const SHADOW = { transform: [{ translateX: -3 }, { translateY: 4 }], opacity: 0.45, restBlur: 4 };

const ASH = placed('ashtray');
/** Board offset of the live coal. On the drawing it sits on a charred tip. */
const COAL = ASH?.point('coal') ?? { x: 4, y: -2 };

/** One crushed cigarette, along +x. Cream paper, a cardboard mouthpiece, a charred tip. */
function Butt({ x, y, rot, len }: { x: number; y: number; rot: number; len: number }) {
  const h = 3.2;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { rotate: rot }]}>
      <RoundedRect x={-len / 2} y={-h / 2} width={len} height={h} r={h / 2} color="#efe4cc" />
      <RoundedRect x={-len / 2} y={-h / 2} width={4.2} height={h} r={h / 2} color="#c4a36a" />
      <RoundedRect x={len / 2 - 6.5} y={-h / 2 + 0.35} width={2.4} height={h - 0.7} r={0.5} color="#8d877f" />
      <RoundedRect x={len / 2 - 4.4} y={-h / 2} width={4.4} height={h} r={h / 2} color="#2c2724" />
    </Group>
  );
}

/**
 * A round brass ashtray in front of the pile: ash, cigarette butts, one live coal.
 * A letter thrown here flares; the dish stays. The candle is a different tool.
 */
export function Ashtray({ flicker, flare }: { flicker: SharedValue<number>; flare: SharedValue<number> }) {
  const { x, y, r } = LAYOUT.ashtray;
  const R = r * 0.9;
  const flame = useDerivedValue(() => {
    const k = flare.value;
    return [{ translateX: x }, { translateY: y - 2 }, { scaleX: 0.65 + k * 0.7 }, { scaleY: 0.3 + k * 1.15 }];
  });
  const flameOpacity = useDerivedValue(() => Math.min(1, flare.value * 1.4));
  const coal = useDerivedValue(() => (1.5 + flare.value * 2.2) * flicker.value);
  return (
    <Group>
      <Group transform={[{ translateX: x }, { translateY: y }]}>
        <PlacedArt slot="ashtray" shadow={SHADOW}>
          <Group>
            <Oval x={-R - 6} y={-R * 0.35} width={(R + 6) * 2} height={R * 0.7} color="rgba(0,0,0,0.35)">
              <BlurMask blur={4} style="normal" />
            </Oval>
            <Circle cx={0} cy={0} r={R}>
              <RadialGradient c={vec(-6, -4)} r={R} colors={['#e6c98a', '#a8843f', '#5c3d16', '#2a1a0c']} />
            </Circle>
            <Circle cx={0} cy={0} r={R - 4.5} color="#1c1612" />
            <Circle cx={0} cy={0} r={R - 7} color="#6a645e" />
            <Circle cx={-4} cy={2} r={R - 12} color="#4e4944" />
            <Butt x={-5} y={1} rot={0.4} len={18} />
            <Butt x={6} y={-4} rot={-0.95} len={15} />
            <Butt x={1} y={7} rot={1.65} len={12} />
          </Group>
        </PlacedArt>
      </Group>
      <Circle cx={x + COAL.x} cy={y + COAL.y} r={coal} color="#ff9a3c">
        <BlurMask blur={2.2} style="solid" />
      </Circle>
      <Group transform={flame} opacity={flameOpacity}>
        <Path path={FLAME} color="#ffb25a" opacity={0.9}>
          <BlurMask blur={1.4} style="solid" />
        </Path>
        <Path path={FLAME} color="#fff1c4" opacity={0.75} transform={[{ scale: 0.45 }]} />
      </Group>
    </Group>
  );
}
