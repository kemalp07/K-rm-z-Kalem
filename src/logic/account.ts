import type { Economy, Letter, PenaltyKind } from '../content/types';
import { matches } from './conditions';
import type { LetterProgress } from './flags';

export interface AccountLine {
  kind: PenaltyKind | 'wage';
  amount: number;
  /** Whose letter it was about. */
  who?: string;
  warning?: boolean;
}

/** The Şube's reckoning of one day: pay, what was docked and why, warnings given. */
export interface Account {
  lines: AccountLine[];
  total: number;
  warnings: number;
}

const SPY_THREAD = 'imzasiz_halil';

/** What the clerk got wrong (or right) on one decided letter, by the Şube's rules. */
export function judge(letter: Letter, p: LetterProgress): PenaltyKind[] {
  const d = p.decision;
  if (!d || d === 'held') return [];
  const out: PenaltyKind[] = [];
  const passed = d === 'delivered';
  if (passed && letter.segments.some((s) => s.kind === 'sensitive' && !p.censored.includes(s.id))) out.push('sensitiveMissed');
  if (passed && letter.segments.some((s) => s.kind === 'hiddenInk' && !p.revealed.includes(s.id))) out.push('inkMissed');
  // Writing under the stamp counts as hidden too, once the kettle is on the desk to find it.
  if (passed && letter.underStamp && !p.revealed.includes('stamp')) out.push('inkMissed');
  if (passed && letter.inspectables?.some((i) => i.anomaly)) out.push('forgeryMissed');
  for (let i = 0; i < (p.wrongMarked ?? []).length; i++) out.push('wrongMark');
  if (p.reason && letter.reasons && !letter.reasons.includes(p.reason)) out.push('wrongReason');
  if (!passed && letter.reasons && letter.reasons.length === 0) out.push('innocentStopped');
  if (d === 'reported' && letter.threadId === SPY_THREAD && (!letter.reasons || (p.reason && letter.reasons.includes(p.reason)))) out.push('spyCaught');
  return out;
}

export function reckon(decided: { letter: Letter; p: LetterProgress }[], eco: Economy, wage = eco.wage): Account {
  const lines: AccountLine[] = [{ kind: 'wage', amount: wage }];
  for (const { letter, p } of decided) {
    for (const kind of judge(letter, p)) {
      const rule = eco.penalties[kind];
      lines.push({ kind, amount: rule.amount, who: letter.sender, warning: rule.warning });
    }
  }
  return { lines, total: lines.reduce((a, l) => a + l.amount, 0), warnings: lines.filter((l) => l.warning).length };
}

/** Costs due this evening: the daily ones, and rent on its days. */
export const expensesFor = (day: number, eco: Economy, flags: ReadonlySet<string> = new Set()) =>
  eco.expenses.filter((e) => (!e.days || e.days.includes(day)) && matches(e.when, flags));

/** Tools on sale today that the clerk has not bought yet. */
export const shopFor = (day: number, owned: readonly string[], eco: Economy) => eco.shop.filter((s) => s.day <= day && !owned.includes(s.id));
