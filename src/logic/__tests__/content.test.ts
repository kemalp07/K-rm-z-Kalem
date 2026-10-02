import day01 from '../../../content/day01.json';
import threads from '../../../content/threads.json';
import tr from '../../../content/strings/tr.json';
import type { Day, Thread } from '../../content/types';
import { validateDay } from '../../content/validate';

const day = day01 as Day;

test('day 1 content passes validation', () => {
  expect(validateDay(day, threads as Thread[])).toEqual([]);
});

test('day 1 holds the five envelopes the brief asks for', () => {
  expect(day.letters).toHaveLength(5);
  expect(day.letters.filter((l) => l.kind === 'paket')).toHaveLength(1);
  const kinds = day.letters.flatMap((l) => l.segments.map((s) => s.kind));
  expect(kinds).toContain('sensitive');
  expect(kinds).toContain('hiddenInk');
  expect(day.letters.some((l) => l.inspectables?.some((i) => i.anomaly))).toBe(true);
});

test("Saadet's acrostic spells what meta says", () => {
  const saadet = day.letters.find((l) => l.id === 'd1_saadet')!;
  const meta = saadet.meta?.acrostic as { segmentIds: string[]; word: string };
  const word = meta.segmentIds
    .map((id) => saadet.segments.find((s) => s.id === id)!.text[0])
    .join('')
    .toLocaleUpperCase('tr');
  expect(word).toBe(meta.word);
});

test('validator catches broken variants and missing threads', () => {
  const broken: Day = JSON.parse(JSON.stringify(day));
  broken.letters[0]!.threadId = 'nope';
  broken.letters[1]!.variants = [{ id: 'v', when: {}, ops: [{ op: 'remove', target: 'ghost' }] }];
  const problems = validateDay(broken, threads as Thread[]);
  expect(problems.some((p) => p.includes('unknown thread'))).toBe(true);
  expect(problems.some((p) => p.includes('missing ghost'))).toBe(true);
});

test('every decision has a UI label', () => {
  for (const d of ['delivered', 'held', 'stopped', 'reported']) {
    expect(tr).toHaveProperty([`decision.${d}`]);
    expect(tr).toHaveProperty([`ledger.${d}`]);
  }
});
