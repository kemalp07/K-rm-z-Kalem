import type { ReactNode } from 'react';
import { Blur, ColorMatrix, Group, Image, Paint, useImage, type SkImage, type Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { artFiles } from '../../assets/art/manifest';
import { artPlacement } from '../../assets/art/placement';
import type { ArtSlotId } from './slots';
import type { Rect } from '../logic/censor';

interface Props {
  slot: ArtSlotId;
  rect: Rect;
  /** Give the illustration a soft drop shadow of its own silhouette. */
  shadow?: boolean;
  /** Skia placeholder drawn while the slot has no illustration. */
  children: ReactNode;
}

const RESTING_SHADOW: ArtShadowSpec = { transform: [{ translateX: -3 }, { translateY: 4 }], opacity: 0.55, blur: 3 };

export function ArtSlot({ slot, rect, shadow, children }: Props) {
  const source = artFiles[slot] ?? null;
  const image = useImage(source);
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
  const image = useImage(geo ? source : null);
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
  blur: Animated<number>;
}

// Every colour to black, alpha kept: the illustration's own silhouette becomes its shadow.
const TO_BLACK = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0];

function ArtShadow({ image, rect, spec }: { image: SkImage; rect: { x: number; y: number; w: number; h: number }; spec: ArtShadowSpec }) {
  return (
    <Group
      transform={spec.transform}
      layer={
        <Paint opacity={spec.opacity}>
          <ColorMatrix matrix={TO_BLACK} />
          <Blur blur={spec.blur} />
        </Paint>
      }
    >
      <Image image={image} x={rect.x} y={rect.y} width={rect.w} height={rect.h} fit="fill" />
    </Group>
  );
}
