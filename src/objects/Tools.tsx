import { BlurMask, Circle, Group, LinearGradient, Oval, Path, RadialGradient, Rect, RoundedRect, Skia, vec, type SkPath, type Transforms3d } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { PlacedArt, placed } from '../art/ArtSlot';
import { teardrop } from '../scene/Lamp';
import { C } from '../scene/palette';
import { blob } from '../scene/rough';

export const PEN_LENGTH = 168;
export const CANDLE_R = 30;
export const LENS_R = 38;
const CANDLE_ART = placed('candle');
const MAG_ART = placed('magnifier');

/** Where the candle flame sits relative to the saucer centre the player holds. */
export const CANDLE_FLAME = CANDLE_ART
  ? { dx: CANDLE_ART.point('flame')!.x, dy: CANDLE_ART.point('flame')!.y + 3 }
  : { dx: 0, dy: -42 };

/** Far end of the magnifier handle relative to the lens centre (for picking it up). */
export const MAG_HANDLE_END = MAG_ART?.point('handleEnd') ?? { x: (LENS_R + 80) * Math.SQRT1_2, y: (LENS_R + 80) * Math.SQRT1_2 };

interface Pose {
  x: SharedValue<number>;
  y: SharedValue<number>;
}

const BRASS = ['#3b2a10', '#8a6a30', '#e3c27e', '#f6e2a6', '#a8843f', '#4a3510'];
const BRASS_AT = [0, 0.25, 0.48, 0.56, 0.75, 1];

/** Symmetric outline along +x from a list of (x, half-width) stations — turned wood, a candle. */
function turned(profile: [number, number][]): SkPath {
  const b = Skia.PathBuilder.Make();
  b.moveTo(profile[0]![0], -profile[0]![1]);
  for (let i = 1; i < profile.length; i++) {
    const [px, pw] = profile[i - 1]!;
    const [x, w] = profile[i]!;
    b.quadTo(px, -pw, (px + x) / 2, -(pw + w) / 2);
  }
  const last = profile[profile.length - 1]!;
  b.lineTo(last[0], -last[1]).lineTo(last[0], last[1]);
  for (let i = profile.length - 1; i > 0; i--) {
    const [px, pw] = profile[i]!;
    const [x, w] = profile[i - 1]!;
    b.quadTo(px, pw, (px + x) / 2, (pw + w) / 2);
  }
  b.lineTo(profile[0]![0], profile[0]![1]).close();
  return b.build();
}

// ---------------------------------------------------------------------------
// Red pencil

const PEN = (() => {
  const L = PEN_LENGTH;
  const W = 5.5;
  const cone = 21;
  // Sharpened wood: the knife left scallops where the paint stops.
  const wood = Skia.PathBuilder.Make().moveTo(-1.7, -5).lineTo(-W, -cone + 1);
  const scallops = 3;
  for (let i = 0; i < scallops; i++) {
    const x0 = -W + ((2 * W) / scallops) * i;
    const x1 = x0 + (2 * W) / scallops;
    wood.quadTo((x0 + x1) / 2, -cone - 3.2, x1, -cone + (i === scallops - 1 ? 1 : 0));
  }
  wood.lineTo(1.7, -5).close();
  const lead = Skia.PathBuilder.Make().moveTo(0, 0).lineTo(-1.8, -5.6).lineTo(1.8, -5.6).close();
  const chips = [blob(-5, -L + 22, 1.4, 'chip1', 0.5, 8), blob(5, -L + 40, 1.1, 'chip2', 0.5, 8), blob(-4.6, -L + 64, 0.9, 'chip3', 0.5, 8)];
  const facets = Skia.PathBuilder.Make().moveTo(-0.8, -6).lineTo(-3.4, -cone + 2).moveTo(0.9, -6).lineTo(2.6, -cone + 1).build();
  return { L, W, cone, wood: wood.build(), lead: lead.build(), chips, facets };
})();

