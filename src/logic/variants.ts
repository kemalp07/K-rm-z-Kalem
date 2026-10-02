import type { Letter, Segment } from '../content/types';
import { matches } from './conditions';

/**
 * The segments a letter actually shows, given what happened earlier.
 * Variants apply in authored order; an op whose target is already gone is skipped.
 */
export function resolveSegments(letter: Letter, flags: ReadonlySet<string>): Segment[] {
  let segs = [...letter.segments];
  for (const variant of letter.variants ?? []) {
    if (!matches(variant.when, flags)) continue;
    for (const op of variant.ops) {
      const i = segs.findIndex((s) => s.id === op.target);
      if (i < 0) continue;
      switch (op.op) {
        case 'insertBefore':
          segs = [...segs.slice(0, i), op.segment, ...segs.slice(i)];
          break;
        case 'insertAfter':
          segs = [...segs.slice(0, i + 1), op.segment, ...segs.slice(i + 1)];
          break;
        case 'replace':
          segs = [...segs.slice(0, i), op.segment, ...segs.slice(i + 1)];
          break;
        case 'remove':
          segs = [...segs.slice(0, i), ...segs.slice(i + 1)];
          break;
      }
    }
  }
  return segs;
}
