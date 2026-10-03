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

  test('side letters go under the first authored letter, authored order kept', () => {
    const stack = mixIntoStack(['m1', 'm2', 'm3'], ['x', 'y'], 3);
    expect(stack[0]).toBe('m1');
    expect(stack.filter((id) => id.startsWith('m'))).toEqual(['m1', 'm2', 'm3']);
    expect(stack).toHaveLength(5);
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
