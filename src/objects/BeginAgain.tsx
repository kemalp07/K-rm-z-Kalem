import { useMemo } from 'react';
import { FontWeight, Group, Path, Shadow } from '@shopify/react-native-skia';
import { t } from '../content/strings';
import type { Rect } from '../logic/censor';
import { C } from '../scene/palette';
import { Para } from '../scene/Para';
import { roughRect } from '../scene/rough';

/** A small scrap in the window's corner, so a game can begin again from any moment. */
export const BEGIN_RECT: Rect = { x: 12, y: 8, w: 118, h: 30 };

export function BeginAgain() {
  const shape = useMemo(() => roughRect(BEGIN_RECT, 'begin-again', 0.9, true), []);
  return (
    <Group>
      <Path path={shape} color={C.paper}>
        <Shadow dx={1} dy={2} blur={3} color="rgba(0,0,0,0.5)" />
      </Path>
      <Para text={t('desk.restart')} x={BEGIN_RECT.x + 6} y={BEGIN_RECT.y + 6} width={BEGIN_RECT.w - 12} family="Cormorant" size={13} weight={FontWeight.SemiBold} color={C.ink} align="center" />
    </Group>
  );
}
