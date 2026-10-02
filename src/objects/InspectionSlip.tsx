import { useMemo } from 'react';
import { Group, Path, Shadow } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { C } from '../scene/palette';
import { Para } from '../scene/Para';
import { roughRect } from '../scene/rough';
import { WORLD } from '../scene/world';

export const SLIP_W = 190;

/** The clerk's pencilled note, slipped beside whatever the glass found. */
export function InspectionSlip({ note, x, y, opacity }: { note: string; x: number; y: number; opacity: SharedValue<number> }) {
  const left = Math.min(Math.max(8, x - SLIP_W - 30), WORLD.w - SLIP_W - 8);
  const top = Math.min(Math.max(8, y - 40), WORLD.h - 96);
  const shape = useMemo(() => roughRect({ x: left, y: top, w: SLIP_W, h: 86 }, `slip-${note.length}`, 0.9, true), [left, top, note.length]);
  return (
    <Group opacity={opacity} transform={[{ rotate: -0.03 }]} origin={{ x: left, y: top }}>
      <Path path={shape} color="#e9dfc9">
        <Shadow dx={-3} dy={4} blur={4} color="rgba(0,0,0,0.55)" />
      </Path>
      <Para text={note} x={left + 10} y={top + 8} width={SLIP_W - 20} family="Caveat" size={15} color={C.inkFaded} lineHeight={0.98} />
    </Group>
  );
}
