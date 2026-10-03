import { fromDays, parseRumi, stampText, toDays } from '../logic/rumi';
import type { Letter, Postmark } from './types';

const OFFICES: Record<string, string> = { İstanbul: 'DERSAADET' };

/** The post office of a place as written on an envelope ("Sivas, Hafik kazası" → "SİVAS"). */
export function officeOf(place: string): string {
  const town = place.split(',')[0]!.trim();
  return OFFICES[town] ?? town.toLocaleUpperCase('tr');
}

/**
 * The postmark a letter carries: the field post for soldiers, the town's office otherwise,
 * dated a day or two after it was written and never after today. A letter may set its own
 * (a forged one, say).
 */
export function postmarkOf(letter: Letter, todayRumi: string): Postmark {
  if (letter.postmark) return letter.postmark;
  const today = parseRumi(todayRumi);
  const written = parseRumi(letter.dateLine) ?? parseRumi(String(letter.meta?.date ?? ''));
  const gap = 1 + ([...letter.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 2);
  const t = today ? toDays(today) : 0;
  const days = written ? Math.min(toDays(written) + gap, t) : t - 2;
  return {
    office: letter.direction === 'cepheden' ? 'SAHRA POSTASI' : officeOf(letter.from),
    date: today ? stampText(fromDays(days)) : '',
  };
}
