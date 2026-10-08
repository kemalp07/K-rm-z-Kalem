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
  const radius = useDerivedValue(() => 720 * (0.72 + 0.28 * level.value) * (0.99 + (flicker.value - 1) * 0.4));
  const glowRadius = useDerivedValue(() => 380 * (0.6 + 0.4 * level.value) * flicker.value);
  const glowOpacity = useDerivedValue(() => 0.07 * level.value);
  const night = useDerivedValue(() => (1 - level.value) * 0.55);
  const candleC = useDerivedValue(() => vec(candleX.value + candleOffset.dx, candleY.value + candleOffset.dy));
  const candleR = useDerivedValue(() => candleReach * candleFlicker.value);
  const center = vec(POOL.x, POOL.y);

  return (
    <Group>
      {/* Cold window spill on the left, under the dark so the lamp can still win */}
      <Group blendMode="screen">
        {/* Gradients are drawn only over the area they light: fewer pixels each frame. */}
        <Circle cx={70} cy={250} r={200}>
          <RadialGradient c={vec(70, 250)} r={200} colors={['rgba(40,58,90,0.08)', 'rgba(0,0,0,0)']} />
        </Circle>
      </Group>

      <Rect x={-400} y={-200} width={WORLD.w + 800} height={WORLD.h + 400}>
        <RadialGradient c={center} r={radius} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(12,8,4,0.22)', 'rgba(6,4,2,0.55)']} positions={[0, 0.72, 0.9, 1]} />
      </Rect>
      {dimmed && <Rect x={-400} y={-200} width={WORLD.w + 800} height={WORLD.h + 400} color="#05070c" opacity={night} />}

      <Group blendMode="screen" opacity={glowOpacity}>
        <Circle c={GLOW_C} r={glowRadius}>
          <RadialGradient c={GLOW_C} r={glowRadius} colors={['rgba(255,214,150,0.55)', 'rgba(0,0,0,0)']} positions={[0, 1]} />
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
      <RadialGradient c={vec(WORLD.w * 0.5, WORLD.h * 0.5)} r={820} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.45)']} positions={[0, 0.78, 0.92, 1]} />
    </Rect>
  );
}
