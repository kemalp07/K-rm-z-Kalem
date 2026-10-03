import day01 from '../../../content/day01.json';
import type { Day, Letter } from '../../content/types';
import { matches } from '../conditions';
import { resolveSegments } from '../variants';
import { pickOutcome } from '../outcomes';
import { advancePhase, addMark, clearCensor, decide, flagsOf, openEnvelope, setReason, startDay } from '../dayFlow';
import { flagsForLetter, emptyProgress } from '../flags';

const day = day01 as Day;
const letter = (id: string) => day.letters.find((l) => l.id === id)!;

describe('conditions', () => {
  const flags = new Set(['a', 'b']);
  test('all / any / none', () => {
    expect(matches({ all: ['a', 'b'] }, flags)).toBe(true);
    expect(matches({ all: ['a', 'c'] }, flags)).toBe(false);
    expect(matches({ any: ['c', 'b'] }, flags)).toBe(true);
    expect(matches({ any: ['c'] }, flags)).toBe(false);
    expect(matches({ none: ['c'] }, flags)).toBe(true);
    expect(matches({ all: ['a'], none: ['b'] }, flags)).toBe(false);
    expect(matches(undefined, flags)).toBe(true);
  });
});

describe('variants', () => {
  // A day-2 style reply from the mother, reacting to a censored letter.
  const reply: Letter = {
    ...letter('d1_hatice'),
    id: 'd2_hatice',
    segments: [
      { id: 's1', kind: 'normal', text: 'Mektubunu aldım.' },
      { id: 's2', kind: 'normal', text: 'Ayşe seni soruyor.' },
    ],
    variants: [
      {
        id: 'short',
        when: { all: ['d1_mehmet:delivered', 'd1_mehmet:censored'] },
        ops: [{ op: 'insertAfter', target: 's1', segment: { id: 'v1', kind: 'normal', text: 'Neden bu kadar kısa yazdın oğlum?' } }],
      },
      {
        id: 'silence',
        when: { any: ['d1_mehmet:stopped', 'd1_mehmet:reported'] },
        ops: [{ op: 'replace', target: 's1', segment: { id: 's1b', kind: 'normal', text: 'Haftalardır haber yok.' } }],
      },
    ],
  };

  test('no matching variant keeps authored text', () => {
    expect(resolveSegments(reply, new Set()).map((s) => s.id)).toEqual(['s1', 's2']);
  });

  test('censored letter makes the mother ask why it was short', () => {
    const segs = resolveSegments(reply, new Set(['d1_mehmet:delivered', 'd1_mehmet:censored']));
    expect(segs.map((s) => s.id)).toEqual(['s1', 'v1', 's2']);
  });

  test('stopped letter replaces the opening', () => {
    expect(resolveSegments(reply, new Set(['d1_mehmet:stopped']))[0]!.text).toBe('Haftalardır haber yok.');
  });

  test('remove and insertBefore', () => {
    const l: Letter = {
      ...reply,
      variants: [{ id: 'x', when: {}, ops: [{ op: 'remove', target: 's2' }, { op: 'insertBefore', target: 's1', segment: { id: 'p', kind: 'normal', text: 'p' } }] }],
    };
    expect(resolveSegments(l, new Set()).map((s) => s.id)).toEqual(['p', 's1']);
  });
});

describe('flags and outcomes', () => {
  test('no decision, no flags', () => {
    expect(flagsForLetter('x', { ...emptyProgress(), censored: ['s1'] })).toEqual([]);
  });

  test('censored delivery of Mehmet reads as a short letter', () => {
    const flags = new Set(flagsForLetter('d1_mehmet', { ...emptyProgress(), opened: true, censored: ['s3'], decision: 'delivered' }));
    expect(flags.has('d1_mehmet:censored:s3')).toBe(true);
    expect(pickOutcome(letter('d1_mehmet'), flags)).toBe('Hatice Hanım oğlundan kısa bir mektup alacak.');
  });

  test('a decision outranks censoring in outcome order', () => {
    const flags = new Set(flagsForLetter('d1_mehmet', { ...emptyProgress(), censored: ['s3'], decision: 'reported' }));
    expect(pickOutcome(letter('d1_mehmet'), flags)).toContain('Şube');
  });

  test('every letter has a fallback outcome', () => {
    for (const l of day.letters) expect(pickOutcome(l, new Set())).not.toBe('');
  });
});

