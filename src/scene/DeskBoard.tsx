import { useMemo } from 'react';
import { Group, Image, Rect, useTexture, type SkImage } from '@shopify/react-native-skia';
import { PixelRatio } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { hasArt } from '../art/ArtSlot';
import { Desk } from './Desk';
import { DESK_EXTENT as E } from './world';

/**
 * The wood never changes, but its noise shaders are the most expensive thing on
 * screen. Rasterise it once at device resolution and blit it every frame.
 */
export function useDeskTexture(scale: number): SharedValue<SkImage | null> {
  const px = Math.min(3, scale * PixelRatio.get());
  // useTexture re-rasterises whenever `size` changes identity, so keep it stable.
  const size = useMemo(() => ({ width: Math.ceil(E.w * px), height: Math.ceil(E.h * px) }), [px]);
  const element = useMemo(
    () => (
      <Group transform={[{ scale: px }, { translateX: -E.x }]}>
        <Desk />
      </Group>
    ),
    [px],
  );
  return useTexture(element, size, [px]);
}

export function DeskBoard({ texture }: { texture: SharedValue<SkImage | null> }) {
  // With real art the slot draws its own image and there is no noise to cache.
  if (hasArt('desk'))
    return (
      <>
        <Desk />
        <Rect x={E.x} y={E.y} width={E.w} height={E.h} color="#2a1a0f" blendMode="multiply" opacity={0.55} />
      </>
    );
  return <Image image={texture} x={E.x} y={E.y} width={E.w} height={E.h} fit="fill" />;
}
