import { useMemo } from 'react';
import { Circle, FontWeight, Group, Path, Shadow } from '@shopify/react-native-skia';
import { ArtSlot, hasArt } from '../art/ArtSlot';
import type { Day } from '../content/types';
import { C } from '../scene/palette';
import { Para } from '../scene/Para';
import { roughRect, shakyLine } from '../scene/rough';
import { LAYOUT } from '../scene/world';

// The illustrated leaf has a deeper torn band and its binding holes lower down.
const DY = hasArt('calendar') ? 11 : 0;

/** Today's leaf, torn off the wall calendar and left on the desk. */
export function CalendarLeaf({ calendar }: { calendar: Day['calendar'] }) {
  const r = LAYOUT.calendar;
  const shape = useMemo(() => roughRect(r, 'calendar-leaf', 0.7, true), [r]);
  // "5 Mayıs 1331" → "5" big, "Mayıs 1331" beneath it.
  const [rumiDay = '', ...rest] = calendar.rumi.split(' ');
  const rumiRest = rest.join(' ');
  return (
    <Group transform={[{ rotate: -0.07 }]} origin={{ x: r.x + r.w / 2, y: r.y + r.h / 2 }}>
      <ArtSlot slot="calendar" rect={r} shadow>
        <Path path={shape} color="#e9dcc0">
          <Shadow dx={-3} dy={4} blur={4} color="rgba(0,0,0,0.55)" />
        </Path>
        {/* Binding holes left behind by the tear */}
        {[0.3, 0.7].map((t) => (
          <Circle key={t} cx={r.x + r.w * t} cy={r.y + 7} r={2.2} color="rgba(30,18,10,0.85)" />
        ))}
        <Path path={shakyLine(r.x + 8, r.y + 86, r.x + r.w - 8, r.y + 86, 'cal-rule', 0.3)} style="stroke" strokeWidth={0.6} color="rgba(60,30,20,0.4)" />
      </ArtSlot>
      <Para text={calendar.weekday} x={r.x} y={r.y + 12 + DY} width={r.w} family="Cormorant" size={12} color={C.ink} align="center" weight={FontWeight.SemiBold} />
      {/* An Ottoman office calendar leads with the Rumi date; the Frankish one is the small print. */}
      <Para text={rumiDay} x={r.x} y={r.y + 18 + DY * 0.8} width={r.w} family="Cormorant" size={42} color={C.censor} align="center" weight={FontWeight.Bold} />
      <Para text={rumiRest} x={r.x} y={r.y + 75 + DY * 0.5} width={r.w} family="Cormorant" size={11.5} color={C.ink} align="center" letterSpacing={0.6} weight={FontWeight.SemiBold} />
      <Para text={`${calendar.dayOfMonth} ${calendar.month} ${calendar.year}`} x={r.x} y={r.y + 93 + DY * 0.3} width={r.w} family="Cormorant" size={10} color={C.inkFaded} align="center" italic />
    </Group>
  );
}
