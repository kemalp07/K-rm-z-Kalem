import day01 from '../../../content/day01.json';
import type { Day } from '../../content/types';
import { openEnvelope, startDay, type DayState } from '../dayFlow';
import { guideStep } from '../guide';

const day = day01 as Day;
const of = (id: string) => day.letters.find((l) => l.id === id);

const ready = (s: DayState): DayState => ({ ...s, morningDone: true });

test('the first morning waits at the pile until a letter is open', () => {
  expect(guideStep(startDay(day), of)).toBeNull();
  expect(guideStep(ready(startDay(day)), of)).toBe('pile');
});

test('Mehmet is taught in order: the line, the glass, then the stamp', () => {
  let s = ready(openEnvelope(startDay(day), 'd1_mehmet'));
  expect(guideStep(s, of)).toBe('pen');
  s = { ...s, letters: { ...s.letters, d1_mehmet: { ...s.letters.d1_mehmet!, censored: ['s3'] } } };
  expect(guideStep(s, of)).toBe('glass');
  s = { ...s, letters: { ...s.letters, d1_mehmet: { ...s.letters.d1_mehmet!, wrongMarked: ['date'] } } };
  expect(guideStep(s, of)).toBe('stamp');
  s = { ...s, done: ['d1_mehmet'] };
  expect(guideStep(s, of)).toBeNull();
});

test('a letter with nothing to censor goes straight to the glass', () => {
  const s = ready(openEnvelope(startDay(day), 'd1_imzasiz'));
  expect(guideStep(s, of)).toBe('glass');
});

test('later days have no guide', () => {
  const s = ready({ ...startDay(day), day: 2 });
  expect(guideStep(s, of)).toBeNull();
});
