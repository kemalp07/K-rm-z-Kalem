import { distToRect, distToSegment, GRIP_FROM_NIB, inRotatedRect, nibFromGrip, stickEnd, toLocalFrame } from '../../scene/hit';

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

test('the nib sits down-right of the fingers and the grip lands back on them', () => {
  const grip = { x: 100, y: 80 };
  const angle = -0.62;
  const nib = nibFromGrip(grip, angle);
  expect(nib.x).toBeGreaterThan(grip.x);
  expect(nib.y).toBeGreaterThan(grip.y);
  const back = stickEnd(nib, angle, GRIP_FROM_NIB);
  expect(back.x).toBeCloseTo(grip.x);
  expect(back.y).toBeCloseTo(grip.y);
});

test('toLocalFrame undoes tilt and shear about the origin', () => {
  const o = { x: 100, y: 50 };
  const tilt = 0.05;
  const skew = -0.12;
  const q = { x: 180, y: 70 }; // a point on the upright text
  // Forward: shear (x += tan(skew)·y), then rotate, both about o — as Skia applies [rotate, skewY].
  const sx = q.x - o.x + Math.tan(skew) * (q.y - o.y);
  const sy = q.y - o.y;
  const drawn = { x: o.x + sx * Math.cos(tilt) - sy * Math.sin(tilt), y: o.y + sx * Math.sin(tilt) + sy * Math.cos(tilt) };
  const back = toLocalFrame(drawn, o, tilt, skew);
  expect(back.x).toBeCloseTo(q.x);
  expect(back.y).toBeCloseTo(q.y);
});
