import { useMemo } from 'react';
import { FontWeight, FractalNoise, Group, Path, Rect } from '@shopify/react-native-skia';
import { Para } from '../scene/Para';
import { roughRect } from '../scene/rough';

interface Props {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: string;
  rotate: number;
  seed: string;
  size?: number;
  opacity?: number;
}

/**
 * A rubber-stamp impression: double frame, spaced capitals, and ink that
 * didn't take everywhere. The wear pattern is seeded so it stays the same.
 */
export function StampMark({ x, y, w, h, label, color, rotate, seed, size = 15, opacity = 0.9 }: Props) {
  const outer = useMemo(() => roughRect({ x, y, w, h }, `${seed}-o`, 0.9), [x, y, w, h, seed]);
  const inner = useMemo(() => roughRect({ x: x + 4, y: y + 4, w: w - 8, h: h - 8 }, `${seed}-i`, 0.7), [x, y, w, h, seed]);
  const noiseSeed = useMemo(() => [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % 97, [seed]);
  return (
    <Group layer transform={[{ rotate }]} origin={{ x: x + w / 2, y: y + h / 2 }} opacity={opacity}>
      <Path path={outer} style="stroke" strokeWidth={2.6} color={color} />
      <Path path={inner} style="stroke" strokeWidth={1} color={color} />
      <Para text={label} x={x} y={y + h / 2 - size * 0.66} width={w} family="Cormorant" size={size} color={color} weight={FontWeight.Bold} letterSpacing={size * 0.16} align="center" />
      <Rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} blendMode="dstOut" opacity={0.55}>
        <FractalNoise freqX={0.11} freqY={0.07} octaves={2} seed={noiseSeed} />
      </Rect>
    </Group>
  );
}
