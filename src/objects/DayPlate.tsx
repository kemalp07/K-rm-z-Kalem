import { useEffect } from 'react';
import { FontWeight, Group, Rect } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import { t } from '../content/strings';
import { Fade } from '../scene/Fade';
import { SLAM } from '../scene/motion';
import { Para } from '../scene/Para';
import { WORLD } from '../scene/world';
import { playSfx } from '../sfx/sfx';

/**
 * The day's own plate, the way a booth opens: black, then the number stamps down,
 * then the date and the clerk's post. Not a button on the desk.
 */
export function DayPlate({
  n,
  rumi,
  weekday,
  post,
  office,
  warnings = 0,
  opacity,
  paused = false,
}: {
  n: number;
  rumi: string;
  weekday: string;
  post: string;
  office: string;
  warnings?: number;
  opacity: SharedValue<number>;
  /** The story has no next day. The plate stays dark. */
  paused?: boolean;
}) {
  const hit = useSharedValue(0);
  useEffect(() => {
    if (paused) return;
    hit.value = 0;
    hit.value = withDelay(160, withTiming(1, { duration: 210, easing: SLAM }));
    const id = setTimeout(() => playSfx('stamp', 0.8), 170);
    return () => clearTimeout(id);
  }, [n, paused, hit]);

  const numTransform = useDerivedValue(() => {
    const s = 1.42 - 0.42 * hit.value;
    const cx = WORLD.w / 2;
    const cy = 214;
    return [{ translateX: cx }, { translateY: cy }, { scale: s }, { translateX: -cx }, { translateY: -cy }];
  });
  const rest = useDerivedValue(() => opacity.value * Math.min(1, Math.max(0, (hit.value - 0.62) / 0.38)));
  const ruleW = useDerivedValue(() => 168 * Math.min(1, Math.max(0, (hit.value - 0.55) / 0.45)));
  const ruleX = useDerivedValue(() => WORLD.w / 2 - 168 * Math.min(1, Math.max(0, (hit.value - 0.55) / 0.45)));

  return (
    <>
      <Fade opacity={opacity}>
        <Rect x={-400} y={-400} width={WORLD.w + 800} height={WORLD.h + 800} color="#07080c" />
        {paused ? (
          <Para text={t('continue.text')} x={0} y={WORLD.h / 2 - 16} width={WORLD.w} family="Cormorant" size={22} color="#8a7b5e" align="center" italic letterSpacing={2} />
        ) : (
          <Group transform={numTransform}>
            <Para text={t('plate.day', { n })} x={0} y={178} width={WORLD.w} family="Cormorant" size={58} color="#efe6d4" align="center" weight={FontWeight.Bold} letterSpacing={8} />
          </Group>
        )}
      </Fade>
      {!paused && (
        <Fade opacity={rest}>
          <Para text={rumi} x={0} y={268} width={WORLD.w} family="Cormorant" size={22} color="#c4b496" align="center" letterSpacing={1.5} />
          <Para text={weekday} x={0} y={298} width={WORLD.w} family="Cormorant" size={15} color="#8d7f68" align="center" italic letterSpacing={3} />
          <Rect x={ruleX} y={336} width={ruleW} height={1} color="#6b5c48" />
          <Para text={post.toLocaleUpperCase('tr')} x={0} y={352} width={WORLD.w} family="Cormorant" size={15} color="#d9cbb0" align="center" weight={FontWeight.SemiBold} letterSpacing={3} />
          <Para text={office} x={0} y={376} width={WORLD.w} family="Cormorant" size={13} color="#7d7160" align="center" italic />
          {warnings > 0 && (
            <Para text={t('plate.warn', { n: warnings })} x={0} y={408} width={WORLD.w} family="Cormorant" size={13} color="#8d3a32" align="center" letterSpacing={1} />
          )}
        </Fade>
      )}
    </>
  );
}
