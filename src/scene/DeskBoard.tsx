import { Group, Image, useTexture, type SkImage } from '@shopify/react-native-skia';
import { PixelRatio } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { hasArt } from '../art/ArtSlot';
import { Desk } from './Desk';
import { WORLD } from './world';

/**
 * The wood never changes, but its noise shaders are the most expensive thing on
 * screen. Rasterise it once at device resolution and blit it every frame.
 */
export function useDeskTexture(scale: number): SharedValue<SkImage | null> {
  const px = Math.min(3, scale * PixelRatio.get());
  return useTexture(
    <Group transform={[{ scale: px }]}>
      <Desk />
    </Group>,
    { width: Math.ceil(WORLD.w * px), height: Math.ceil(WORLD.h * px) },
    [px],
  );
}

export function DeskBoard({ texture }: { texture: SharedValue<SkImage | null> }) {
  // With real art the slot draws its own image and there is no noise to cache.
  if (hasArt('desk')) return <Desk />;
  return <Image image={texture} x={0} y={0} width={WORLD.w} height={WORLD.h} fit="fill" />;
}
