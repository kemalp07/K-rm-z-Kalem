import { isUnderlined, makeCoverage, strokeOver, underlineBand } from '../censor';

test('the underline band sits under the date, not through the words', () => {
  const date = { x: 100, y: 40, w: 160, h: 22 };
  const band = underlineBand(date);
  expect(band.y).toBeGreaterThan(date.y + date.h / 2);
  expect(band.y + band.h).toBeGreaterThan(date.y + date.h);
  expect(band.x).toBeLessThan(date.x);
  expect(band.x + band.w).toBeGreaterThan(date.x + date.w);
});

test('a line along the date counts, a tick through the words does not', () => {
  const band = underlineBand({ x: 100, y: 40, w: 120, h: 20 });
  const along = makeCoverage([band]);
  strokeOver(along, { x: band.x + 4, y: band.y + 4 }, { x: band.x + band.w - 4, y: band.y + 5 }, 4, true);
  expect(isUnderlined(along)).toBe(true);

  const tick = makeCoverage([band]);
  strokeOver(tick, { x: band.x + band.w / 2, y: band.y - 30 }, { x: band.x + band.w / 2, y: band.y + band.h + 30 }, 4, true);
  expect(isUnderlined(tick)).toBe(false);
});
