import { useEffect, useRef, useState, type ReactElement } from 'react';
import { drawAsPicture, Group, Image, Rect, Skia, type SkImage } from '@shopify/react-native-skia';
import { PixelRatio } from 'react-native';
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
 * all of it every frame made dragging stutter, so a still part is rasterised once and
 * redrawn as one image. It is redone whenever `key` changes; until then the previous
 * image stays available.
 *
 * Rasterised in plain memory on purpose: an offscreen GPU surface is a new WebGL
 * context on web (browsers drop the screen's own when there are too many, blanking
 * the desk), and reading its pixels back stalled the page for seconds.
 */
export function useBaked(element: ReactElement | null, region: R, scale: number, key: string): Baked | null {
  const px = Math.min(2, scale * PixelRatio.get());
  const [baked, setBaked] = useState<Baked | null>(null);
  const latest = useRef(element);
  latest.current = element;
  const { x, y, w, h } = region;
  const fullKey = `${key}@${px}`;

  useEffect(() => {
    const el = latest.current;
    if (!el) return;
    let live = true;
    drawAsPicture(<Group transform={[{ scale: px }, { translateX: -x }, { translateY: -y }]}>{el}</Group>).then((picture) => {
      if (!live) return;
      const surface = Skia.Surface.Make(Math.ceil(w * px), Math.ceil(h * px));
      if (!surface) return;
      surface.getCanvas().drawPicture(picture);
      surface.flush();
      const image = surface.makeImageSnapshot();
      setBaked({ image, key: fullKey, region: { x, y, w, h } });
    });
    return () => {
      live = false;
    };
  }, [fullKey, px, x, y, w, h]);

  return baked && { ...baked, key: baked.key.slice(0, baked.key.lastIndexOf('@')) };
}

export function BakedImage({ baked }: { baked: Baked | null }) {
  if (!baked) return null;
  const { x, y, w, h } = baked.region;
  return <Image image={baked.image} x={x} y={y} width={w} height={h} fit="fill" />;
}

export const DESK_REGION: R = E;
