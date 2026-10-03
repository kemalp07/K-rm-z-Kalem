import economyJson from '../../content/economy.json';
import type { Day, Decision, Economy, Letter } from '../content/types';
import { expensesFor, reckon, shopFor, type Account } from './account';
import { collectFlags, emptyProgress, type LetterProgress } from './flags';

export type Phase = 'desk' | 'dusk' | 'ledger' | 'evening' | 'continued' | 'dismissed';

export const economy = economyJson as Economy;

export interface DayState {
  day: number;
  phase: Phase;
  /** Envelopes still in the stack, top first. */
  stack: string[];
  /** Letter currently lying open on the desk. */
  open?: string;
  /** Decided letters in the order they were stamped. */
  done: string[];
  letters: Record<string, LetterProgress>;
  /** Kuruş in the clerk's purse. Absent in saves from before money: the starting sum. */
  purse?: number;
  /** Warnings from the Şube; enough of them and the clerk is dismissed. */
  warnings?: number;
  /** Better tools bought at the market (economy.json `shop` ids). */
  owned?: string[];
  /** Things that happened off the letters: "d2:unpaid:gaz", "d3:paid:kira"… They are flags too. */
  events?: string[];
  /** The morning's papers have been read and put away. */
  morningDone?: boolean;
  /** Today's reckoning, once the ledger is closed. */
  account?: Account;
}

export const purseOf = (s: DayState) => s.purse ?? economy.start;

/** `stack` overrides the order (top first), e.g. with side letters mixed in. */
export function startDay(day: Day, previous?: DayState, stack?: string[]): DayState {
  // Earlier days' letters stay in the record; their flags shape later content.
  const letters = { ...(previous?.letters ?? {}) };
  // What was held comes out of the drawer first thing, to be decided again.
  const held = (previous?.done ?? []).filter((id) => letters[id]?.decision === 'held');
  for (const id of held) letters[id] = { ...letters[id]!, decision: undefined, wasHeld: true };
  return {
    day: day.day,
    phase: 'desk',
    stack: [...held, ...(stack ?? day.letters.map((l) => l.id))],
    done: [],
    letters,
    purse: previous ? purseOf(previous) : economy.start,
    warnings: previous?.warnings ?? 0,
    owned: previous?.owned ?? [],
    events: previous?.events ?? [],
    morningDone: false,
  };
}

export function openEnvelope(s: DayState, id: string): DayState {
  if (s.open || !s.stack.includes(id)) return s;
  const p = s.letters[id] ?? emptyProgress();
  return {
    ...s,
    open: id,
    stack: s.stack.filter((x) => x !== id),
    letters: { ...s.letters, [id]: { ...p, opened: true } },
  };
}

type ListKey = 'censored' | 'revealed' | 'inspected' | 'marked' | 'wrongMarked';

export function addMark(s: DayState, id: string, key: ListKey, value: string): DayState {
  const p = s.letters[id];
  // Saves from before marking existed have no marked/wrongMarked lists.
  const list = p?.[key] ?? [];
  if (!p || p.decision || list.includes(value)) return s;
  return { ...s, letters: { ...s.letters, [id]: { ...p, [key]: [...list, value] } } };
}

/** The eraser: the letter's red-pencil censoring goes, what was found (ink, anomalies) stays found. */
export function clearCensor(s: DayState, id: string): DayState {
  const p = s.letters[id];
  if (!p || p.decision || p.censored.length === 0) return s;
  return { ...s, letters: { ...s.letters, [id]: { ...p, censored: [] } } };
}

/** The reason slip, ticked after a DURDUR or İSTİHBARAT stamp and before the letter leaves. */
export function setReason(s: DayState, id: string, reason: string): DayState {
  const p = s.letters[id];
  if (!p || p.decision) return s;
  return { ...s, letters: { ...s.letters, [id]: { ...p, reason } } };
}

export function decide(s: DayState, id: string, decision: Decision): DayState {
  const p = s.letters[id];
  if (s.open !== id || !p || p.decision) return s;
  const done = [...s.done, id];
  const finished = s.stack.length === 0;
  return {
    ...s,
    open: undefined,
    done,
    phase: finished ? 'dusk' : s.phase,
    letters: { ...s.letters, [id]: { ...p, decision } },
  };
}

export function advancePhase(s: DayState): DayState {
  const next: Record<Phase, Phase> = { desk: 'desk', dusk: 'ledger', ledger: 'ledger', evening: 'evening', continued: 'continued', dismissed: 'dismissed' };
  return { ...s, phase: next[s.phase] };
}

/** The ledger is closed: the day is reckoned, paid into the purse, and warnings counted. */
export function closeLedger(s: DayState, letterOf: (id: string) => Letter | undefined): DayState {
  if (s.phase !== 'ledger') return s;
  const decided = s.done.flatMap((id) => {
    const letter = letterOf(id);
    const p = s.letters[id];
    return letter && p ? [{ letter, p }] : [];
  });
  const account = reckon(decided, economy);
  const warnings = (s.warnings ?? 0) + account.warnings;
  // How the day went, for the director's note next morning.
  const docked = account.lines.some((l) => l.amount < 0);
  const rewarded = account.lines.some((l) => l.kind === 'spyCaught');
  const verdict = [account.warnings ? 'warned' : '', rewarded ? 'rewarded' : '', docked ? 'docked' : '', !docked ? 'clean' : ''].filter(Boolean);
  return {
    ...s,
    account,
    events: [...(s.events ?? []), ...verdict.map((v) => `d${s.day}:${v}`)],
    purse: purseOf(s) + account.total,
    warnings,
    phase: warnings >= economy.warningsToDismissal ? 'dismissed' : 'evening',
  };
}

/** What is due this evening and what is for sale. */
export function eveningBill(s: DayState) {
  return { expenses: expensesFor(s.day, economy, flagsOf(s)), shop: shopFor(s.day, s.owned ?? [], economy) };
}

/**
 * The evening's choices: `paid` holds expense and shop ids. Unpaid expenses are remembered
 * ("d3:unpaid:gaz") and shape the next days; refused if the purse cannot cover them.
 */
export function finishEvening(s: DayState, paid: readonly string[]): DayState {
  if (s.phase !== 'evening') return s;
  const { expenses, shop } = eveningBill(s);
  const cost = [...expenses, ...shop].filter((x) => paid.includes(x.id)).reduce((a, x) => a + x.cost, 0);
  if (cost > purseOf(s)) return s;
  const events = [...(s.events ?? []), ...expenses.map((e) => `d${s.day}:${paid.includes(e.id) ? 'paid' : 'unpaid'}:${e.id}`)];
  const bought = shop.filter((x) => paid.includes(x.id)).map((x) => x.id);
  return { ...s, purse: purseOf(s) - cost, events, owned: [...(s.owned ?? []), ...bought], phase: 'continued' };
}

export const readMorning = (s: DayState): DayState => ({ ...s, morningDone: true });

export function flagsOf(s: DayState): Set<string> {
  const flags = collectFlags(s.letters);
  for (const e of s.events ?? []) flags.add(e);
  return flags;
}
