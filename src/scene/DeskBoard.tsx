import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { drawAsImage, Group, Image, Rect, type SkImage } from '@shopify/react-native-skia';
import { PixelRatio } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { hasArt } from '../art/ArtSlot';
import type { Rect as R } from '../logic/censor';
import { Desk } from './Desk';
import { DESK_EXTENT as E } from './world';

/** The bare desk top: wood, darkened to sit under the lamp. */
export function DeskSurface() {
  return (
    <>
      <Desk />
      {hasArt('desk') && <Rect x={E.x} y={E.y} width={E.w} height={E.h} color="#2a1a0f" blendMode="multiply" opacity={0.55} />}
    </>
  );
}

export interface Baked {
  image: SkImage;
  /** What the image shows; a caller compares it with what it wants drawn now. */
  key: string;
  region: R;
}

/**
 * Most of what is on screen sits still while the player drags one thing about. Drawing
 * all of it every frame (shadows, blurs, tinted art, paragraphs) made dragging stutter,
 * so a still part is rasterised once at device resolution and redrawn as one image.
 * It is redone whenever `key` changes; until then the previous image stays available.
 */
export function useBaked(element: ReactElement | null, region: R, scale: number, key: string): Baked | null {
  const px = Math.min(2.5, scale * PixelRatio.get());
  const [baked, setBaked] = useState<Baked | null>(null);
  const latest = useRef(element);
  latest.current = element;
  const { x, y, w, h } = region;
  const fullKey = `${key}@${px}`;

  useEffect(() => {
    const el = latest.current;
    if (!el) return;
    let live = true;
    const size = { width: Math.ceil(w * px), height: Math.ceil(h * px) };
    drawAsImage(<Group transform={[{ scale: px }, { translateX: -x }, { translateY: -y }]}>{el}</Group>, size).then((image) => {
      if (live && image) setBaked({ image, key: fullKey, region: { x, y, w, h } });
    });
    return () => {
      live = false;
    };
  }, [fullKey, px, x, y, w, h]);

  // Free the pixels of a replaced image once the new one is on screen.
  const shown = useRef<SkImage | null>(null);
  useEffect(() => {
    const old = shown.current;
    shown.current = baked?.image ?? null;
    if (old && old !== shown.current) setTimeout(() => old.dispose?.(), 100);
  }, [baked]);

  return useMemo(() => (baked ? { ...baked, key: baked.key.slice(0, baked.key.lastIndexOf('@')) } : null), [baked]);
}

export function BakedImage({ baked, opacity }: { baked: Baked | null; opacity?: number | SharedValue<number> }) {
  if (!baked) return null;
  const { x, y, w, h } = baked.region;
  return <Image image={baked.image} x={x} y={y} width={w} height={h} fit="fill" opacity={opacity} />;
}

export const DESK_REGION: R = E;
