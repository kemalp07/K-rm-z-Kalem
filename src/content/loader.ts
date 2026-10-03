import day01 from '../../content/day01.json';
import threadsJson from '../../content/threads.json';
import deskJson from '../../content/desk.json';
import helpJson from '../../content/help.json';
import type { Day, Desk, HelpId, HelpSheet, Letter, Thread } from './types';
import { getPoolLetter, poolLetters } from './pool';
import { validateDay } from './validate';

// JSON imports are typed loosely by TS; the validator below is what keeps them honest.
const days: Record<number, Day> = { 1: day01 as Day };
export const threads = threadsJson as Thread[];
export const desk = deskJson as Desk;
const helpSheets = helpJson.sheets as HelpSheet[];

export function getHelp(id: HelpId): HelpSheet {
  const sheet = helpSheets.find((h) => h.id === id);
  if (!sheet) throw new Error(`content/help.json has no sheet "${id}"`);
  return sheet;
}

export const LAST_AUTHORED_DAY = 1;

export function getDay(n: number): Day | undefined {
  return days[n];
}

export function getLetter(id: string): Letter | undefined {
  for (const day of Object.values(days)) {
    const found = day.letters.find((l) => l.id === id);
    if (found) return found;
  }
  return getPoolLetter(id);
}

/** Side letters the day may draw from: id and the date each was written. */
export const sideLetterCandidates = poolLetters.map((l) => ({ id: l.id, date: String(l.meta?.date ?? '') }));

if (__DEV__) {
  for (const day of Object.values(days)) {
    const problems = validateDay(day, threads);
    if (problems.length) console.warn(`[content] day ${day.day}:\n  ${problems.join('\n  ')}`);
  }
}
