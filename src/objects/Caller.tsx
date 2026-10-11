import { useMemo } from 'react';
import { Circle, Group, Line, Paint, Path, RoundedRect, Skia, vec, type Transforms3d } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { CallerScript, FaceKind } from '../logic/caller';
import { Fade } from '../scene/Fade';
import { Para } from '../scene/Para';
import { C } from '../scene/palette';
import { roughRect } from '../scene/rough';

/** Where a visitor stands, in board units. The bust is drawn in a 250×250 box at the origin. */
export const CALLER_AT = {
  /** Across the blotter, before the letter is taken. */
  counter: { x: 268, y: 0, s: 1 },
  /** Back at the glass, while the letter is open. Large enough that the face still reads. */
  hatch: { x: -18, y: -22, s: 0.75 },
  /** Off the far side of the counter, where they come from. */
  away: { x: 268, y: -280, s: 1 },
  /** Out through the left, once the stamp has landed. */
  out: { x: -240, y: -22, s: 0.75 },
} as const;

const HX = 118;
const HY = 104;
const SKIN = ['#c9b18a', '#d5c09a', '#bfa67c', '#ddc8a4'] as const;
const COAT = ['#2a1d14', '#231812', '#33241a', '#1c140f'] as const;
const CAP = '#2c241c';

const SPEECH = {
  counter: { x: 488, y: 34, w: 214, h: 84, size: 18 },
  hatch: { x: 8, y: 214, w: 186, h: 50, size: 15 },
} as const;

function bustPaths() {
  const coat = Skia.PathBuilder.Make();
  coat.moveTo(40, 188);
  coat.quadTo(28, 160, 72, 146);
  coat.lineTo(104, 168);
  coat.lineTo(132, 168);
  coat.quadTo(168, 146, 214, 162);
  coat.quadTo(228, 188, 200, 248);
  coat.lineTo(52, 248);
  coat.quadTo(24, 210, 40, 188);
  coat.close();
  const shade = Skia.PathBuilder.Make();
  shade.moveTo(40, 188);
  shade.quadTo(28, 160, 72, 146);
  shade.lineTo(104, 168);
  shade.lineTo(HX, 248);
  shade.lineTo(52, 248);
  shade.quadTo(24, 210, 40, 188);
  shade.close();
  const scarf = Skia.PathBuilder.Make();
  scarf.moveTo(HX - 54, HY - 8);
  scarf.lineTo(HX - 36, 196);
  scarf.lineTo(HX + 36, 196);
  scarf.lineTo(HX + 54, HY - 8);
  scarf.close();
  const collar = Skia.PathBuilder.Make();
  collar.moveTo(HX - 14, 158);
  collar.lineTo(HX, 176);
  collar.lineTo(HX + 14, 158);
  collar.close();
  const chin = Skia.PathBuilder.Make();
  chin.moveTo(HX - 28, HY + 18);
  chin.quadTo(HX, HY + 42, HX + 28, HY + 18);
  chin.quadTo(HX, HY + 28, HX - 28, HY + 18);
  chin.close();
  const moustache = Skia.PathBuilder.Make();
  moustache.moveTo(HX - 18, HY + 14);
  moustache.quadTo(HX - 8, HY + 18, HX, HY + 14);
  moustache.quadTo(HX + 8, HY + 18, HX + 18, HY + 14);
  const kalpak = Skia.PathBuilder.Make();
  kalpak.moveTo(HX - 50, HY - 24);
  kalpak.quadTo(HX - 46, HY - 78, HX, HY - 84);
  kalpak.quadTo(HX + 46, HY - 78, HX + 50, HY - 24);
  kalpak.close();
  return {
    coat: coat.build(),
    shade: shade.build(),
    scarf: scarf.build(),
    collar: collar.build(),
    chin: chin.build(),
    moustache: moustache.build(),
    kalpak: kalpak.build(),
  };
}

function Hat({ face, kalpak }: { face: FaceKind; kalpak: ReturnType<typeof bustPaths>['kalpak'] }) {
  if (face === 'kadin') return null;
  if (face === 'efendi') {
    return (
      <Group>
        <RoundedRect x={HX - 27} y={HY - 86} width={54} height={42} r={2} color="#3c2828" />
        <RoundedRect x={HX - 27} y={HY - 50} width={54} height={7} r={1} color="#2a1c1c" />
        <Line p1={vec(HX + 18, HY - 78)} p2={vec(HX + 36, HY - 58)} color="#1a1212" strokeWidth={1.5} />
        <Circle cx={HX + 38} cy={HY - 56} r={2.4} color="#1a1212" />
      </Group>
    );
  }
  if (face === 'subay') {
    return (
      <Group>
        <RoundedRect x={HX - 34} y={HY - 82} width={68} height={34} r={4} color="#1a1612" />
        <RectBand />
        <RoundedRect x={HX - 48} y={HY - 50} width={96} height={12} r={3} color="#14110e" />
      </Group>
    );
  }
  return (
    <Group>
      <Path path={kalpak} color={CAP} />
      <Path path={kalpak} style="stroke" strokeWidth={1.6} color="#16110c" />
    </Group>
  );
}

