import type { Day, Decision } from '../content/types';
import { collectFlags, emptyProgress, type LetterProgress } from './flags';

export type Phase = 'desk' | 'dusk' | 'ledger' | 'continued';

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
}

export function startDay(day: Day, previous?: DayState): DayState {
  return {
    day: day.day,
    phase: 'desk',
    stack: day.letters.map((l) => l.id),
    done: [],
    // Earlier days' letters stay in the record; their flags shape later content.
    letters: { ...(previous?.letters ?? {}) },
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

type ListKey = 'censored' | 'revealed' | 'inspected';

export function addMark(s: DayState, id: string, key: ListKey, value: string): DayState {
  const p = s.letters[id];
  if (!p || p.decision || p[key].includes(value)) return s;
  return { ...s, letters: { ...s.letters, [id]: { ...p, [key]: [...p[key], value] } } };
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
  const next: Record<Phase, Phase> = { desk: 'desk', dusk: 'ledger', ledger: 'continued', continued: 'continued' };
  return { ...s, phase: next[s.phase] };
}

export function flagsOf(s: DayState): Set<string> {
  return collectFlags(s.letters);
}
