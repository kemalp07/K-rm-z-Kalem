import bookletJson from '../../content/booklet.json';
import type { Booklet, BookletBlock, BookletItem, BookletPage, BookletSeal, SampleCard } from './types';

export const booklet = bookletJson as Booklet;

const itemDay = (it: BookletItem) => (typeof it === 'string' ? 1 : it.day);
export const itemText = (it: BookletItem) => (typeof it === 'string' ? it : it.text);

/**
 * The pages pasted in by `day`, in order. Lines that belong to a later day are left out,
 * so a rule never shows before the tool or the trouble it is about.
 */
export function bookletPages(day: number, source: Booklet = booklet): BookletPage[] {
  return source.pages
    .filter((p) => p.day <= day)
    .sort((a, b) => a.n - b.n)
    .map((p) => ({
      ...p,
      blocks: p.blocks
        .map((b): BookletBlock => ('items' in b && b.t !== 'seals' ? { ...b, items: b.items.filter((it) => itemDay(it) <= day) } : b))
        .filter((b) => !('items' in b) || b.items.length > 0),
    }));
}

/** Pages that arrived on exactly this day; the booklet opens on the first of them. */
export const newPages = (day: number, source: Booklet = booklet) =>
  day > 1 ? bookletPages(day, source).filter((p) => p.day === day) : [];

/** Sample cards on the desk by `day`, each with the seals of the page it copies. */
export function sampleCards(day: number, source: Booklet = booklet): (SampleCard & { seals: BookletSeal[] })[] {
  return source.cards
    .filter((c) => c.day <= day)
    .map((c) => {
      const page = source.pages.find((p) => p.id === c.page);
      const block = page?.blocks.find((b) => b.t === 'seals');
      if (!block || block.t !== 'seals') throw new Error(`content/booklet.json: card "${c.id}" needs page "${c.page}" with seals`);
      return { ...c, seals: block.items };
    });
}
