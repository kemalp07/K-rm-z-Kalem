import { FontWeight, Rect, RoundedRect } from '@shopify/react-native-skia';
import { Fade } from '../scene/Fade';
import type { SharedValue } from 'react-native-reanimated';
import { t } from '../content/strings';
import type { Rect as R } from '../logic/censor';
import { Para } from '../scene/Para';
import { WORLD } from '../scene/world';

export const RESTART_RECT: R = { x: WORLD.w / 2 - 80, y: WORLD.h - 70, w: 160, h: 34 };
export const NEXT_RECT: R = { x: WORLD.w / 2 - 110, y: WORLD.h / 2 + 50, w: 220, h: 40 };

/** The lamp is out. Only the next day's number, and a way to begin again. */
/** `ready`: the next day is written; otherwise the story pauses here. */
export function ContinueCard({ nextDay, ready, opacity }: { nextDay: number; ready: boolean; opacity: SharedValue<number> }) {
  return (
    <Fade opacity={opacity}>
      <Rect x={-400} y={-400} width={WORLD.w + 800} height={WORLD.h + 800} color="#07080b" />
      <Para text={t('continue.day', { day: nextDay })} x={0} y={WORLD.h / 2 - 50} width={WORLD.w} family="Cormorant" size={40} color="#c9b88f" align="center" weight={FontWeight.SemiBold} letterSpacing={3} />
      {ready ? (
        <>
          <RoundedRect x={NEXT_RECT.x} y={NEXT_RECT.y} width={NEXT_RECT.w} height={NEXT_RECT.h} r={4} style="stroke" strokeWidth={1} color="#8a7b5e" />
          <Para text={t('continue.next')} x={NEXT_RECT.x} y={NEXT_RECT.y + 8} width={NEXT_RECT.w} family="Cormorant" size={20} color="#c9b88f" align="center" italic letterSpacing={1} />
        </>
      ) : (
        <Para text={t('continue.text')} x={0} y={WORLD.h / 2 + 2} width={WORLD.w} family="Cormorant" size={20} color="#8a7b5e" align="center" italic letterSpacing={1} />
      )}
      <Para text={t('continue.restart')} x={RESTART_RECT.x} y={RESTART_RECT.y + 6} width={RESTART_RECT.w} family="Caveat" size={17} color="#6b604c" align="center" />
    </Fade>
  );
}
