import { useMemo } from 'react';
import { FontWeight, Group, Line, Paragraph, Path, Shadow, vec } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { reasonLabel } from '../content/booklet';
import { getLetter } from '../content/loader';
import { t } from '../content/strings';
import type { Lesson } from '../logic/pulse';
import type { Day, Letter as LetterData } from '../content/types';
import type { DayState } from '../logic/dayFlow';
import { pickOutcome } from '../logic/outcomes';
import { flagsOf } from '../logic/dayFlow';
import { C, STAMP_INK } from '../scene/palette';
import { makeParagraph, useSceneFonts } from '../scene/fonts';
import { Para } from '../scene/Para';
import { roughRect } from '../scene/rough';
import { LAYOUT } from '../scene/world';
import { ArtSlot, hasArt } from '../art/ArtSlot';

/** End of day: the clerk's register, one entry per envelope, written as it happened. */
/** How many of the censored sentences were plain, innocent ones. */
function harmless(letter: LetterData, censored: string[]) {
  const all = [...letter.segments, ...(letter.variants ?? []).flatMap((v) => v.ops.flatMap((o) => ('segment' in o ? [o.segment] : [])))];
  return censored.filter((id) => all.find((s) => s.id === id)?.kind === 'normal').length;
}

export function Ledger({ state, day, slide, lesson }: { state: DayState; day: Day; slide: SharedValue<{ translateY: number }[]>; lesson?: Lesson | null }) {
  const r = LAYOUT.ledger;
  const page = useMemo(() => roughRect(r, 'ledger', 0.7), [r]);
  const flags = useMemo(() => flagsOf(state), [state]);
  const rows = useMemo(() => state.done.map((id) => getLetter(id)).filter((l) => l !== undefined), [state.done]);
  const top = r.y + 78;
  // Writing starts right of the red margin; the illustrated register has it further in.
  const M = hasArt('ledger') ? r.w * 0.163 : 44;
  const L = M + 12;
  const { provider } = useSceneFonts();

  // Each entry: who to whom, what the clerk did (and got wrong), what will come of it.
  // Lines are measured, and a full day is written smaller until it fits the page.
  const entries = useMemo(() => {
    const width = r.w - L - 28;
    const avail = r.h - 78 - 48;
    const texts = rows.map((letter) => {
      const p = state.letters[letter.id]!;
      const decision = p.decision!;
      const what = (target: string) => t(`target.${target as 'seal' | 'date' | 'postmark'}`);
      const extra = [
        p.censored.length ? t('ledger.censored', { n: p.censored.length }) : '',
        // Harmless sentences blacked out cost the family their words; the ledger says so.
        harmless(letter, p.censored) ? t('ledger.overCensored', { n: harmless(letter, p.censored) }) : '',
        ...(p.marked ?? []).map((m) => t('ledger.marked', { what: what(m) })),
        // A ring around something that was in order is written down too: the clerk learns.
        ...(p.wrongMarked ?? []).map((m) => t('ledger.wrongMark', { what: what(m) })),
        // The reason ticked on the slip; one the letter gives no ground for is called out.
        p.reason ? t(letter.reasons && !letter.reasons.includes(p.reason) ? 'ledger.wrongReason' : 'ledger.reason', { r: reasonLabel(p.reason).toLocaleLowerCase('tr') }) : '',
      ].filter(Boolean);
      return {
        id: letter.id,
        route: t('ledger.route', { from: letter.sender, to: letter.recipient }),
        act: [t(`ledger.${decision}`), ...extra].join(' · '),
        color: STAMP_INK[decision],
        outcome: pickOutcome(letter, flags),
      };
    });
    for (const k of [1, 0.92, 0.85, 0.78, 0.72]) {
      const gap = 10 * k;
      let y = top;
      const out = texts.map((e) => {
        const route = makeParagraph(provider, e.route, { family: 'Caveat', size: 17 * k, color: C.ink, weight: FontWeight.Medium, lineHeight: 0.95 }, width);
        const act = makeParagraph(provider, e.act, { family: 'Caveat', size: 15 * k, color: e.color, weight: FontWeight.Bold, lineHeight: 0.95 }, width - 8);
        const outcome = makeParagraph(provider, e.outcome, { family: 'Cormorant', size: 13.5 * k, color: '#4a3d30', italic: true, lineHeight: 0.95 }, width - 10);
        const at = y;
        y += route.getHeight() + act.getHeight() + outcome.getHeight() + gap;
        return { id: e.id, at, route, act, outcome, k };
      });
      if (y - top <= avail || k === 0.72) return out;
    }
    return [];
  }, [provider, rows, state.letters, flags, top, r, L]); // eslint-disable-line react-hooks/exhaustive-deps

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

      {entries.map((e, i) => {
        const y1 = e.at + e.route.getHeight();
        const y2 = y1 + e.act.getHeight();
        return (
          <Group key={e.id}>
            <Para text={`${i + 1}.`} x={r.x + M - 28} y={e.at} width={26} family="Caveat" size={17 * e.k} color={C.inkFaded} />
            <Paragraph paragraph={e.route} x={r.x + L} y={e.at} width={e.route.getMaxWidth()} />
            <Paragraph paragraph={e.act} x={r.x + L + 8} y={y1} width={e.act.getMaxWidth()} />
            <Paragraph paragraph={e.outcome} x={r.x + L + 10} y={y2} width={e.outcome.getMaxWidth()} />
          </Group>
        );
      })}

      {lesson && (
        <Para text={`${lesson.text}  ${t('ledger.lessonHint')}`} x={LAYOUT.lesson.x} y={LAYOUT.lesson.y} width={LAYOUT.lesson.w} family="Caveat" size={13} color={C.censor} />
      )}
      <Para text={t('ledger.close')} x={r.x + r.w - 206} y={r.y + r.h - 34} width={160} family="Caveat" size={15} color="rgba(60,45,30,0.6)" align="right" />
    </Group>
  );
}