function RectBand() {
  return <RoundedRect x={HX - 34} y={HY - 58} width={68} height={5} r={1} color={C.brass} />;
}

function Bust({ script, talk }: { script: CallerScript; talk: SharedValue<number> }) {
  const skin = SKIN[Math.floor(script.salt * SKIN.length) % SKIN.length]!;
  const coat = COAT[Math.floor(script.salt * 7) % COAT.length]!;
  const parts = useMemo(() => bustPaths(), []);
  const shut = useDerivedValue(() => 1 - talk.value);
  const woman = script.face === 'kadin';

  return (
    <Group>
      {woman && <Circle cx={HX} cy={HY - 6} r={64} color="#3d342c" />}
      {!woman && (
        <Group>
          <Circle cx={HX - 48} cy={HY + 4} r={8} color={skin} />
          <Circle cx={HX + 48} cy={HY + 4} r={8} color={skin} />
        </Group>
      )}
      <RoundedRect x={HX - 16} y={HY + 36} width={32} height={30} r={8} color={skin} />
      <Path path={parts.coat} color={coat} />
      <Path path={parts.shade} color="rgba(0,0,0,0.22)" />
      {woman && <Path path={parts.scarf} color="#342c26" />}
      <Path path={parts.collar} color={woman ? '#4a3c32' : '#efe2c4'} />
      <Group transform={[{ translateX: HX }, { translateY: HY }, { scaleX: 0.9 }, { scaleY: 1.08 }, { translateX: -HX }, { translateY: -HY }]}>
        <Circle cx={HX} cy={HY} r={46} color={skin} />
        <Circle cx={HX} cy={HY} r={46} style="stroke" strokeWidth={2} color="#24180f" />
      </Group>
      <Hat face={script.face} kalpak={parts.kalpak} />
      {woman && <Path path={parts.chin} color="#3d342c" />}
      <Line p1={vec(HX - 20, HY - 18)} p2={vec(HX - 6, HY - 20)} color="#24180f" strokeWidth={2.4} />
      <Line p1={vec(HX + 6, HY - 20)} p2={vec(HX + 20, HY - 18)} color="#24180f" strokeWidth={2.4} />
      <Circle cx={HX - 13} cy={HY - 4} r={3.4} color="#1a120c" />
      <Circle cx={HX + 13} cy={HY - 4} r={3.4} color="#1a120c" />
      <Line p1={vec(HX + 1, HY + 4)} p2={vec(HX - 2, HY + 12)} color="#5c4634" strokeWidth={1.8} />
      {script.moustache && <Path path={parts.moustache} style="stroke" strokeWidth={2.4} color="#24180f" strokeCap="round" />}
      <Group layer={<Paint opacity={shut} />}>
        <Line p1={vec(HX - 9, HY + 20)} p2={vec(HX + 9, HY + 21)} color="#24180f" strokeWidth={2} />
      </Group>
      <Group layer={<Paint opacity={talk} />}>
        <Line p1={vec(HX - 8, HY + 17)} p2={vec(HX + 8, HY + 17)} color="#24180f" strokeWidth={1.6} />
        <Line p1={vec(HX - 7, HY + 23)} p2={vec(HX + 7, HY + 23)} color="#24180f" strokeWidth={1.6} />
      </Group>
    </Group>
  );
}

export function Caller({
  script,
  x,
  y,
  scale,
  opacity,
  talk,
}: {
  script: CallerScript | null;
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
  talk: SharedValue<number>;
}) {
  const transform = useDerivedValue<Transforms3d>(() => [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }]);
  if (!script) return null;
  return (
    <Fade opacity={opacity} transform={transform} bounds={{ x: -30, y: -20, w: 280, h: 280 }}>
      <Bust script={script} talk={talk} />
    </Fade>
  );
}

/** The line they say, on a scrap of paper rather than a caption. */
export function CallerSpeech({
  line,
  where,
  tilt,
  opacity,
}: {
  line: string;
  where: 'counter' | 'hatch';
  tilt: number;
  opacity: SharedValue<number>;
}) {
  const place = SPEECH[where];
  const paper = useMemo(() => roughRect({ x: place.x, y: place.y, w: place.w, h: place.h }, `say-${line}`, 0.8, true), [place, line]);
  const turn = useMemo<Transforms3d>(() => {
    const cx = place.x + place.w / 2;
    const cy = place.y + place.h / 2;
    return [{ translateX: cx }, { translateY: cy }, { rotate: tilt }, { translateX: -cx }, { translateY: -cy }];
  }, [place, tilt]);
  return (
    <Fade opacity={opacity} transform={turn} bounds={{ x: place.x - 12, y: place.y - 12, w: place.w + 24, h: place.h + 24 }}>
      <Path path={paper} color={C.paper} />
      <Para text={line} x={place.x + 10} y={place.y + 6} width={place.w - 18} family="Caveat" size={place.size} color={C.ink} lineHeight={1.05} />
    </Fade>
  );
}
