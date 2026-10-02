import { distToRect, distToSegment, inRotatedRect, stickEnd } from '../../scene/hit';

test('distance to a segment clamps at the ends', () => {
  expect(distToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3);
  expect(distToSegment({ x: 14, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
});

test('distance to a rect is zero inside', () => {
  const r = { x: 0, y: 0, w: 10, h: 10 };
  expect(distToRect({ x: 5, y: 5 }, r)).toBe(0);
  expect(distToRect({ x: 13, y: 14 }, r)).toBe(5);
});

test('rotated rect hit test', () => {
  // A 100×20 card turned 90° about its corner now hangs downward-left.
  expect(inRotatedRect({ x: -10, y: 50 }, 0, 0, 100, 20, Math.PI / 2)).toBe(true);
  expect(inRotatedRect({ x: 50, y: 10 }, 0, 0, 100, 20, Math.PI / 2)).toBe(false);
});

test('a pen turned half round points its body downward', () => {
  const end = stickEnd({ x: 0, y: 0 }, Math.PI, 100);
  expect(end.x).toBeCloseTo(0);
  expect(end.y).toBeCloseTo(100);
});
