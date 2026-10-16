import day01 from '../../../content/day01.json';
import type { Day } from '../../content/types';
import { openEnvelope, startDay, type DayState } from '../dayFlow';
import { guideCards, guideStep, type GuideCardInput } from '../guide';

const day = day01 as Day;
const of = (id: string) => day.letters.find((l) => l.id === id);

const ready = (s: DayState): DayState => ({ ...s, morningDone: true });

test('the first morning waits at the pile until a letter is open', () => {
  expect(guideStep(startDay(day), of)).toBeNull();
  expect(guideStep(ready(startDay(day)), of)).toBe('pile');
});

test('Mehmet is taught in order: the line, the glass, the date, then the stamp', () => {
  let s = ready(openEnvelope(startDay(day), 'd1_mehmet'));
  expect(guideStep(s, of)).toBe('pen');
  s = { ...s, letters: { ...s.letters, d1_mehmet: { ...s.letters.d1_mehmet!, censored: ['s3'] } } };
  expect(guideStep(s, of)).toBe('glass');
  s = { ...s, letters: { ...s.letters, d1_mehmet: { ...s.letters.d1_mehmet!, inspected: ['date'] } } };
  expect(guideStep(s, of)).toBe('date');
  s = { ...s, letters: { ...s.letters, d1_mehmet: { ...s.letters.d1_mehmet!, marked: ['date'] } } };
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

const place: GuideCardInput = {
  step: 'pile',
  hold: null,
  letterId: null,
  envelope: { x: 40, y: 320, w: 168, h: 117 },
  pen: { x: 710, y: 180 },
  line: { x: 480, y: 200 },
  lens: { x: 704, y: 384 },
  mark: { x: 560, y: 70, kind: 'date' },
  stamps: { x: 480, y: 468 },
};

test('the pile names the envelope, and the place only once it is in hand', () => {
  const cards = guideCards(place);
  expect(cards).toHaveLength(1);
  expect(cards[0]!.tip).toEqual({ x: 40 + 84, y: 320 + 58.5 });
  expect(cards[0]!.what).toMatch(/tut/);
  expect(cards[0]!.why).toMatch(/Parmağını çekme/);
  const drop = guideCards({ ...place, hold: 'letter' });
  expect(drop).toHaveLength(1);
  expect(drop[0]!.what).toMatch(/bırak/i);
  expect(drop[0]!.why).toMatch(/açılır/);
  expect(drop[0]!.tip).toEqual({ x: 480, y: 172 });
});

test('the pen points at the pencil until it is in hand, then at the line', () => {
  const pen = guideCards({ ...place, step: 'pen', letterId: 'd1_mehmet' });
  expect(pen).toHaveLength(1);
  expect(pen[0]!.tip).toEqual(place.pen);
  expect(pen[0]!.why).toMatch(/karalan/);
  const line = guideCards({ ...place, step: 'pen', hold: 'pen', letterId: 'd1_mehmet' });
  expect(line[0]!.tip).toEqual(place.line);
  expect(line[0]!.what).toMatch(/cümle/);
  expect(line[0]!.why).toMatch(/gitmemeli/);
  expect(line[0]!.along).toBeUndefined();
  expect(line[0]!.box.y).toBeGreaterThan(place.line!.y);
});

test('the glass comes before the date, and the date is crossed like a sentence', () => {
  const waiting = guideCards({ ...place, step: 'glass', mark: { x: 560, y: 80, kind: 'date' } });
  expect(waiting[0]!.tip).toEqual(place.lens);
  expect(waiting[0]!.what).toMatch(/Büyüteci al/);
  const look = guideCards({ ...place, step: 'glass', hold: 'glass', mark: { x: 560, y: 80, kind: 'date' } });
  expect(look[0]!.tip).toEqual({ x: 560, y: 80 });
  expect(look[0]!.what).toMatch(/tarihe/);
  const pen = guideCards({ ...place, step: 'date', mark: { x: 560, y: 80, kind: 'date' } });
  expect(pen[0]!.tip).toEqual(place.pen);
  const cross = guideCards({
    ...place,
    step: 'date',
    hold: 'pen',
    mark: { x: 560, y: 80, kind: 'date' },
    markAlong: [{ a: { x: 500, y: 80 }, b: { x: 640, y: 82 } }],
  });
  expect(cross[0]!.what).toMatch(/cümle/);
  expect(cross[0]!.why).toMatch(/Karala/);
  expect(cross[0]!.along).toHaveLength(1);
});

test('the glass points at the lens, then at a false seal', () => {
  const glass = guideCards({ ...place, step: 'glass', mark: null });
  expect(glass[0]!.tip).toEqual(place.lens);
  const seal = guideCards({ ...place, step: 'glass', hold: 'glass', mark: { x: 600, y: 360, kind: 'seal' } });
  expect(seal[0]!.tip).toEqual({ x: 600, y: 360 });
  expect(seal[0]!.why).toMatch(/mühür/i);
  expect(seal[0]!.box.y + seal[0]!.box.h).toBeLessThan(360);
});

test('the reason slip points at the box that fits the letter', () => {
  const cards = guideCards({ ...place, step: 'stamp', reason: { x: 700, y: 220, id: 'askeri' } });
  expect(cards).toHaveLength(1);
  expect(cards[0]!.what).toMatch(/işaretle/);
  expect(cards[0]!.why).toMatch(/yer/);
  expect(cards[0]!.tip).toEqual({ x: 700, y: 226 });
  expect(cards[0]!.box.x + cards[0]!.box.w).toBeLessThan(700);
});

test('the stamp card says what each seal does', () => {
  const cards = guideCards({ ...place, step: 'stamp' });
  expect(cards).toHaveLength(1);
  expect(cards[0]!.tip).toEqual(place.stamps);
  expect(cards[0]!.why).toMatch(/İlet/);
  expect(cards[0]!.why).toMatch(/Durdur/);
  expect(cards[0]!.why).toMatch(/İstihbarat/);
});
