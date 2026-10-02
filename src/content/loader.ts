import day01 from '../../content/day01.json';
import threadsJson from '../../content/threads.json';
import deskJson from '../../content/desk.json';
import type { Day, Desk, Letter, Thread } from './types';
import { validateDay } from './validate';

// JSON imports are typed loosely by TS; the validator below is what keeps them honest.
const days: Record<number, Day> = { 1: day01 as Day };
export const threads = threadsJson as Thread[];
export const desk = deskJson as Desk;

export const LAST_AUTHORED_DAY = 1;

export function getDay(n: number): Day | undefined {
  return days[n];
}

export function getLetter(id: string): Letter | undefined {
  for (const day of Object.values(days)) {
    const found = day.letters.find((l) => l.id === id);
    if (found) return found;
  }
  return undefined;
}

if (__DEV__) {
  for (const day of Object.values(days)) {
    const problems = validateDay(day, threads);
    if (problems.length) console.warn(`[content] day ${day.day}:\n  ${problems.join('\n  ')}`);
  }
}
