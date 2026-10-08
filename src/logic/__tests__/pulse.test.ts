import day01 from '../../../content/day01.json';
import type { Day, Letter } from '../../content/types';
import { closeLedger, flagsOf, startDay } from '../dayFlow';
import { emptyProgress } from '../flags';
import { decide, openEnvelope } from '../dayFlow';
import { dossierCount, lessonOf, morningAsides, pinsOf } from '../pulse';

const day = day01 as Day;
const letter = (id: string) => day.letters.find((l) => l.id === id)!;

test('the string remembers rings and a caught file', () => {
  const letters = {
    d1_imzasiz: { ...emptyProgress(), marked: ['seal'], decision: 'reported' as const, reason: 'sahte' },
    d1_mehmet: { ...emptyProgress(), wrongMarked: ['date'] },
  };
  const of = (id: string) => day.letters.find((l) => l.id === id);
  const pins = pinsOf(letters, of);
  expect(pins.map((p) => p.target)).toEqual(['seal', 'date']);
  expect(pins[1]!.wrong).toBe(true);
  expect(dossierCount(letters, of)).toBe(1);
  expect(dossierCount({ d1_imzasiz: { ...emptyProgress(), decision: 'delivered' } }, of)).toBe(0);
});

test('the morning has two voices and a growing file', () => {
  const events = ['d1:lesson', 'd1:docked'];
  const a = morningAsides(2, events, 1);
  expect(a.mudur.some((l) => l.includes('1'))).toBe(true);
  expect(a.mudur.some((l) => l.toLocaleLowerCase('tr').includes('ihtar'))).toBe(true);
  expect(a.family).toContain('dükkân');
  expect(morningAsides(2, ['d1:rewarded'], 0).family).toContain('övmüş');
  expect(morningAsides(2, ['d1:docked'], 0).family).toContain('kapkara');
  expect(morningAsides(1, [], 0).family).toBeNull();
});

test('a missed forgery points at the seal page', () => {
  const lesson = lessonOf([{ letter: letter('d1_imzasiz'), p: { ...emptyProgress(), decision: 'delivered' } }]);
  expect(lesson?.pageId).toBe('muhurler');
  expect(lesson?.text).toMatch(/mühür/i);
});

test('the first forgery is a lesson, the next one is a warning', () => {
  let s = openEnvelope(startDay(day), 'd1_imzasiz');
  s = decide(s, 'd1_imzasiz', 'delivered');
  s = closeLedger({ ...s, phase: 'ledger' }, (id) => day.letters.find((l) => l.id === id));
  expect(s.warnings).toBe(0);
  expect(s.phase).toBe('evening');
  expect(flagsOf(s).has('d1:lesson')).toBe(true);
  expect(flagsOf(s).has('d1:warned')).toBe(false);

  const again = closeLedger(
    { ...s, day: 2, phase: 'ledger', done: ['d1_imzasiz'], letters: { d1_imzasiz: { ...emptyProgress(), opened: true, decision: 'delivered' } } },
    (id) => ({ ...letter('d1_imzasiz'), id } as Letter),
  );
  expect(again.warnings).toBe(1);
  expect(flagsOf(again).has('d2:warned')).toBe(true);
  expect(flagsOf(again).has('d2:lesson')).toBe(false);
});
