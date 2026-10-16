import { booklet, bookletPages, itemText, sampleCards } from '../../content/booklet';
import type { Booklet, BookletPage } from '../../content/types';

const src: Booklet = {
  cards: [],
  reasonSlip: { title: '', hint: '' },
  reasons: [],
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

describe('reasons', () => {
  it('names what the clerk saw, in plain words', () => {
    expect(booklet.reasons.map((r) => r.id)).toEqual(['askeri', 'bozgun', 'moral', 'sahte', 'gizli', 'damga', 'pul']);
    for (const r of booklet.reasons) {
      expect(r.label.length).toBeGreaterThan(3);
      expect(r.detail.length).toBeGreaterThan(r.label.length);
    }
  });
  it('does not tell the clerk to hold a letter', () => {
    const help = require('../../../content/help.json') as { sheets: { lines: string[] }[] };
    const said = JSON.stringify(help.sheets) + JSON.stringify(booklet.pages);
    expect(said).not.toContain('BEKLET');
  });
});

describe('sampleCards', () => {
  it('copies the seals of the page it names', () => {
    const [card] = sampleCards(1, booklet);
    expect(card?.seals.length).toBeGreaterThan(0);
  });
});
