/** Choosing the day's side letters: pure, so a seed always gives the same desk. */

const RUMI_MONTHS = ['Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Teşrinievvel', 'Teşrinisani', 'Kânunuevvel', 'Kânunusani', 'Şubat'];

/** "5 Mayıs 1331" → a sortable number; months run Mart…Şubat as the Rumi year does. */
export function rumiOrdinal(date: string): number {
  const [d, m, y] = date.trim().split(/\s+/);
  const month = RUMI_MONTHS.indexOf(m ?? '');
  if (!d || month < 0 || !y) return Number.NaN;
  return Number(y) * 400 + month * 32 + Number(d);
}

/** Small deterministic generator (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Candidate {
  id: string;
  date: string;
}

/** Up to `count` letters written on or before the day, not seen before. */
export function pickSideLetters(pool: Candidate[], dayRumi: string, count: number, seed: number, seen: ReadonlySet<string> = new Set()): string[] {
  const today = rumiOrdinal(dayRumi);
  const fits = pool.filter((c) => !seen.has(c.id) && rumiOrdinal(c.date) <= today);
  const rand = rng(seed);
  const picked: string[] = [];
  while (picked.length < count && fits.length) {
    picked.push(fits.splice(Math.floor(rand() * fits.length), 1)[0]!.id);
  }
  return picked;
}

/**
 * The day's first two authored letters stay on top, so the pile opens on the story
 * and not on a stranger. Side letters slip in under them; authored order is kept.
 */
export function mixIntoStack(authored: string[], side: string[], seed: number): string[] {
  const rand = rng(seed ^ 0x9e3779b9);
  const out = [...authored];
  const head = Math.min(2, out.length);
  for (const id of side) out.splice(head + Math.floor(rand() * (out.length - head + 1)), 0, id);
  return out;
}