describe('day flow', () => {
  test('a full day runs desk → dusk → ledger → continued', () => {
    let s = startDay(day);
    expect(s.stack).toHaveLength(5);
    for (const id of [...s.stack]) {
      s = openEnvelope(s, id);
      expect(s.open).toBe(id);
      s = decide(s, id, 'delivered');
    }
    expect(s.phase).toBe('dusk');
    expect(s.done).toHaveLength(5);
    s = advancePhase(s);
    expect(s.phase).toBe('ledger');
    s = advancePhase(s);
    expect(s.phase).toBe('continued');
  });

  test('only one envelope open at a time; decisions are final', () => {
    let s = startDay(day);
    s = openEnvelope(s, 'd1_mehmet');
    expect(openEnvelope(s, 'd1_riza')).toBe(s);
    s = addMark(s, 'd1_mehmet', 'censored', 's3');
    s = addMark(s, 'd1_mehmet', 'censored', 's3');
    expect(s.letters.d1_mehmet!.censored).toEqual(['s3']);
    s = decide(s, 'd1_mehmet', 'held');
    expect(decide(s, 'd1_mehmet', 'stopped')).toBe(s);
    expect(addMark(s, 'd1_mehmet', 'censored', 's1')).toBe(s);
    expect(flagsOf(s).has('d1_mehmet:held')).toBe(true);
    expect(flagsOf(s).has('d1_mehmet:censored:s3')).toBe(true);
  });
});

describe('eraser', () => {
  test('clears censoring but keeps what was found, and never touches a decided letter', () => {
    let s = openEnvelope(startDay(day), 'd1_mehmet');
    s = addMark(s, 'd1_mehmet', 'censored', 's3');
    s = addMark(s, 'd1_mehmet', 'revealed', 's4');
    const erased = clearCensor(s, 'd1_mehmet');
    expect(erased.letters.d1_mehmet!.censored).toEqual([]);
    expect(erased.letters.d1_mehmet!.revealed).toEqual(['s4']);
    const decided = decide(s, 'd1_mehmet', 'delivered');
    expect(clearCensor(decided, 'd1_mehmet')).toBe(decided);
  });
});

describe('reason slip', () => {
  it('records the ticked reason as a flag once the letter is decided', () => {
    let s = openEnvelope(startDay(day), 'd1_imzasiz');
    s = setReason(s, 'd1_imzasiz', 'sahte');
    expect(flagsOf(s).has('d1_imzasiz:reason:sahte')).toBe(false);
    s = decide(s, 'd1_imzasiz', 'reported');
    expect(flagsOf(s).has('d1_imzasiz:reason:sahte')).toBe(true);
    expect(setReason(s, 'd1_imzasiz', 'askeri')).toBe(s);
  });
});

describe('next day', () => {
  it('brings held letters back first, remembering they were held', () => {
    let s = openEnvelope(startDay(day), 'd1_saadet');
    s = decide(s, 'd1_saadet', 'held');
    const next = startDay({ ...day, day: 2, letters: [] }, s, ['x']);
    expect(next.stack).toEqual(['d1_saadet', 'x']);
    expect(next.letters.d1_saadet?.decision).toBeUndefined();
    expect(flagsOf(next).has('d1_saadet:held')).toBe(true);
    const again = decide(openEnvelope(next, 'd1_saadet'), 'd1_saadet', 'delivered');
    expect(flagsOf(again).has('d1_saadet:delivered')).toBe(true);
    expect(flagsOf(again).has('d1_saadet:held')).toBe(true);
  });
});
