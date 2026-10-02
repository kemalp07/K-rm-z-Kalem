import type { ReactNode } from 'react';
import { Group, Paint, type Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

/**
 * Opacity for groups that contain text. Skia paragraphs carry their own paint and
 * ignore an inherited group opacity, so the fade has to happen on a saved layer.
 */
export function Fade({
  opacity,
  children,
  transform,
}: {
  opacity: number | SharedValue<number>;
  children: ReactNode;
  transform?: Transforms3d | SharedValue<Transforms3d>;
}) {
  return (
    <Group transform={transform} layer={<Paint opacity={opacity} />}>
      {children}
    </Group>
  );
}
