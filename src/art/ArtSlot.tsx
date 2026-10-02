import type { ReactNode } from 'react';
import { Image, useImage } from '@shopify/react-native-skia';
import { artFiles } from '../../assets/art/manifest';
import type { ArtSlotId } from './slots';
import type { Rect } from '../logic/censor';

interface Props {
  slot: ArtSlotId;
  rect: Rect;
  /** Skia placeholder drawn while the slot has no illustration. */
  children: ReactNode;
}

export function ArtSlot({ slot, rect, children }: Props) {
  const source = artFiles[slot] ?? null;
  const image = useImage(source);
  if (!source) return <>{children}</>;
  if (!image) return null; // brief gap while the file decodes; better than a flash of placeholder
  return <Image image={image} x={rect.x} y={rect.y} width={rect.w} height={rect.h} fit="fill" />;
}

export const hasArt = (slot: ArtSlotId) => artFiles[slot] !== undefined;
