import { useMemo } from 'react';
import { BlurMask, Circle, Group, LinearGradient, Oval, Path, RadialGradient, Rect, Skia, vec, type SkPath } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { ArtSlot, PlacedArt, placed } from '../art/ArtSlot';
import { C } from './palette';
import { LAYOUT } from './world';

interface Props {
  flicker: SharedValue<number>;
  level: SharedValue<number>;
}

/** Brass, lit from the flame above: dark at the edges, a hot vertical highlight off-centre. */
const BRASS = ['#3b2a10', '#7a5a26', '#c9a35a', '#f2d896', '#b58a3e', '#5a4018', '#2c1f0b'];
const BRASS_AT = [0, 0.18, 0.42, 0.55, 0.68, 0.86, 1];

/** A shape symmetric about x = cx, from a list of (half-width, y) points, top to bottom. */
function lathe(cx: number, profile: [number, number][]): SkPath {
  const b = Skia.PathBuilder.Make();
  const [w0, y0] = profile[0]!;
  b.moveTo(cx - w0, y0);
  // Left side down, smoothed through midpoints so the silhouette reads as turned metal.
  for (let i = 1; i < profile.length; i++) {
    const [pw, py] = profile[i - 1]!;
    const [w, y] = profile[i]!;
    b.quadTo(cx - pw, py, cx - (pw + w) / 2, (py + y) / 2);
  }
  const [wl, yl] = profile[profile.length - 1]!;
  b.lineTo(cx - wl, yl);
  b.lineTo(cx + wl, yl);
  for (let i = profile.length - 1; i > 0; i--) {
    const [pw, py] = profile[i]!;
    const [w, y] = profile[i - 1]!;
    b.quadTo(cx + pw, py, cx + (pw + w) / 2, (py + y) / 2);
  }
  b.lineTo(cx + w0, y0);
  b.close();
  return b.build();
}

/** Flame as a teardrop, tip up, base at (0,0) — scaled per frame by the flicker. */
export function teardrop(w: number, h: number): SkPath {
  return Skia.PathBuilder.Make()
    .moveTo(0, -h)
    .cubicTo(w * 0.35, -h * 0.62, w, -h * 0.3, w * 0.7, -h * 0.06)
    .cubicTo(w * 0.45, h * 0.12, -w * 0.45, h * 0.12, -w * 0.7, -h * 0.06)
    .cubicTo(-w, -h * 0.3, -w * 0.35, -h * 0.62, 0, -h)
    .close()
    .build();
}

const LAMP_ART = placed('lamp');

/** Where the lamp flame burns: from the illustration when there is one. */
export const LAMP_FLAME_Y = LAMP_ART ? LAYOUT.lamp.baseY + LAMP_ART.point('flame')!.y : LAYOUT.lamp.flameY;

