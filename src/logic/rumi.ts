// Rumi (Ottoman fiscal) calendar arithmetic, enough for posting dates in 1331.

export const RUMI_MONTHS = ['Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Teşrinievvel', 'Teşrinisani', 'Kânunuevvel', 'Kânunusani', 'Şubat'];
const LENGTHS = [31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28];

export interface RumiDate {
  day: number;
  /** 0 = Mart */
  month: number;
  year: number;
}

/** The last "12 Mayıs 1331" (or "12 Mayıs 331") in a text; a header may lead with a place. */
export function parseRumi(text: string | undefined): RumiDate | null {
  if (!text) return null;
  const m = text.match(/(\d{1,2})\s+(\S+)\s+(1?3\d\d)\s*$/);
  if (!m) return null;
  // Stamps print the month in capitals.
  const name = m[2]!.toLocaleLowerCase('tr');
  const month = RUMI_MONTHS.findIndex((x) => x.toLocaleLowerCase('tr') === name);
  if (month < 0) return null;
  const y = Number(m[3]);
  return { day: Number(m[1]), month, year: y < 1000 ? y + 1000 : y };
}

/** Days since 1 Mart of year 0; only differences matter. */
export function toDays(d: RumiDate): number {
  let n = d.year * 365;
  for (let i = 0; i < d.month; i++) n += LENGTHS[i]!;
  return n + d.day - 1;
}

export function fromDays(n: number): RumiDate {
  const year = Math.floor(n / 365);
  let rest = n - year * 365;
  let month = 0;
  while (rest >= LENGTHS[month]!) rest -= LENGTHS[month++]!;
  return { day: rest + 1, month, year };
}

/** As a rubber stamp carries it: "3 MAYIS 331". */
export const stampText = (d: RumiDate) => `${d.day} ${RUMI_MONTHS[d.month]!.toLocaleUpperCase('tr')} ${d.year - 1000}`;
