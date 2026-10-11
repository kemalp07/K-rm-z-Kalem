import { Fade } from '../scene/Fade';
import type { SharedValue } from 'react-native-reanimated';
import { t } from '../content/strings';
import type { Rect as R } from '../logic/censor';
import { DayPlate } from './DayPlate';
import { Para } from '../scene/Para';
import { WORLD } from '../scene/world';

export const RESTART_RECT: R = { x: WORLD.w / 2 - 80, y: WORLD.h - 70, w: 160, h: 34 };

/** The night between days: the next day's plate, and a way to begin again. */
export function ContinueCard({
  nextDay,
  ready,
  opacity,
  rumi,
  weekday,
  post,
  office,
  warnings,
}: {
  nextDay: number;
  ready: boolean;
  opacity: SharedValue<number>;
  rumi: string;
  weekday: string;
  post: string;
  office: string;
  warnings: number;
}) {
  return (
    <>
      <DayPlate n={nextDay} rumi={rumi} weekday={weekday} post={post} office={office} warnings={warnings} opacity={opacity} paused={!ready} />
      <Fade opacity={opacity}>
        <Para text={t('continue.restart')} x={RESTART_RECT.x} y={RESTART_RECT.y + 6} width={RESTART_RECT.w} family="Caveat" size={17} color="#6b604c" align="center" />
      </Fade>
    </>
  );
}
