import { bookletPages, itemText } from '../../content/booklet';
import type { Booklet, BookletPage } from '../../content/types';

const src: Booklet = {
  cover: { label: '', title: '', subtitle: '', lines: [], note: '' },
  noTitle: '',
  pageLabel: '',
  turnHint: '',
  pages: [
    { id: 'b', n: 2, day: 3, title: 'B', blocks: [{ t: 'p', text: 'x' }] },
    { id: 'a', n: 1, day: 1, title: 'A', blocks: [{ t: 'num', items: ['one', { text: 'later', day: 4 }] }] },
    { id: 'c', n: 1.5, day: 1, title: 'C', blocks: [{ t: 'no', items: [{ text: 'later', day: 5 }] }] },
  ],
};

describe('bookletPages', () => {
  it('shows only pages pasted in by the day, in page order', () => {
    expect(bookletPages(1, src).map((p) => p.id)).toEqual(['a', 'c']);
    expect(bookletPages(3, src).map((p) => p.id)).toEqual(['a', 'c', 'b']);
  });
  it('drops lines and empty lists that belong to a later day', () => {
    const [a, c] = bookletPages(1, src) as [BookletPage, BookletPage];
    expect(a.blocks[0]).toEqual({ t: 'num', items: ['one'] });
    expect(c.blocks).toEqual([]);
    const a4 = bookletPages(4, src)[0]!;
    expect((a4.blocks[0] as { items: unknown[] }).items.map((i) => itemText(i as string))).toEqual(['one', 'later']);
  });
});
