import { Circle, Group, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { LAMP_FLAME_Y } from './Lamp';
import { LAYOUT, WORLD } from './world';

interface Props {
  flicker: SharedValue<number>;
  level: SharedValue<number>;
  candleX: SharedValue<number>;
  candleY: SharedValue<number>;
  candleFlicker: SharedValue<number>;
  /** Flame position relative to the candle's (x, y). */
  candleOffset: { dx: number; dy: number };
  /** Lamp turned down (end of day): the night closes in. */
  dimmed: boolean;
  /** Whether there is a candle on the desk yet. */
  candle: boolean;
  /** How far the candle's warm circle reaches. */
  candleReach: number;
}

// The pool is centred below-left of the lamp: that is where the chimney throws its light.
const POOL = { x: LAYOUT.lamp.cx - 300, y: LAMP_FLAME_Y + 205 };
const GLOW_C = vec(LAYOUT.lamp.cx - 120, LAMP_FLAME_Y + 125);

/**
 * Light is subtracted, not added: everything is drawn at full colour, then the
 * dark is laid over it with a hole where the lamp reaches. A warm screen pass
 * on top gives the paper its yellow.
 */
export function LightPool({ flicker, level, candleX, candleY, candleFlicker, candleOffset, dimmed, candle, candleReach }: Props) {
  const radius = useDerivedValue(() => 640 * (0.5 + 0.5 * level.value) * (0.985 + (flicker.value - 1) * 0.9));
  const glowRadius = useDerivedValue(() => 500 * (0.45 + 0.55 * level.value) * flicker.value);
  const glowOpacity = useDerivedValue(() => 0.26 * level.value * (0.9 + (flicker.value - 1) * 2));
  const night = useDerivedValue(() => (1 - level.value) * 0.55);
  const candleC = useDerivedValue(() => vec(candleX.value + candleOffset.dx, candleY.value + candleOffset.dy));
  const candleR = useDerivedValue(() => candleReach * candleFlicker.value);
  const center = vec(POOL.x, POOL.y);

  return (
    <Group>
      {/* Cold window spill on the left, under the dark so the lamp can still win */}
      <Group blendMode="screen">
        {/* Gradients are drawn only over the area they light: fewer pixels each frame. */}
        <Circle cx={70} cy={250} r={240}>
          <RadialGradient c={vec(70, 250)} r={240} colors={['rgba(55,78,120,0.14)', 'rgba(28,42,74,0.05)', 'rgba(0,0,0,0)']} />
        </Circle>
      </Group>

      <Rect x={-400} y={-200} width={WORLD.w + 800} height={WORLD.h + 400}>
        <RadialGradient c={center} r={radius} colors={['rgba(0,0,0,0)', 'rgba(8,5,3,0.2)', 'rgba(5,3,2,0.7)', 'rgba(2,1,1,0.92)']} positions={[0, 0.48, 0.8, 1]} />
      </Rect>
      {dimmed && <Rect x={-400} y={-200} width={WORLD.w + 800} height={WORLD.h + 400} color="#05070c" opacity={night} />}

      <Group blendMode="screen" opacity={glowOpacity}>
        <Circle c={GLOW_C} r={glowRadius}>
          <RadialGradient c={GLOW_C} r={glowRadius} colors={['rgba(255,210,122,0.85)', 'rgba(255,190,100,0.35)', 'rgba(0,0,0,0)']} positions={[0, 0.45, 1]} />
        </Circle>
      </Group>

      {/* The candle carries its own small warm circle wherever it goes */}
      {candle && <Group blendMode="screen">
        <Circle c={candleC} r={candleR}>
          <RadialGradient c={candleC} r={candleR} colors={['rgba(255,170,80,0.32)', 'rgba(255,140,60,0.1)', 'rgba(0,0,0,0)']} />
        </Circle>
      </Group>}
    </Group>
  );
}

export function Vignette() {
  return (
    <Rect x={-400} y={-200} width={WORLD.w + 800} height={WORLD.h + 400}>
      <RadialGradient c={vec(WORLD.w * 0.46, WORLD.h * 0.48)} r={780} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.88)']} positions={[0, 0.55, 0.82, 1]} />
    </Rect>
  );
}
