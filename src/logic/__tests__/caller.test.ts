import day01 from '../../../content/day01.json';
import type { Day, Letter } from '../../content/types';
import { callerScript, type FaceKind } from '../caller';

const day = day01 as Day;
const letter = (id: string) => day.letters.find((l) => l.id === id)!;

const FACES: FaceKind[] = ['nefer', 'efendi', 'kadin', 'subay'];

function script(l: Letter) {
  return callerScript(l);
}

describe('caller', () => {
  test('the same letter always brings the same person', () => {
    expect(script(letter('d1_mehmet'))).toEqual(script(letter('d1_mehmet')));
  });

  test('front mail is announced by whoever carried it', () => {
    const s = script(letter('d1_mehmet'));
    expect(FACES).toContain(s.face);
    expect(s.arrive).toContain('Arıburnu');
    expect(s.arrive).toContain('Hatice Hanım');
    expect(s.arrive).toContain('\n');
    if (s.face === 'kadin') expect(s.moustache).toBe(false);
    if (s.face === 'subay') expect(s.moustache).toBe(true);
  });

  test('a woman who brings her own letter is at the counter', () => {
    const hatice = script(letter('d1_hatice'));
    expect(hatice.face).toBe('kadin');
    expect(hatice.moustache).toBe(false);
    expect(hatice.arrive).toContain('Hatice Hanım');
    expect(hatice.arrive).toContain('bırakıyorum');

    const saadet = script(letter('d1_saadet'));
    expect(saadet.face).toBe('kadin');
    expect(saadet.arrive).toContain('Saadet');
  });

  test('an unsigned letter is carried, not claimed', () => {
    const s = script(letter('d1_imzasiz'));
    expect(s.arrive.startsWith('İmzasız')).toBe(true);
    expect(s.arrive).not.toContain('bırakıyorum');
  });

  test('leaving is one short line, and it depends on the stamp', () => {
    const s = script(letter('d1_riza'));
    const lines = [s.leave.delivered, s.leave.held, s.leave.stopped, s.leave.reported];
    for (const line of lines) {
      expect(line.length).toBeGreaterThan(0);
      expect(line.length).toBeLessThan(40);
      expect(line).not.toContain('\n');
    }
    expect(new Set(lines).size).toBe(lines.length);
  });
});
