import type { Decision, Direction } from '../content/types';
import { t, type StringKey } from '../content/strings';

/** Who is standing at the counter. Drawn, not photographed. */
export type FaceKind = 'nefer' | 'efendi' | 'kadin' | 'subay';

export interface CallerLetter {
  id: string;
  sender: string;
  recipient: string;
  from: string;
  direction: Direction;
}

export interface CallerScript {
  face: FaceKind;
  /** 0..1, stable per letter: moustache, tilt, which coat. */
  salt: number;
  moustache: boolean;
  /** Two short lines: who the paper is, then one thing they add. */
  arrive: string;
  leave: Record<Decision, string>;
}

const COURIER_ASIDES = [
  'caller.courier.0',
  'caller.courier.1',
  'caller.courier.2',
  'caller.courier.3',
  'caller.courier.4',
  'caller.courier.5',
] as const satisfies readonly StringKey[];

const SENDER_ASIDES = [
  'caller.sender.0',
  'caller.sender.1',
  'caller.sender.2',
  'caller.sender.3',
  'caller.sender.4',
  'caller.sender.5',
] as const satisfies readonly StringKey[];

const LEAVE = {
  delivered: ['caller.leave.delivered.0', 'caller.leave.delivered.1', 'caller.leave.delivered.2'],
  held: ['caller.leave.held.0', 'caller.leave.held.1', 'caller.leave.held.2'],
  stopped: ['caller.leave.stopped.0', 'caller.leave.stopped.1', 'caller.leave.stopped.2'],
  reported: ['caller.leave.reported.0', 'caller.leave.reported.1', 'caller.leave.reported.2'],
} as const satisfies Record<Decision, readonly StringKey[]>;

function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(list: readonly T[], h: number): T {
  return list[h % list.length]!;
}

/** "Levazım Kâtibi Halil Efendi" → "Halil Efendi". Two words already fit a spoken line. */
function shortWho(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name.trim();
  return parts.slice(-2).join(' ');
}

/** The place a person would actually say: the last thing written on the envelope. */
function shortPlace(from: string): string {
  const parts = from.split(',').map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || from;
}

function isWoman(name: string): boolean {
  return /Hanım/.test(name) || /(^|\s)Saadet(\s|$)/.test(name);
}

function senderFace(name: string, h: number): FaceKind {
  if (isWoman(name)) return 'kadin';
  if (/Paşa|Binbaşı|Yüzbaşı|Mülazım|Miralay|Teğmen|Üsteğmen/.test(name)) return 'subay';
  if (/Onbaşı|Çavuş|Nefer|(^|\s)Er(\s|$)/.test(name)) return 'nefer';
  if (/Efendi|Bey|Hoca|İmam|Ağa|Kâtip|Katip|Bakkal/.test(name)) return 'efendi';
  return h % 2 === 0 ? 'efendi' : 'nefer';
}

/** Front mail is carried in. The same coat, not the same man. */
function courierFace(h: number): FaceKind {
  const r = h % 8;
  if (r === 0) return 'kadin';
  if (r === 1) return 'efendi';
  if (r === 2) return 'subay';
  return 'nefer';
}

/**
 * Someone steps up with this letter.
 * From the front, a courier announces it. To the front, the sender brought it themselves,
 * unless nobody signed: then it is just another hand at the hatch.
 */
export function callerScript(letter: CallerLetter): CallerScript {
  const h = hash(letter.id);
  const unsigned = letter.sender.trim() === 'İmzasız';
  const courier = letter.direction === 'cepheden' || unsigned;
  const face = courier ? courierFace(h) : senderFace(letter.sender, h);
  const aside = t(pick(courier ? COURIER_ASIDES : SENDER_ASIDES, h >>> 3));
  const head = unsigned
    ? t('caller.unsigned')
    : courier
      ? t('caller.courier', { place: shortPlace(letter.from), who: shortWho(letter.recipient) })
      : t('caller.sender', { who: shortWho(letter.sender) });
  const leave = {
    delivered: t(pick(LEAVE.delivered, h >>> 5)),
    held: t(pick(LEAVE.held, h >>> 7)),
    stopped: t(pick(LEAVE.stopped, h >>> 11)),
    reported: t(pick(LEAVE.reported, h >>> 13)),
  };
  return {
    face,
    salt: (h % 1000) / 1000,
    moustache: face === 'subay' || (face !== 'kadin' && h % 3 !== 0),
    arrive: `${head}\n${aside}`,
    leave,
  };
}
