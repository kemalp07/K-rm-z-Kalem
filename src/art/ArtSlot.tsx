import type { ReactNode } from 'react';
import { BlendMode, Group, Image, Skia, TileMode, useImage, type SkCanvas, type SkImage, type Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { artFiles } from '../../assets/art/manifest';
import { artPlacement } from '../../assets/art/placement';
import { artImage } from './preload';
import type { ArtSlotId } from './slots';
import type { Rect } from '../logic/censor';

/** Preloaded art when available (always, after preloadArt), else decoded on demand. */
function useArt(slot: string, source: number | null | undefined): SkImage | null {
  const ready = artImage(slot);
  const loaded = useImage(ready || source == null ? null : source);
  return source == null ? null : (ready ?? loaded);
}

interface Props {
  slot: ArtSlotId;
  rect: Rect;
  /** Give the illustration a soft drop shadow of its own silhouette. */
  shadow?: boolean;
  /** Skia placeholder drawn while the slot has no illustration. */
  children: ReactNode;
}

const RESTING_SHADOW: ArtShadowSpec = { transform: [{ translateX: -3 }, { translateY: 4 }], opacity: 0.55, restBlur: 3 };

export function ArtSlot({ slot, rect, shadow, children }: Props) {
  const source = artFiles[slot] ?? null;
  const image = useArt(slot, source);
  if (!source) return <>{children}</>;
  if (!image) return null; // brief gap while the file decodes; better than a flash of placeholder
  return (
    <>
      {shadow && <ArtShadow image={image} rect={rect} spec={RESTING_SHADOW} />}
      <Image image={image} x={rect.x} y={rect.y} width={rect.w} height={rect.h} fit="fill" />
    </>
  );
}

export const hasArt = (slot: ArtSlotId) => artFiles[slot] !== undefined;

/** Board-unit geometry of a placed illustration, relative to its object's origin. */
export function placed(slot: ArtSlotId) {
  const p = artPlacement[slot];
  if (!p || !hasArt(slot)) return null;
  const k = p.width / p.size[0];
  const at = ([x, y]: [number, number]) => ({ x: (x - p.anchor[0]) * k, y: (y - p.anchor[1]) * k });
  return {
    rect: { x: -p.anchor[0] * k, y: -p.anchor[1] * k, w: p.width, h: p.size[1] * k },
    point: (name: string) => (p.points?.[name] ? at(p.points[name]!) : null),
  };
}

/**
 * Draws a slot's illustration around the current origin using its placement, or the
 * placeholder when the slot is empty (or has no placement yet).
 */
export function PlacedArt({ slot, shadow, children }: { slot: ArtSlotId; shadow?: ArtShadowSpec; children: ReactNode }) {
  const geo = placed(slot);
  const source = artFiles[slot] ?? null;
  const image = useArt(slot, geo ? source : undefined);
  if (!geo) return <>{children}</>;
  if (!image) return null;
  const { x, y, w, h } = geo.rect;
  return (
    <>
      {shadow && <ArtShadow image={image} rect={geo.rect} spec={shadow} />}
      <Image image={image} x={x} y={y} width={w} height={h} fit="fill" />
    </>
  );
}

type Animated<T> = T | SharedValue<T>;

export interface ArtShadowSpec {
  transform: Animated<Transforms3d>;
  opacity: Animated<number>;
  /** Softness in board units. */
  restBlur: number;
}

// Every colour to black, alpha kept: the illustration's own silhouette becomes its shadow.
const TO_BLACK = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0];

/*
 * Blurs and tint layers are costly to run every frame, and these never change for a
 * given illustration, so each is rendered once into its own image and reused.
 */
const baked = new WeakMap<SkImage, Map<string, { image: SkImage; pad: number }>>();

function bake(src: SkImage, key: string, pad: number, draw: (canvas: SkCanvas) => void) {
  let byKey = baked.get(src);
  if (!byKey) baked.set(src, (byKey = new Map()));
  const hit = byKey.get(key);
  if (hit) return hit;
  const surface = Skia.Surface.Make(src.width() + pad * 2, src.height() + pad * 2);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('transparent'));
  draw(canvas);
  surface.flush();
  const out = { image: surface.makeImageSnapshot(), pad };
  byKey.set(key, out);
  return out;
}

function shadowOf(src: SkImage, blurPx: number) {
  const pad = Math.ceil(blurPx * 3);
  return bake(src, `shadow:${blurPx.toFixed(1)}`, pad, (canvas) => {
    const paint = Skia.Paint();
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(TO_BLACK));
    paint.setImageFilter(Skia.ImageFilter.MakeBlur(blurPx, blurPx, TileMode.Decal, null));
    canvas.drawImage(src, pad, pad, paint);
  });
}

function tintOf(src: SkImage, tint: string) {
  return bake(src, `tint:${tint}`, 0, (canvas) => {
    // Multiply the tint in, then cut back to the illustration's own alpha.
    canvas.drawImage(src, 0, 0);
    const multiply = Skia.Paint();
    multiply.setColor(Skia.Color(tint));
    multiply.setBlendMode(BlendMode.Multiply);
    canvas.drawRect(Skia.XYWHRect(0, 0, src.width(), src.height()), multiply);
    const keep = Skia.Paint();
    keep.setBlendMode(BlendMode.DstIn);
    canvas.drawImage(src, 0, 0, keep);
  });
}

function ArtShadow({ image, rect, spec }: { image: SkImage; rect: { x: number; y: number; w: number; h: number }; spec: ArtShadowSpec }) {
  // A lifted object's shadow moves away but keeps the resting softness.
  const k = rect.w / image.width();
  const shadow = shadowOf(image, spec.restBlur / k);
  if (!shadow) return null;
  const pad = shadow.pad * k;
  return (
    <Group transform={spec.transform}>
      <Image image={shadow.image} x={rect.x - pad} y={rect.y - pad} width={rect.w + pad * 2} height={rect.h + pad * 2} fit="fill" opacity={spec.opacity} />
    </Group>
  );
}

/**
 * One illustration, many variants: multiply a tint into the image (keeping its own
 * edges), so a single sheet of paper art can be cheap grey stock or cream bond.
 */
const TINTED_SHADOW: ArtShadowSpec = { transform: [{ translateX: -6 }, { translateY: 9 }], opacity: 0.6, restBlur: 8 };

export function TintedArt({ slot, rect, tint, shadow }: { slot: ArtSlotId; rect: Rect; tint: string; shadow?: boolean }) {
  const image = useArt(slot, artFiles[slot]);
  if (!image) return null;
  const tinted = tintOf(image, tint)?.image ?? image;
  const { x, y, w, h } = rect;
  return (
    <>
      {shadow && <ArtShadow image={image} rect={rect} spec={TINTED_SHADOW} />}
      <Image image={tinted} x={x} y={y} width={w} height={h} fit="fill" />
    </>
  );
}
