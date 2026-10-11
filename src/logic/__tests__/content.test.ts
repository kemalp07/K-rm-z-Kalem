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
  // The pile opens on a letter to read, then the seal the glass can catch.
  expect(day.letters[0]!.id).toBe('d1_mehmet');
  expect(day.letters[1]!.id).toBe('d1_imzasiz');
  expect(day.letters.filter((l) => l.kind === 'paket')).toHaveLength(1);
  const kinds = day.letters.flatMap((l) => l.segments.map((s) => s.kind));
  expect(kinds).toContain('sensitive');
  // Hidden ink needs the candle, which comes later (content/desk.json).
  expect(kinds).not.toContain('hiddenInk');
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

test('every tool has an instruction sheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const help = require('../../../content/help.json') as { sheets: { id: string; lines: string[] }[] };
  const ids = help.sheets.map((s) => s.id).sort();
  expect(ids).toEqual(['candle', 'kettle', 'magnifier', 'pen', 'rules', 'stamps']);
  for (const s of help.sheets) expect(s.lines.length).toBeGreaterThan(0);
});

describe('dates', () => {
  it('flags a letter dated after the day it arrives', () => {
    const d = day01 as Day;
    const bad: Day = { ...d, letters: [{ ...d.letters[0]!, dateLine: '12 Mayıs 331' }] };
    expect(validateDay(bad, threads as Thread[]).some((p) => p.includes('after today'))).toBe(true);
  });
});

describe('every authored day', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getDay, LAST_AUTHORED_DAY, hasTool } = require('../../content/loader') as typeof import('../../content/loader');
  const all = Array.from({ length: LAST_AUTHORED_DAY }, (_, i) => getDay(i + 1)!);

  it('is sound', () => {
    for (const d of all) expect(validateDay(d, threads as Thread[])).toEqual([]);
  });

  it('never asks for a tool before it is issued', () => {
    for (const d of all)
      for (const l of d.letters) {
        if (l.segments.some((s) => s.kind === 'hiddenInk')) expect(hasTool('candle', d.day)).toBe(true);
      }
  });

  it('keeps acrostics spelling what their meta says', () => {
    for (const d of all)
      for (const l of d.letters) {
        const a = l.meta?.acrostic as { segmentIds: string[]; word: string } | undefined;
        if (!a) continue;
        const word = a.segmentIds.map((id) => l.segments.find((s) => s.id === id)!.text[0]).join('').toLocaleUpperCase('tr');
        expect(word).toBe(a.word);
      }
  });

  it('only lists reasons the slip knows', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { booklet } = require('../../content/booklet') as typeof import('../../content/booklet');
    const known = new Set(booklet.reasons.map((r) => r.id));
    for (const d of all) for (const l of d.letters) for (const r of l.reasons ?? []) expect(known.has(r)).toBe(true);
  });
});
