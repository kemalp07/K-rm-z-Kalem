import { poolLetters } from '../../content/pool';
import { pickOutcome } from '../outcomes';
import { mixIntoStack, pickSideLetters, rumiOrdinal } from '../sideLetters';

describe('side letters', () => {
  test('rumi dates sort by the Rumi year (Mart first)', () => {
    expect(rumiOrdinal('30 Nisan 1331')).toBeLessThan(rumiOrdinal('1 Mayıs 1331'));
    expect(rumiOrdinal('5 Mayıs 1331')).toBeLessThan(rumiOrdinal('1 Şubat 1331'));
    expect(Number.isNaN(rumiOrdinal('Pazar akşamı'))).toBe(true);
  });

  test('only letters written by the day, none seen before, same seed same pick', () => {
    const pool = [
      { id: 'a', date: '20 Nisan 1331' },
      { id: 'b', date: '5 Mayıs 1331' },
      { id: 'c', date: '6 Mayıs 1331' },
      { id: 'd', date: '1 Haziran 1331' },
    ];
    const picked = pickSideLetters(pool, '5 Mayıs 1331', 5, 42);
    expect(picked.sort()).toEqual(['a', 'b']);
    expect(pickSideLetters(pool, '5 Mayıs 1331', 1, 7, new Set(['a']))).toEqual(['b']);
    expect(pickSideLetters(pool, '30 Mayıs 1331', 2, 9)).toEqual(pickSideLetters(pool, '30 Mayıs 1331', 2, 9));
  });

  test('the first two authored letters stay on top; the rest keep their order', () => {
    for (const seed of [1, 3, 9, 42, 99]) {
      const stack = mixIntoStack(['m1', 'm2', 'm3', 'm4'], ['x', 'y'], seed);
      expect(stack.slice(0, 2)).toEqual(['m1', 'm2']);
      expect(stack.filter((id) => id.startsWith('m'))).toEqual(['m1', 'm2', 'm3', 'm4']);
      expect(stack).toHaveLength(6);
    }
  });

  test('a side letter is a glance: news, a detail, and anything that must be censored', () => {
    const words = poolLetters.map((l) => l.segments.reduce((n, s) => n + s.text.split(/\s+/).length, 0)).sort((a, b) => a - b);
    const mid = words[Math.floor(words.length / 2)]!;
    expect(mid).toBeLessThan(55);
    expect(words[words.length - 1]).toBeLessThan(120);
    for (const l of poolLetters) {
      const normals = l.segments.filter((s) => s.kind === 'normal').length;
      expect(normals).toBeLessThanOrEqual(2);
      expect(l.segments.length).toBeGreaterThan(0);
    }
  });

  test('every exported letter is a playable Letter', () => {
    expect(poolLetters.length).toBeGreaterThan(0);
    for (const l of poolLetters) {
      expect(l.sender && l.recipient && l.to && l.heading).toBeTruthy();
      expect(new Set(l.segments.map((s) => s.id)).size).toBe(l.segments.length);
      expect(l.segments.every((s) => s.text.trim().length > 0)).toBe(true);
      expect(l.outcomes[l.outcomes.length - 1]!.when).toBeUndefined();
      expect(Number.isNaN(rumiOrdinal(String(l.meta?.date)))).toBe(false);
      expect(pickOutcome(l, new Set([`${l.id}:delivered`]))).not.toMatch(/\{\w+\}/);
    }
  });
});