/** Oil lamp in three-quarter view: brass font on the desk, glass chimney, the flame inside. */
export function Lamp({ flicker, level }: Props) {
  const { cx, baseY } = LAYOUT.lamp;
  const flameY = LAMP_FLAME_Y;
  const parts = useMemo(
    () => ({
      font: lathe(cx, [
        [17, baseY - 62],
        [30, baseY - 56],
        [44, baseY - 40],
        [42, baseY - 24],
        [26, baseY - 14],
        [16, baseY - 8],
      ]),
      foot: lathe(cx, [
        [18, baseY - 10],
        [26, baseY - 4],
        [46, baseY + 2],
        [50, baseY + 8],
      ]),
      burner: lathe(cx, [
        [15, baseY - 84],
        [19, baseY - 76],
        [21, baseY - 66],
        [18, baseY - 60],
      ]),
      chimney: lathe(cx, [
        [11, flameY - 92],
        [10, flameY - 60],
        [12, flameY - 40],
        [21, flameY - 14],
        [23, flameY + 4],
        [19, flameY + 18],
        [15, baseY - 84],
      ]),
      flame: LAMP_ART ? teardrop(5, 17) : teardrop(7, 22),
      core: LAMP_ART ? teardrop(2.3, 8) : teardrop(3.2, 10),
    }),
    [cx, baseY, flameY],
  );

  const flameT = useDerivedValue(() => {
    const f = flicker.value;
    const l = 0.55 + 0.45 * level.value;
    return [{ translateX: cx + (f - 1) * 6 }, { translateY: flameY + (LAMP_ART ? 0 : 8) }, { scaleX: l * (0.96 + (1 - f) * 0.6) }, { scaleY: l * (0.9 + (f - 0.9) * 1.2) }];
  });
  const flameOpacity = useDerivedValue(() => 0.35 + 0.65 * level.value);
  const core = useDerivedValue(() => 9 * flicker.value * (0.5 + 0.5 * level.value));
  const coreSmall = useDerivedValue(() => 3.2 * flicker.value * (0.6 + 0.4 * level.value));
  const halo = useDerivedValue(() => 34 * flicker.value * (0.4 + 0.6 * level.value));
  const haloOpacity = useDerivedValue(() => 0.6 * level.value);
  // Light caught by the glass from inside: brighter when the flame is up.
  const glassGlow = useDerivedValue(() => 0.1 + 0.25 * level.value * flicker.value);

  const bw = 100;
  return (
    <Group>
      {LAMP_ART ? (
        <Group transform={[{ translateX: cx }, { translateY: baseY }]}>
          <PlacedArt slot="lamp" shadow={{ transform: [{ translateX: -9 }, { translateY: 11 }], opacity: 0.6, restBlur: 8 }}>
            {null}
          </PlacedArt>
        </Group>
      ) : (
        <>
      {/* Shadow thrown down-left across the desk by the window's cold light */}
      <Oval x={cx - 86} y={baseY - 6} width={120} height={30} color="rgba(0,0,0,0.55)">
        <BlurMask blur={10} style="normal" />
      </Oval>
      <ArtSlot slot="lamp" rect={{ x: cx - 75, y: flameY - 100, w: 150, h: baseY + 10 - (flameY - 100) }}>
        <Group>
          {/* Foot */}
          <Path path={parts.foot}>
            <LinearGradient start={vec(cx - 50, 0)} end={vec(cx + 50, 0)} colors={BRASS} positions={BRASS_AT} />
          </Path>

          {/* Font: the oil bowl, with an embossed band */}
          <Path path={parts.font}>
            <LinearGradient start={vec(cx - bw / 2, 0)} end={vec(cx + bw / 2, 0)} colors={BRASS} positions={BRASS_AT} />
          </Path>
          <Path path={parts.font} style="stroke" strokeWidth={0.8} color="rgba(40,25,5,0.6)" />
          <Rect x={cx - 43} y={baseY - 38} width={86} height={2.2} color="rgba(50,32,8,0.55)" />
          <Rect x={cx - 43} y={baseY - 35.6} width={86} height={1} color="rgba(255,236,180,0.35)" />
          {/* Reflection of the flame on the shoulder */}
          <Oval x={cx + 6} y={baseY - 56} width={18} height={6} color="rgba(255,244,210,0.55)">
            <BlurMask blur={2.5} style="normal" />
          </Oval>

          {/* Collar and burner, with the wick key */}
          <Path path={parts.burner}>
            <LinearGradient start={vec(cx - 22, 0)} end={vec(cx + 22, 0)} colors={['#2c1f0b', '#8a6a30', '#e3c27e', '#7a5a26', '#2c1f0b']} />
          </Path>
          {Array.from({ length: 7 }, (_, i) => (
            <Circle key={i} cx={cx - 13 + i * 4.3} cy={baseY - 71} r={0.9} color="rgba(20,12,4,0.8)" />
          ))}
          <Rect x={cx + 19} y={baseY - 74} width={9} height={3} color="#6f5424" />
          <Circle cx={cx + 31} cy={baseY - 72.5} r={4.5}>
            <RadialGradient c={vec(cx + 32, baseY - 74)} r={6} colors={['#f2d896', '#a8843f', '#4a3510']} />
          </Circle>
        </Group>
      </ArtSlot>
        </>
      )}

      {/* Glow inside the chimney and the flame itself */}
      <Circle cx={cx} cy={flameY} r={halo} color={C.lamp} opacity={haloOpacity}>
        <BlurMask blur={16} style="normal" />
      </Circle>
      {LAMP_ART ? (
        // Seen from above, a flame is a bright knot of light down the chimney.
        <Group opacity={flameOpacity}>
          <Circle cx={cx} cy={flameY} r={core} color="#ffd27a">
            <BlurMask blur={4} style="solid" />
          </Circle>
          <Circle cx={cx} cy={flameY} r={coreSmall} color={C.flameCore}>
            <BlurMask blur={1.5} style="solid" />
          </Circle>
        </Group>
      ) : (
      <Group transform={flameT} opacity={flameOpacity}>
        <Path path={parts.flame}>
          <LinearGradient start={vec(0, 0)} end={vec(0, -22)} colors={['rgba(90,120,255,0.55)', '#ffb347', '#ffd27a', 'rgba(255,240,200,0.6)']} positions={[0, 0.25, 0.7, 1]} />
          <BlurMask blur={1.2} style="solid" />
        </Path>
        <Path path={parts.core} color={C.flameCore} transform={[{ translateY: -2 }]}>
          <BlurMask blur={1} style="solid" />
        </Path>
      </Group>
      )}

      {LAMP_ART ? (
        // The drawn chimney is see-through; fill it with the light it holds.
        <Circle cx={cx} cy={flameY} r={30} color="rgba(255,226,170,1)" opacity={glassGlow} blendMode="screen">
          <BlurMask blur={10} style="normal" />
        </Circle>
      ) : (
        <>
          {/* Chimney glass: nearly clear; edges, a long highlight, and the glow it holds */}
          <Path path={parts.chimney} color="rgba(255,236,200,1)" opacity={glassGlow} blendMode="screen" />
          <Path path={parts.chimney} style="stroke" strokeWidth={1.1} color="rgba(255,240,215,0.38)" />
          <Path path={parts.chimney} style="stroke" strokeWidth={3} color="rgba(255,240,215,0.06)" />
          <Rect x={cx - 15} y={flameY - 14} width={2.4} height={30} color="rgba(255,255,255,0.35)">
            <BlurMask blur={1} style="normal" />
          </Rect>
          <Rect x={cx - 8} y={flameY - 88} width={1.6} height={40} color="rgba(255,255,255,0.22)" />
        </>
      )}
    </Group>
  );
}
