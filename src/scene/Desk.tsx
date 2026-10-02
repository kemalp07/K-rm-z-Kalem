import { useMemo } from 'react';
import { BlurMask, Circle, ColorMatrix, FractalNoise, Group, LinearGradient, Path, Rect, vec } from '@shopify/react-native-skia';
import { ArtSlot } from '../art/ArtSlot';
import { C } from './palette';
import { between, rng } from './rand';
import { blob, shakyLine } from './rough';
import { DESK_EXTENT as E, WORLD } from './world';

// Greyscale with alpha kept — turns RGB noise into wood fibre.
const MONO = [0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0, 0, 0, 0, 1];

const PLANKS = [
  { y: 0, h: 128, tone: [C.deskMid, C.deskDark] },
  { y: 128, h: 146, tone: [C.deskLight, C.deskMid] },
  { y: 274, h: 138, tone: [C.deskMid, '#2f1d10'] },
  { y: 412, h: 148, tone: ['#3a2414', C.deskDark] },
] as const;

export function Desk() {
  const marks = useMemo(() => {
    const r = rng('desk-marks');
    return {
      seams: PLANKS.slice(1).map((p, i) => shakyLine(E.x, p.y, E.x + E.w, p.y + between(r, -1.5, 1.5), `seam${i}`, 0.6)),
      knots: [
        { path: blob(612, 196, 9, 'knot1', 0.3), ring: blob(612, 196, 17, 'knot1r', 0.2) },
        { path: blob(118, 478, 6, 'knot2', 0.3), ring: blob(118, 478, 12, 'knot2r', 0.25) },
      ],
      scratches: Array.from({ length: 9 }, (_, i) => {
        const x = between(r, 120, 940);
        const y = between(r, 60, 540);
        const len = between(r, 14, 60);
        const a = between(r, -0.4, 0.4);
        return shakyLine(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, `scr${i}`, 0.4);
      }),
      // Old inkwell spill near where letters lie, half-sanded away.
      blot: blob(684, 452, 11, 'blot', 0.45, 18),
      blotSpray: Array.from({ length: 6 }, (_, i) => ({ cx: 684 + between(r, -26, 26), cy: 452 + between(r, -20, 20), r: between(r, 0.8, 2.4), k: i })),
    };
  }, []);

  return (
    <ArtSlot slot="desk" rect={E}>
      <Group>
        {PLANKS.map((p, i) => (
          <Rect key={i} x={E.x} y={p.y} width={E.w} height={p.h}>
            <LinearGradient start={vec(E.x, p.y)} end={vec(E.x + E.w, p.y + p.h)} colors={[...p.tone]} />
          </Rect>
        ))}
        {/* Long fibres along each plank. Different seeds so planks don't repeat. */}
        {PLANKS.map((p, i) => (
          <Group key={`g${i}`} blendMode="multiply" opacity={0.55}>
            <Rect x={E.x} y={p.y} width={E.w} height={p.h}>
              <FractalNoise freqX={0.0035} freqY={0.11} octaves={4} seed={i * 7 + 3} />
              <ColorMatrix matrix={MONO} />
            </Rect>
          </Group>
        ))}
        <Group blendMode="softLight" opacity={0.35}>
          <Rect x={E.x} y={0} width={E.w} height={WORLD.h}>
            <FractalNoise freqX={0.012} freqY={0.3} octaves={2} seed={41} />
            <ColorMatrix matrix={MONO} />
          </Rect>
        </Group>

        {marks.seams.map((s, i) => (
          <Group key={`s${i}`}>
            <Path path={s} style="stroke" strokeWidth={2.2} color="#120a05" />
            <Path path={s} style="stroke" strokeWidth={0.8} color="rgba(255,220,170,0.08)" transform={[{ translateY: 1.6 }]} />
          </Group>
        ))}
        {marks.knots.map((k, i) => (
          <Group key={`k${i}`}>
            <Path path={k.ring} style="stroke" strokeWidth={1.4} color="rgba(20,10,4,0.45)" />
            <Path path={k.path} color="rgba(18,9,3,0.7)">
              <BlurMask blur={2} style="normal" />
            </Path>
          </Group>
        ))}
        {marks.scratches.map((s, i) => (
          <Path key={`c${i}`} path={s} style="stroke" strokeWidth={0.7} color="rgba(255,226,180,0.07)" />
        ))}
        <Path path={marks.blot} color="rgba(8,6,10,0.55)">
          <BlurMask blur={1.2} style="normal" />
        </Path>
        {marks.blotSpray.map((d) => (
          <Circle key={d.k} cx={d.cx} cy={d.cy} r={d.r} color="rgba(8,6,10,0.5)" />
        ))}
        {/* A tea glass ring, years old. */}
        <Circle cx={548} cy={500} r={21} style="stroke" strokeWidth={2.4} color="rgba(14,8,3,0.28)">
          <BlurMask blur={1.5} style="normal" />
        </Circle>
      </Group>
    </ArtSlot>
  );
}
