import { loadData, Skia, type SkImage } from '@shopify/react-native-skia';
import { artFiles } from '../../assets/art/manifest';

const images = new Map<string, SkImage>();

/**
 * Decode every illustration up front. Parts of the scene are rasterised offscreen in a
 * single pass (see useBaked), which can't wait for an image to arrive, so art has to be
 * ready synchronously by the time the desk is drawn.
 */
export async function preloadArt(): Promise<void> {
  await Promise.all(
    Object.entries(artFiles).map(async ([slot, source]) => {
      if (source === undefined || images.has(slot)) return;
      // Bound call: the factory reads `this`.
      const image = await loadData(source, (d) => Skia.Image.MakeImageFromEncoded(d)).catch(() => null);
      if (image) images.set(slot, image);
    }),
  );
}

export const artImage = (slot: string): SkImage | null => images.get(slot) ?? null;
