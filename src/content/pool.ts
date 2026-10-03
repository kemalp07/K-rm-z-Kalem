import poolJson from '../../content/pool_letters.json';
import { t } from './strings';
import type { Hand, Letter, Outcome, Segment } from './types';

/**
 * Side letters: one-off letters from tools/letter-gen, a few mixed into each day.
 * The generator's record is turned into the game's Letter here, so the content file
 * can be regenerated without touching the game.
 */

interface PoolPerson {
  name: string;
  epithet?: string;
  rank?: string;
  relation?: string;
  location?: string;
  hometown?: string;
  gender?: string | null;
  age?: number | null;
}

interface PoolRecord {
  id: string;
  direction: 'cepheden' | 'cepheye';
  date: string;
  sender: PoolPerson;
  recipient: PoolPerson;
  hand: Hand;
  header: { text: string; sensitive: boolean };
  salutation: string;
  segments: { id: string; text: string; kind: 'normal' | 'sensitive'; para?: number }[];
  closing: string;
  signature: { text: string; seal?: string };
  note: { text: string; sensitive: boolean } | null;
  envelope: { text: string; sensitive: boolean };
}

const cap = (s: string) => (s ? s[0]!.toLocaleUpperCase('tr') + s.slice(1) : s);

function personName(p: PoolPerson): string {
  if (p.rank) return `${cap(p.rank)} ${p.name}`;
  if (p.gender === 'kadın' && (p.age ?? 20) >= 16) return t('pool.woman', { name: p.name });
  return p.name;
}

/** "Sivas, Hafik kazası, Kızılca karyesi" → "Sivas, Hafik kazası": what fits under the name. */
const shortPlace = (place: string) => place.split(',').slice(0, 2).join(',').trim();

/** The writer's sentences, joined back into paragraphs; anything to censor stays its own block. */
function segmentsOf(r: PoolRecord): Segment[] {
  const out: Segment[] = [];
  let para: number | undefined;
  for (const s of r.segments) {
    const last = out[out.length - 1];
    if (s.kind === 'normal' && last && last.kind === 'normal' && s.para === para) {
      last.text += ` ${s.text}`;
    } else {
      out.push({ id: '', text: s.text, kind: s.kind });
    }
    para = s.para;
  }
  out.push({ id: '', text: r.closing, kind: 'normal' });
  if (r.note) out.push({ id: '', text: t('pool.note', { text: r.note.text }), kind: r.note.sensitive ? 'sensitive' : 'normal' });
  return out.map((s, i) => ({ ...s, id: `s${i + 1}` }));
}

function outcomesOf(id: string, sender: string, recipient: string, hasSensitive: boolean): Outcome[] {
  const o: Outcome[] = [
    { when: { all: [`${id}:reported`] }, text: t('pool.outcome.reported', { sender }) },
    { when: { all: [`${id}:stopped`] }, text: t('pool.outcome.stopped', { recipient }) },
    { when: { all: [`${id}:held`] }, text: t('pool.outcome.held') },
    { when: { all: [`${id}:delivered`, `${id}:censored`] }, text: t('pool.outcome.deliveredCensored', { recipient }) },
  ];
  if (hasSensitive) o.push({ when: { all: [`${id}:delivered`] }, text: t('pool.outcome.deliveredLeak') });
  o.push({ text: t('pool.outcome.delivered', { recipient }) });
  return o;
}

export function toLetter(r: PoolRecord): Letter {
  const fromFront = r.direction === 'cepheden';
  const sender = personName(r.sender);
  const recipient = personName(r.recipient);
  const segments = segmentsOf(r);
  const sig = r.signature.text || (r.signature.seal ? t('pool.seal', { name: r.signature.seal }) : '');
  return {
    id: r.id,
    threadId: 'pool',
    day: 0,
    sender,
    recipient,
    from: fromFront ? t('pool.from.front') : shortPlace(`${r.sender.hometown ?? ''}`),
    to: fromFront ? shortPlace(r.recipient.location ?? '') : t('pool.to.front'),
    direction: r.direction,
    kind: 'mektup',
    // A place slipped into the header can't be censored there; the date alone is safe.
    dateLine: r.header.sensitive ? r.date : r.header.text,
    heading: r.salutation,
    hand: r.hand,
    segments,
    signature: sig,
    // Side letters are judged loosely: anything sensitive in them may be called any of these.
    reasons: segments.some((s) => s.kind === 'sensitive') ? ['askeri', 'bozgun', 'moral'] : [],
    outcomes: outcomesOf(r.id, sender, recipient, segments.some((s) => s.kind === 'sensitive')),
    meta: { pool: true, date: r.date },
  };
}

export const poolLetters: Letter[] = (poolJson.letters as PoolRecord[]).map(toLetter);
const byId = new Map(poolLetters.map((l) => [l.id, l]));

export const getPoolLetter = (id: string): Letter | undefined => byId.get(id);
