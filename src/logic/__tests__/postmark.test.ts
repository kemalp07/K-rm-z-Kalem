import day01 from '../../../content/day01.json';
import { officeOf, postmarkOf } from '../../content/postmark';
import type { Day } from '../../content/types';
import { fromDays, parseRumi, stampText, toDays } from '../rumi';

const day = day01 as Day;
const letter = (id: string) => day.letters.find((l) => l.id === id)!;

describe('rumi dates', () => {
  it('reads a date at the end of a header, short year or long', () => {
    expect(parseRumi('Ordu-yı Hümayun, 2 Mayıs 331')).toEqual({ day: 2, month: 2, year: 1331 });
    expect(parseRumi('Pazar akşamı')).toBeNull();
  });
  it('counts across a month end', () => {
    expect(stampText(fromDays(toDays(parseRumi('29 Nisan 1331')!) + 3))).toBe('2 MAYIS 331');
  });
});

describe('postmarks', () => {
  it('stamps soldiers at the field post and others at their town', () => {
    expect(postmarkOf(letter('d1_mehmet'), day.calendar.rumi).office).toBe('SAHRA POSTASI');
    expect(postmarkOf(letter('d1_imzasiz'), day.calendar.rumi).office).toBe('DERSAADET');
    expect(officeOf('Sivas, Hafik kazası')).toBe('SİVAS');
  });
  it('dates them after writing and never after today', () => {
    for (const l of day.letters) {
      const pm = parseRumi(postmarkOf(l, day.calendar.rumi).date)!;
      expect(toDays(pm)).toBeLessThanOrEqual(toDays(parseRumi(day.calendar.rumi)!));
      const written = parseRumi(l.dateLine);
      if (written) expect(toDays(pm)).toBeGreaterThan(toDays(written));
    }
  });
});
