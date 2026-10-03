import { useMemo } from 'react';
import { FontWeight, Group, Path, Rect, Shadow, Skia, type Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';
import { booklet } from '../content/booklet';
import { t } from '../content/strings';
import type { Decision, Reason } from '../content/types';
import type { Rect as Box } from '../logic/censor';
import { Fade } from '../scene/Fade';
import { C, STAMP_INK } from '../scene/palette';
import { Para } from '../scene/Para';
import { roughRect } from '../scene/rough';
import { LAYOUT } from '../scene/world';

const ROW_TOP = 74;
const ROW_H = 25;

/** Where each reason's line sits on the slip; shared by drawing and hit testing. */
export function reasonRows(reasons: Reason[]): { r: Reason; rect: Box }[] {
  const s = LAYOUT.reasonSlip;
  return reasons.map((r, i) => ({ r, rect: { x: s.x + 12, y: s.y + ROW_TOP + i * ROW_H, w: s.w - 24, h: ROW_H } }));
}

function tick(x: number, y: number) {
  return Skia.PathBuilder.Make().moveTo(x + 2, y + 8).quadTo(x + 5, y + 11, x + 7, y + 15).quadTo(x + 11, y + 4, x + 18, y - 2).build();
}

/** A printed slip: the decision, then the reasons with a box each; the clerk ticks one. */
export function ReasonSlip({ decision, reasons, chosen, opacity }: { decision: Decision; reasons: Reason[]; chosen: string | null; opacity: SharedValue<number> }) {
  // As tall as its reasons need.
  const s = { ...LAYOUT.reasonSlip, h: ROW_TOP + reasons.length * ROW_H + 16 };
  const shape = useMemo(() => roughRect(s, 'reason-slip', 0.7), [s.h]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => reasonRows(reasons), [reasons]);
  const rise = useDerivedValue<Transforms3d>(() => [{ translateY: (1 - opacity.value) * 12 }]);
  return (
    <Fade opacity={opacity} transform={rise}>
      <Group transform={[{ rotate: 0.03 }]} origin={{ x: s.x + s.w / 2, y: s.y + s.h / 2 }}>
        <Path path={shape} color="#e8dcbf">
          <Shadow dx={-3} dy={5} blur={6} color="rgba(0,0,0,0.6)" />
        </Path>
        <Para text={booklet.reasonSlip.title} x={s.x} y={s.y + 12} width={s.w} family="Cormorant" size={12} color={C.ink} weight={FontWeight.Bold} letterSpacing={0.8} align="center" />
        <Para text={t(`decision.${decision}`)} x={s.x} y={s.y + 32} width={s.w} family="Cormorant" size={14} color={STAMP_INK[decision]} weight={FontWeight.Bold} letterSpacing={2} align="center" />
        <Para text={booklet.reasonSlip.hint} x={s.x} y={s.y + 52} width={s.w} family="Caveat" size={13} color={C.inkFaded} align="center" />
        {rows.map(({ r, rect }) => (
          <Group key={r.id}>
            <Rect x={rect.x + 2} y={rect.y + 5} width={13} height={13} style="stroke" strokeWidth={1} color="rgba(43,33,24,0.7)" />
            <Para text={r.label} x={rect.x + 22} y={rect.y + 3} width={rect.w - 22} family="Cormorant" size={12.5} color={C.ink} weight={FontWeight.SemiBold} />
            {chosen === r.id && <Path path={tick(rect.x + 1, rect.y + 4)} style="stroke" strokeWidth={2.4} strokeCap="round" color={C.censor} />}
          </Group>
        ))}
      </Group>
    </Fade>
  );
}
