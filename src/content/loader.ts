import day01 from '../../content/day01.json';
import day02 from '../../content/day02.json';
import day03 from '../../content/day03.json';
import threadsJson from '../../content/threads.json';
import deskJson from '../../content/desk.json';
import helpJson from '../../content/help.json';
import type { Day, Desk, HelpId, HelpSheet, Letter, Thread, Tool } from './types';
import { getPoolLetter, poolLetters } from './pool';
import { validateDay } from './validate';

// JSON imports are typed loosely by TS; the validator below is what keeps them honest.
const days: Record<number, Day> = { 1: day01 as Day, 2: day02 as Day, 3: day03 as Day };
export const threads = threadsJson as Thread[];
export const desk = deskJson as Desk;
const helpSheets = helpJson.sheets as HelpSheet[];

export function getHelp(id: HelpId): HelpSheet {
  const sheet = helpSheets.find((h) => h.id === id);
  if (!sheet) throw new Error(`content/help.json has no sheet "${id}"`);
  return sheet;
}

export const LAST_AUTHORED_DAY = Math.max(...Object.keys(days).map(Number));

/** Whether a tool has been issued by `day`. */
export const hasTool = (tool: Tool, day: number) => day >= desk.tools[tool];

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

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  for (const day of Object.values(days)) {
    const problems = validateDay(day, threads);
    if (problems.length) console.warn(`[content] day ${day.day}:\n  ${problems.join('\n  ')}`);
  }
}
