import { Circle, FontWeight, Group, LinearGradient, RoundedRect, Shadow, vec } from '@shopify/react-native-skia';
import { ArtSlot } from '../art/ArtSlot';
import type { Desk } from '../content/types';
import { C } from '../scene/palette';
import { Para } from '../scene/Para';
import { LAYOUT } from '../scene/world';

/** Engraved brass nameplate — the clerk's rank, and the only polished thing on the desk. */
export function BrassPlate({ rank }: { rank: Desk['rank'] }) {
  const r = LAYOUT.plate;
  return (
    <Group>
      <ArtSlot slot="brass_plate" rect={r} shadow>
        <RoundedRect x={r.x} y={r.y} width={r.w} height={r.h} r={3}>
          <LinearGradient start={vec(r.x, r.y)} end={vec(r.x + r.w * 0.6, r.y + r.h)} colors={[C.brassLight, C.brass, C.brassDark, C.brass]} positions={[0, 0.35, 0.7, 1]} />
          <Shadow dx={-2} dy={3} blur={2.5} color="rgba(0,0,0,0.6)" />
        </RoundedRect>
        <RoundedRect x={r.x + 3} y={r.y + 3} width={r.w - 6} height={r.h - 6} r={2} style="stroke" strokeWidth={0.8} color="rgba(60,40,10,0.55)" />
        {[r.x + 7, r.x + r.w - 7].map((cx) => (
          <Group key={cx}>
            <Circle cx={cx} cy={r.y + r.h / 2} r={2.6} color={C.brassDark} />
            <Circle cx={cx} cy={r.y + r.h / 2} r={2.6} style="stroke" strokeWidth={0.6} color="rgba(255,240,200,0.35)" />
          </Group>
        ))}
      </ArtSlot>
      {/* Engraving: dark fill with a lit lower lip, so the letters read as cut. */}
      <Para text={rank.name.toLocaleUpperCase('tr')} x={r.x + 16} y={r.y + r.h * 0.22 + 0.6} width={r.w - 32} family="Cormorant" size={rank.name.length > 14 ? 10.5 : 13} color="rgba(255,236,190,0.35)" align="center" weight={FontWeight.Bold} letterSpacing={rank.name.length > 14 ? 0.6 : 1.4} />
      <Para text={rank.name.toLocaleUpperCase('tr')} x={r.x + 16} y={r.y + r.h * 0.22} width={r.w - 32} family="Cormorant" size={rank.name.length > 14 ? 10.5 : 13} color="#3a2808" align="center" weight={FontWeight.Bold} letterSpacing={rank.name.length > 14 ? 0.6 : 1.4} />
      <Para text={rank.title} x={r.x} y={r.y + r.h * 0.55} width={r.w} family="Cormorant" size={10} color="#2e1f06" align="center" italic weight={FontWeight.SemiBold} letterSpacing={0.4} />
    </Group>
  );
}
