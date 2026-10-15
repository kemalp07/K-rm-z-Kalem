import { coverageRatio, isBlackedOut, makeCoverage, strokeOver } from '../censor';
import { DEFAULT_REVEAL, displayedHeat, heatTarget, stepHeat } from '../reveal';

/** One deliberate pass, the way a slow hand crosses a line. */
function sweep(lines: ReturnType<typeof makeCoverage>, y: number, from: number, to: number) {
  strokeOver(lines, { x: from, y }, { x: to, y }, 4);
}

describe('censor coverage', () => {
  const rects = [{ x: 0, y: 0, w: 300, h: 20 }];

  test('one slow sweep buries the line', () => {
    const lines = makeCoverage(rects);
    sweep(lines, 10, -5, 310);
    expect(coverageRatio(lines)).toBeGreaterThan(0.9);
    expect(isBlackedOut(lines)).toBe(true);
  });

  test('a fast stroke leaves the words', () => {
    const lines = makeCoverage(rects);
    strokeOver(lines, { x: -5, y: 10 }, { x: 310, y: 10 }, 4, false);
    expect(coverageRatio(lines)).toBe(0);
    expect(isBlackedOut(lines)).toBe(false);
  });

  test('half a sweep does not', () => {
    const lines = makeCoverage(rects);
    strokeOver(lines, { x: 0, y: 10 }, { x: 150, y: 10 }, 4);
    expect(coverageRatio(lines)).toBeGreaterThan(0.4);
    expect(coverageRatio(lines)).toBeLessThan(0.7);
    expect(isBlackedOut(lines)).toBe(false);
  });

  test('a stroke on the line below misses', () => {
    const lines = makeCoverage(rects);
    strokeOver(lines, { x: 0, y: 60 }, { x: 300, y: 60 }, 4);
    expect(coverageRatio(lines)).toBe(0);
  });

  test('wrapped segment needs every line buried', () => {
    const lines = makeCoverage([...rects, { x: 0, y: 24, w: 120, h: 20 }]);
    sweep(lines, 10, 0, 300);
    expect(isBlackedOut(lines)).toBe(false);
    sweep(lines, 34, 0, 125);
    expect(isBlackedOut(lines)).toBe(true);
  });
});

describe('candle heat', () => {
  test('heat falls off with distance', () => {
    expect(heatTarget(0)).toBe(1);
    expect(heatTarget(DEFAULT_REVEAL.far + 1)).toBe(0);
    expect(heatTarget(100)).toBeGreaterThan(heatTarget(150));
  });

  test('heat climbs slowly and never overshoots', () => {
    let h = 0;
    h = stepHeat(h, 1, 0.5);
    expect(h).toBeCloseTo(DEFAULT_REVEAL.rise * 0.5);
    for (let i = 0; i < 100; i++) h = stepHeat(h, 1, 0.1);
    expect(h).toBe(1);
  });

  test('cools more slowly than it warms', () => {
    const up = stepHeat(0, 1, 1);
    const down = 1 - stepHeat(1, 0, 1);
    expect(down).toBeLessThan(up);
  });

  test('read ink keeps a ghost', () => {
    expect(displayedHeat(0, true)).toBeGreaterThan(0);
    expect(displayedHeat(0, false)).toBe(0);
  });
});
