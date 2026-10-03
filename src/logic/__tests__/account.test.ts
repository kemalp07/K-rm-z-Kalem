import day01 from '../../../content/day01.json';
import type { Day } from '../../content/types';
import { judge } from '../account';
import { closeLedger, decide, economy, eveningBill, finishEvening, flagsOf, openEnvelope, purseOf, setReason, startDay } from '../dayFlow';
import { emptyProgress } from '../flags';

const day = day01 as Day;
const letter = (id: string) => day.letters.find((l) => l.id === id)!;

describe('the Şube reckons', () => {
  it('docks what was let through and rewards a spy caught', () => {
    expect(judge(letter('d1_mehmet'), { ...emptyProgress(), decision: 'delivered' })).toEqual(['sensitiveMissed']);
    expect(judge(letter('d1_mehmet'), { ...emptyProgress(), censored: ['s3'], decision: 'delivered' })).toEqual([]);
    expect(judge(letter('d1_imzasiz'), { ...emptyProgress(), decision: 'delivered' })).toContain('forgeryMissed');
    expect(judge(letter('d1_imzasiz'), { ...emptyProgress(), reason: 'sahte', decision: 'reported' })).toEqual(['spyCaught']);
    expect(judge(letter('d1_imzasiz'), { ...emptyProgress(), reason: 'moral', decision: 'reported' })).toEqual(['wrongReason']);
    expect(judge(letter('d1_mehmet'), { ...emptyProgress(), decision: 'held' })).toEqual([]);
  });

  it('pays the day into the purse, then the evening out of it', () => {
    let s = startDay(day);
    for (const id of [...s.stack]) {
      s = openEnvelope(s, id);
      if (id === 'd1_imzasiz') s = setReason(s, id, 'sahte');
      s = decide(s, id, id === 'd1_imzasiz' ? 'reported' : 'held');
    }
    s = { ...s, phase: 'ledger' };
    s = closeLedger(s, (id) => day.letters.find((l) => l.id === id));
    expect(s.phase).toBe('evening');
    expect(purseOf(s)).toBe(economy.start + economy.wage + economy.penalties.spyCaught.amount);
    const before = purseOf(s);
    s = finishEvening(s, ['ekmek']);
    expect(s.phase).toBe('continued');
    expect(purseOf(s)).toBe(before - 5);
    expect(flagsOf(s).has('d1:unpaid:gaz')).toBe(true);
    expect(eveningBill({ ...s, day: 4 }).expenses.map((e) => e.id)).toContain('kira');
  });

  it('refuses an evening the purse cannot pay', () => {
    const s = { ...startDay(day), phase: 'evening' as const, purse: 3 };
    expect(finishEvening(s, ['ekmek'])).toBe(s);
  });
});
