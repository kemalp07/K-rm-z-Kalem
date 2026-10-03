import type { ReactNode } from 'react';
import { Group, Paint, type Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { Rect } from '../logic/censor';

/**
 * Opacity for groups that contain text. Skia paragraphs carry their own paint and
 * ignore an inherited group opacity, so the fade has to happen on a saved layer.
 *
 * A layer is as big as the clip it is opened under, which is the whole screen unless
 * `bounds` is given: pass it wherever the fade stays on screen for long.
 */
export function Fade({
  opacity,
  children,
  transform,
  bounds,
}: {
  opacity: number | SharedValue<number>;
  children: ReactNode;
  transform?: Transforms3d | SharedValue<Transforms3d>;
  /** Local-space area the children draw in. */
  bounds?: Rect;
}) {
  const layer = <Group layer={<Paint opacity={opacity} />}>{children}</Group>;
  if (!transform && !bounds) return layer;
  const clip = bounds && { x: bounds.x, y: bounds.y, width: bounds.w, height: bounds.h };
  return (
    <Group transform={transform} clip={clip}>
      {layer}
    </Group>
  );
}
