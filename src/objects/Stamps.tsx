import { useMemo } from 'react';
import { BlurMask, Circle, Group, Path, RadialGradient, Shadow, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { t } from '../content/strings';
import type { Decision } from '../content/types';
import type { Rect } from '../logic/censor';
import { STAMP_INK } from '../scene/palette';
import { roughRect } from '../scene/rough';
import { LAYOUT } from '../scene/world';
import { StampMark } from './StampMark';
import { Fade } from '../scene/Fade';

export const DECISIONS: Decision[] = ['delivered', 'held', 'stopped', 'reported'];
const TILT: Record<Decision, number> = { delivered: -0.05, held: 0.035, stopped: -0.025, reported: 0.06 };

/** The four sample impressions under the letter, each on its own scrap of card. */
export function stampSlots(): { d: Decision; rect: Rect }[] {
  const { x, y, w, h } = LAYOUT.stamps;
  const gap = 8;
  const sw = (w - gap * 3) / 4;
  return DECISIONS.map((d, i) => ({ d, rect: { x: x + i * (sw + gap), y: y + 6, w: sw, h: h - 12 } }));
}

interface Props {
  enabled: boolean;
  pressing: Decision | null;
  /** 0..1 while the stamp is held down. */
  progress: SharedValue<number>;
}

export function Stamps({ enabled, pressing, progress }: Props) {
  const slots = useMemo(stampSlots, []);
  const cards = useMemo(() => slots.map((s) => roughRect({ x: s.rect.x - 3, y: s.rect.y - 3, w: s.rect.w + 6, h: s.rect.h + 6 }, `card-${s.d}`, 0.9)), [slots]);
  return (
    <Fade opacity={enabled ? 1 : 0.4}>
      {slots.map((s, i) => (
        <Group key={s.d} transform={[{ rotate: TILT[s.d] }]} origin={{ x: s.rect.x + s.rect.w / 2, y: s.rect.y + s.rect.h / 2 }}>
          <Path path={cards[i]!} color="#e2d5b8">
            <Shadow dx={-2} dy={3} blur={3} color="rgba(0,0,0,0.5)" />
          </Path>
          <StampMark x={s.rect.x + 4} y={s.rect.y + 6} w={s.rect.w - 8} h={s.rect.h - 12} label={t(`decision.${s.d}`)} color={STAMP_INK[s.d]} rotate={0} seed={`sample-${s.d}`} size={s.d === 'reported' ? 10.5 : 13.5} opacity={0.8} />
        </Group>
      ))}
      {pressing && <StampKnob rect={slots.find((s) => s.d === pressing)!.rect} progress={progress} />}
    </Fade>
  );
}

/** The wooden stamp seen from above, coming down as the finger holds. */
function StampKnob({ rect, progress }: { rect: Rect; progress: SharedValue<number> }) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const transform = useDerivedValue(() => {
    const s = 1.35 - progress.value * 0.35;
    return [{ translateX: cx }, { translateY: cy }, { scale: s }];
  });
  const shadow = useDerivedValue(() => [{ translateX: -4 - (1 - progress.value) * 14 }, { translateY: 5 + (1 - progress.value) * 16 }]);
  const shadowOpacity = useDerivedValue(() => 0.3 + progress.value * 0.4);
  return (
    <Group>
      <Group transform={shadow} opacity={shadowOpacity}>
        <Circle cx={cx} cy={cy} r={22} color="#000">
          <BlurMask blur={8} style="normal" />
        </Circle>
      </Group>
      <Group transform={transform}>
        <Circle cx={0} cy={0} r={22}>
          <RadialGradient c={vec(-6, -8)} r={30} colors={['#7a4e2c', '#4a2c15', '#26160a']} />
        </Circle>
        <Circle cx={0} cy={0} r={14} style="stroke" strokeWidth={1} color="rgba(255,220,170,0.15)" />
        <Circle cx={-6} cy={-7} r={5} color="rgba(255,230,190,0.12)">
          <BlurMask blur={3} style="normal" />
        </Circle>
      </Group>
    </Group>
  );
}