/**
 * Red grease pencil, nib at the local origin, body along -y.
 * `lift` 0..1: how far off the desk it is (shadow grows and drifts).
 */
export function RedPen({ x, y, angle, lift }: Pose & { angle: SharedValue<number>; lift: SharedValue<number> }) {
  const { L, W, cone } = PEN;
  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }, { rotate: angle.value }]);
  // Shadow falls down-left in board space whatever way the pen is turned.
  const shadow = useDerivedValue<Transforms3d>(() => {
    const wx = -3 - lift.value * 12;
    const wy = 4 + lift.value * 16;
    const c = Math.cos(-angle.value);
    const s = Math.sin(-angle.value);
    return [{ translateX: wx * c - wy * s }, { translateY: wx * s + wy * c }];
  });
  const shadowOpacity = useDerivedValue(() => 0.6 - lift.value * 0.3);
  const shadowBlur = useDerivedValue(() => 2.5 + lift.value * 5);
  const body = { y: -L + 3, h: L - cone - 3 };
  return (
    <Group transform={transform}>
      <PlacedArt slot="pen" shadow={{ transform: shadow, opacity: shadowOpacity, blur: shadowBlur }}>
        <Group>
          <Group transform={shadow} opacity={shadowOpacity}>
            <RoundedRect x={-W + 1} y={-L + 2} width={W * 2 - 2} height={L - 4} r={3} color="#000">
              <BlurMask blur={shadowBlur} style="normal" />
            </RoundedRect>
          </Group>

          {/* Sharpened end */}
          <Path path={PEN.wood}>
            <LinearGradient start={vec(-W, 0)} end={vec(W, 0)} colors={['#f0d6a8', '#d9b98a', '#b8925e']} />
          </Path>
          <Path path={PEN.facets} style="stroke" strokeWidth={0.5} color="rgba(110,70,30,0.4)" />
          <Path path={PEN.lead}>
            <LinearGradient start={vec(-2, 0)} end={vec(2, 0)} colors={['#c4382a', '#7d140e']} />
          </Path>

          {/* Hexagonal body: three faces, lit from the lamp on the right of the desk */}
          <Rect x={-W} y={body.y} width={W * 0.66} height={body.h}>
            <LinearGradient start={vec(-W, 0)} end={vec(-W * 0.34, 0)} colors={['#7f1a12', '#a3241b']} />
          </Rect>
          <Rect x={-W * 0.34} y={body.y} width={W * 0.68} height={body.h}>
            <LinearGradient start={vec(-W * 0.34, 0)} end={vec(W * 0.34, 0)} colors={['#b02a1f', '#c8402f']} />
          </Rect>
          <Rect x={W * 0.34} y={body.y} width={W * 0.66} height={body.h}>
            <LinearGradient start={vec(W * 0.34, 0)} end={vec(W, 0)} colors={['#de5a44', '#b8352a']} />
          </Rect>
          <Rect x={-W * 0.34 - 0.3} y={body.y} width={0.6} height={body.h} color="rgba(40,0,0,0.35)" />
          <Rect x={W * 0.34 - 0.3} y={body.y} width={0.6} height={body.h} color="rgba(255,200,180,0.25)" />
          {/* Lacquer gloss, broken where the hand wore it */}
          <Rect x={W * 0.55} y={body.y + 26} width={1} height={60} color="rgba(255,235,220,0.45)" />
          <Rect x={W * 0.55} y={body.y + 92} width={1} height={36} color="rgba(255,235,220,0.3)" />

          {/* Gold foil band and maker's mark, rubbed thin */}
          <Rect x={-W} y={-L + 18} width={W * 2} height={1.4} color="rgba(214,178,98,0.85)" />
          <Rect x={-W} y={-L + 21} width={W * 2} height={0.7} color="rgba(214,178,98,0.6)" />
          {[30, 34.5, 37, 41.5, 44, 48].map((dy) => (
            <Rect key={dy} x={-0.8} y={-L + dy} width={1.6} height={1.6} color="rgba(214,178,98,0.55)" />
          ))}
          {PEN.chips.map((c, i) => (
            <Path key={i} path={c} color="#cfae7e" />
          ))}

          {/* Dipped end, rounded */}
          <RoundedRect x={-W} y={-L} width={W * 2} height={6} r={2.6}>
            <LinearGradient start={vec(-W, 0)} end={vec(W, 0)} colors={['#4a0d08', '#7a1912', '#a32a20']} />
          </RoundedRect>
        </Group>
      </PlacedArt>
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Candle in a brass chamberstick, three-quarter view, origin at the saucer centre

const CANDLE = (() => {
  const top = -40;
  const body = Skia.PathBuilder.Make().moveTo(-8, -7).lineTo(-8, top).lineTo(8, top).lineTo(8, -7).close().build();
  // Wax that ran over the lip and set halfway down.
  const drips = [
    Skia.PathBuilder.Make().moveTo(3, top).quadTo(6.5, top + 4, 5.6, top + 13).quadTo(5.2, top + 17, 3.8, top + 13).quadTo(3.4, top + 6, 1.5, top + 1).close().build(),
    Skia.PathBuilder.Make().moveTo(-6, top + 1).quadTo(-8.6, top + 6, -8.2, top + 21).quadTo(-7.6, top + 25, -6.6, top + 21).quadTo(-6.4, top + 8, -4.6, top + 1).close().build(),
  ];
  const wick = Skia.PathBuilder.Make().moveTo(0, top + 1).quadTo(0.3, top - 3, 1.4, top - 5).build();
  return { top, body, drips, wick, flame: teardrop(4.4, 15), core: teardrop(2, 7) };
})();

export function Candle({ x, y, flicker, lift }: Pose & { flicker: SharedValue<number>; lift: SharedValue<number> }) {
  const { top } = CANDLE;
  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }]);
  const shadow = useDerivedValue<Transforms3d>(() => [{ translateX: -6 - lift.value * 12 }, { translateY: 4 + lift.value * 12 }]);
  const flameT = useDerivedValue(() => [
    { translateX: CANDLE_FLAME.dx + (flicker.value - 1) * 8 },
    { translateY: CANDLE_FLAME.dy },
    { scaleY: 0.85 + (flicker.value - 0.85) * 1.3 },
    { scaleX: 1.05 - (flicker.value - 1) * 0.8 },
  ]);
  const haloR = useDerivedValue(() => 18 * flicker.value);
  return (
    <Group transform={transform}>
      <PlacedArt slot="candle" shadow={{ transform: shadow, opacity: 0.55, blur: 5 }}>
        <Group>
          {/* Shadow of saucer and stick */}
          <Group transform={shadow} opacity={0.6}>
            <Oval x={-32} y={-14} width={64} height={30} color="#000">
              <BlurMask blur={6} style="normal" />
            </Oval>
            <Rect x={-30} y={-6} width={22} height={12} color="#000" transform={[{ rotate: 0.9 }]} origin={{ x: -8, y: 0 }}>
              <BlurMask blur={6} style="normal" />
            </Rect>
          </Group>

          {/* Finger ring */}
          <Oval x={24} y={-6} width={18} height={13} style="stroke" strokeWidth={3.4}>
            <LinearGradient start={vec(24, -6)} end={vec(42, 7)} colors={['#f2d896', '#a8843f', '#4a3510']} />
          </Oval>
          {/* Saucer */}
          <Oval x={-30} y={-13} width={60} height={28}>
            <LinearGradient start={vec(-30, 0)} end={vec(30, 0)} colors={BRASS} positions={BRASS_AT} />
          </Oval>
          <Oval x={-23} y={-9} width={46} height={19}>
            <RadialGradient c={vec(4, -2)} r={26} colors={['#c9a35a', '#7a5a26', '#3b2a10']} />
          </Oval>
          <Oval x={-30} y={-13} width={60} height={28} style="stroke" strokeWidth={0.8} color="rgba(255,236,190,0.4)" />
          {/* Socket */}
          <Rect x={-10} y={-10} width={20} height={6}>
            <LinearGradient start={vec(-10, 0)} end={vec(10, 0)} colors={BRASS} positions={BRASS_AT} />
          </Rect>
          <Oval x={-10} y={-7} width={20} height={6}>
            <LinearGradient start={vec(-10, 0)} end={vec(10, 0)} colors={BRASS} positions={BRASS_AT} />
          </Oval>

          {/* Tallow: shaded round, with what melted down its side */}
          <Path path={CANDLE.body}>
            <LinearGradient start={vec(-8, 0)} end={vec(8, 0)} colors={['#a89a78', '#d9cdaa', '#f4ead0', '#fff8e6', '#e2d5b2']} positions={[0, 0.3, 0.6, 0.72, 1]} />
          </Path>
          {CANDLE.drips.map((d, i) => (
            <Path key={i} path={d}>
              <LinearGradient start={vec(-8, 0)} end={vec(8, 0)} colors={['#c9bc98', '#f6eed8']} />
            </Path>
          ))}
          <Oval x={-8} y={top - 3} width={16} height={6} color="#efe4c6" />
          {/* The melt pool lets the flame through */}
          <Oval x={-5.5} y={top - 2} width={11} height={4} color="rgba(255,200,120,0.55)" />
          <Path path={CANDLE.wick} style="stroke" strokeWidth={1.2} strokeCap="round" color="#1d140c" />
        </Group>
      </PlacedArt>

      <Circle cx={CANDLE_FLAME.dx} cy={CANDLE_FLAME.dy - 6} r={haloR} color={C.lamp} opacity={0.5}>
        <BlurMask blur={10} style="normal" />
      </Circle>
      <Group transform={flameT}>
        <Path path={CANDLE.flame}>
          <LinearGradient start={vec(0, 0)} end={vec(0, -15)} colors={['rgba(80,110,255,0.6)', '#ff9f40', '#ffd27a', 'rgba(255,240,200,0.5)']} positions={[0, 0.22, 0.65, 1]} />
          <BlurMask blur={1} style="solid" />
        </Path>
        <Path path={CANDLE.core} color={C.flameCore} transform={[{ translateY: -1.5 }]}>
          <BlurMask blur={0.8} style="solid" />
        </Path>
      </Group>
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Magnifying glass: brass rim, walnut handle. Origin at the lens centre.

const MAG = (() => {
  const R = LENS_R;
  const handle = turned([
    [R + 14, 4.6],
    [R + 20, 6.4],
    [R + 27, 5.0],
    [R + 42, 6.8],
    [R + 58, 5.8],
    [R + 70, 7.2],
    [R + 77, 5.6],
    [R + 80, 2.5],
  ]);
  const grain = [-2.5, 0.5, 3].map((dy, i) =>
    Skia.PathBuilder.Make()
      .moveTo(R + 16, dy)
      .quadTo(R + 40, dy + (i - 1) * 1.2, R + 76, dy * 0.6)
      .build(),
  );
  // Lamp catch-light on the rim and a curved reflection in the glass, both up-right.
  const rimLight = Skia.PathBuilder.Make().addArc({ x: -R - 5, y: -R - 5, width: (R + 5) * 2, height: (R + 5) * 2 }, -95, 70).build();
  const glassLight = Skia.PathBuilder.Make().addArc({ x: -R + 9, y: -R + 9, width: (R - 9) * 2, height: (R - 9) * 2 }, -80, 48).build();
  return { R, handle, grain, rimLight, glassLight };
})();

/** Frame and handle only; the lens content is drawn separately by the screen. */
export function MagnifierFrame({ x, y, lift }: Pose & { lift: SharedValue<number> }) {
  const { R } = MAG;
  const transform = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }]);
  const shadow = useDerivedValue<Transforms3d>(() => [{ translateX: -5 - lift.value * 14 }, { translateY: 7 + lift.value * 18 }]);
  const shadowBlur = useDerivedValue(() => 4 + lift.value * 5);
  return (
    <Group transform={transform}>
      <PlacedArt slot="magnifier" shadow={{ transform: shadow, opacity: 0.5, blur: shadowBlur }}>
        <Group>
          <Group transform={shadow} opacity={0.5}>
            <Circle cx={0} cy={0} r={R + 3} style="stroke" strokeWidth={8} color="#000">
              <BlurMask blur={shadowBlur} style="normal" />
            </Circle>
            <Path path={MAG.handle} color="#000" transform={[{ rotate: Math.PI / 4 }]}>
              <BlurMask blur={shadowBlur} style="normal" />
            </Path>
          </Group>

          <Group transform={[{ rotate: Math.PI / 4 }]}>
            {/* Brass ferrule with two turned bands */}
            <Rect x={R + 1} y={-5.2} width={14} height={10.4}>
              <LinearGradient start={vec(0, -5.2)} end={vec(0, 5.2)} colors={['#4a3510', '#c9a35a', '#f6e2a6', '#8a6a30', '#3b2a10']} />
            </Rect>
            <Rect x={R + 5} y={-5.2} width={1} height={10.4} color="rgba(40,25,5,0.6)" />
            <Rect x={R + 10} y={-5.2} width={1} height={10.4} color="rgba(40,25,5,0.6)" />
            {/* Walnut handle */}
            <Path path={MAG.handle}>
              <LinearGradient start={vec(0, -7)} end={vec(0, 7)} colors={['#1a0d05', '#6b3d1f', '#a8703f', '#5a3216', '#170b04']} positions={[0, 0.3, 0.42, 0.7, 1]} />
            </Path>
            {MAG.grain.map((g, i) => (
              <Path key={i} path={g} style="stroke" strokeWidth={0.5} color="rgba(20,8,2,0.35)" />
            ))}
          </Group>

          {/* Rim: bevelled brass ring */}
          <Circle cx={0} cy={0} r={R + 2} style="stroke" strokeWidth={7.5}>
            <LinearGradient start={vec(-R, R)} end={vec(R, -R)} colors={BRASS} positions={BRASS_AT} />
          </Circle>
          <Circle cx={0} cy={0} r={R - 1.6} style="stroke" strokeWidth={0.9} color="rgba(30,18,4,0.7)" />
          <Circle cx={0} cy={0} r={R + 5.6} style="stroke" strokeWidth={0.7} color="rgba(30,18,4,0.5)" />
          <Path path={MAG.rimLight} style="stroke" strokeWidth={1.4} strokeCap="round" color="rgba(255,244,210,0.75)">
            <BlurMask blur={0.6} style="solid" />
          </Path>
        </Group>
      </PlacedArt>

      {/* Glass: darker towards the edge where it thickens, a bright refraction ring, one reflection */}
      <Circle cx={0} cy={0} r={R - 1}>
        <RadialGradient c={vec(-6, 6)} r={R} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(25,18,8,0.32)']} positions={[0, 0.72, 1]} />
      </Circle>
      <Circle cx={0} cy={0} r={R - 4} style="stroke" strokeWidth={1} color="rgba(255,240,215,0.14)" />
      <Path path={MAG.glassLight} style="stroke" strokeWidth={3.2} strokeCap="round" color="rgba(255,250,235,0.32)">
        <BlurMask blur={1.4} style="normal" />
      </Path>
      <Circle cx={R * 0.42} cy={-R * 0.5} r={2} color="rgba(255,252,240,0.6)">
        <BlurMask blur={1} style="normal" />
      </Circle>
    </Group>
  );
}
