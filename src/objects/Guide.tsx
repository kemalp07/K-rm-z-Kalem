import { useEffect } from 'react';
import { Circle, Group, RoundedRect } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { t, type StringKey } from '../content/strings';
import type { GuideStep } from '../logic/guide';
import { C } from '../scene/palette';
import { Para } from '../scene/Para';
import { WORLD } from '../scene/world';

/** One sentence along the foot of the desk, clear of the stamp plates. */
export function GuideNote({ step, mehmet }: { step: GuideStep; mehmet: boolean }) {
  const key: StringKey = step === 'pen' && mehmet ? 'guide.pen.mehmet' : (`guide.${step}` as StringKey);
  const text = t(key);
  const r = { x: 188, y: 530, w: WORLD.w - 376, h: 26 };
  return (
    <Group>
      <RoundedRect x={r.x} y={r.y} width={r.w} height={r.h} r={4} color="#efe2c4" />
      <Para text={text} x={r.x + 8} y={r.y + 2} width={r.w - 16} family="Caveat" size={16} color={C.ink} align="center" />
    </Group>
  );
}

/** A slow red ring on the thing the sentence is about. */
export function GuideMark({ x, y, r = 26 }: { x: number; y: number; r?: number }) {
  const opacity = useSharedValue(0.35);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 680 }), withTiming(0.28, { duration: 680 })), -1, false);
  }, [opacity]);
  return (
    <Group opacity={opacity}>
      <Circle cx={x} cy={y} r={r} style="stroke" strokeWidth={2.2} color={C.censor} />
    </Group>
  );
}
