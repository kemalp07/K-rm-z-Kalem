import { useMemo } from 'react';
import { FontWeight, Group, Line, Path, Shadow, vec } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { getLetter } from '../content/loader';
import { t } from '../content/strings';
import type { Day } from '../content/types';
import type { DayState } from '../logic/dayFlow';
import { pickOutcome } from '../logic/outcomes';
import { flagsOf } from '../logic/dayFlow';
import { C, STAMP_INK } from '../scene/palette';
import { Para } from '../scene/Para';
import { roughRect } from '../scene/rough';
import { LAYOUT } from '../scene/world';
import { ArtSlot, hasArt } from '../art/ArtSlot';

/** End of day: the clerk's register, one entry per envelope, written as it happened. */
export function Ledger({ state, day, slide }: { state: DayState; day: Day; slide: SharedValue<{ translateY: number }[]> }) {
  const r = LAYOUT.ledger;
  const page = useMemo(() => roughRect(r, 'ledger', 0.7), [r]);
  const flags = useMemo(() => flagsOf(state), [state]);
  const rows = state.done.map((id) => getLetter(id)).filter((l) => l !== undefined);
  const rowH = 80;
  const top = r.y + 78;
  // Writing starts right of the red margin; the illustrated register has it further in.
  const M = hasArt('ledger') ? r.w * 0.163 : 44;
  const L = M + 12;

  return (
    <Group transform={slide}>
      <ArtSlot slot="ledger" rect={r} shadow>
        <Path path={page} color="#ebe1c8">
          <Shadow dx={-6} dy={10} blur={12} color="rgba(0,0,0,0.65)" />
        </Path>
        {/* Ruling and red margin, as in a bought register */}
        {Array.from({ length: 16 }, (_, i) => (
          <Line key={i} p1={vec(r.x + 10, r.y + 70 + i * 24)} p2={vec(r.x + r.w - 10, r.y + 70 + i * 24)} strokeWidth={0.6} color="rgba(70,90,120,0.2)" />
        ))}
        <Line p1={vec(r.x + 44, r.y + 8)} p2={vec(r.x + 44, r.y + r.h - 8)} strokeWidth={0.9} color="rgba(163,36,27,0.4)" />
      </ArtSlot>

      <Para text={t('ledger.title')} x={r.x + L} y={r.y + 18} width={260} family="Cormorant" size={24} color={C.ink} weight={FontWeight.Bold} letterSpacing={1} />
      <Para
        text={t('ledger.dayLine', { rumi: day.calendar.rumi, weekday: day.calendar.weekday })}
        x={r.x + r.w - 236}
        y={r.y + 26}
        width={210}
        family="Cormorant"
        size={14}
        color={C.inkFaded}
        italic
        align="right"
      />

      {rows.map((letter, i) => {
        const p = state.letters[letter.id]!;
        const y = top + i * rowH;
        const decision = p.decision!;
        const extra = p.censored.length ? ` · ${t('ledger.censored', { n: p.censored.length })}` : '';
        return (
          <Group key={letter.id}>
            <Para text={`${i + 1}.`} x={r.x + M - 28} y={y} width={26} family="Caveat" size={17} color={C.inkFaded} />
            {/* Who wrote to whom, then what the clerk did, then what will come of it. */}
            <Para text={t('ledger.route', { from: letter.sender, to: letter.recipient })} x={r.x + L} y={y} width={r.w - L - 24} family="Caveat" size={17} color={C.ink} weight={FontWeight.Medium} />
            <Para text={`${t(`ledger.${decision}`)}${extra}`} x={r.x + L + 8} y={y + 21} width={r.w - L - 32} family="Caveat" size={15} color={STAMP_INK[decision]} weight={FontWeight.Bold} />
            <Para text={pickOutcome(letter, flags)} x={r.x + L + 8} y={y + 40} width={r.w - L - 34} family="Cormorant" size={13.5} color="#4a3d30" italic lineHeight={0.95} />
          </Group>
        );
      })}

      <Para text={t('ledger.close')} x={r.x + r.w - 206} y={r.y + r.h - 34} width={160} family="Caveat" size={15} color="rgba(60,45,30,0.6)" align="right" />
    </Group>
  );
}
