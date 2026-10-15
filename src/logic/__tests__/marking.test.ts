import { inside, isClosedLoop, ringed, underGlass } from '../marking';

const circle = (cx: number, cy: number, r: number, n = 24, close = 0.95) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 * close;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });

describe('red pencil rings', () => {
  test('a hand-drawn circle is a ring; a scribble over a line is not', () => {
    expect(isClosedLoop(circle(100, 100, 30))).toBe(true);
    const scribble = Array.from({ length: 20 }, (_, i) => ({ x: 50 + (i % 2) * 120, y: 100 + i * 0.5 }));
    expect(isClosedLoop(scribble)).toBe(false);
    const stroke = Array.from({ length: 20 }, (_, i) => ({ x: 50 + i * 10, y: 100 }));
    expect(isClosedLoop(stroke)).toBe(false);
    expect(isClosedLoop(circle(100, 100, 30, 24, 0.6))).toBe(false); // left wide open
  });

  test('what the ring holds', () => {
    const ring = circle(100, 100, 30);
    expect(inside(ring, { x: 100, y: 105 })).toBe(true);
    expect(inside(ring, { x: 160, y: 100 })).toBe(false);
    const targets = [
      { target: 'seal', x: 100, y: 100, anomaly: true, r: 28 },
      { target: 'date', x: 300, y: 40, anomaly: false, r: 22 },
    ];
    expect(ringed(ring, targets).map((t) => t.target)).toEqual(['seal']);
  });

  test('the glass marks whatever sits under the lens', () => {
    const targets = [
      { target: 'seal', x: 100, y: 100, anomaly: true, r: 28 },
      { target: 'date', x: 300, y: 40, anomaly: false, r: 22 },
    ];
    expect(underGlass({ x: 110, y: 108 }, 38, targets)?.target).toBe('seal');
    expect(underGlass({ x: 290, y: 48 }, 38, targets)?.target).toBe('date');
    expect(underGlass({ x: 200, y: 80 }, 30, targets)).toBeNull();
  });
});
