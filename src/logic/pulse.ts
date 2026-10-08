import { spreadFor } from '../content/booklet';
import { t, type StringKey } from '../content/strings';
import type { BookletPage, InspectTarget, Letter } from '../content/types';
import { judge } from './account';
import type { LetterProgress } from './flags';

const SPY_THREAD = 'imzasiz_halil';

const TARGETS = ['seal', 'date', 'postmark', 'stamp'] as const;
type MarkTargetName = (typeof TARGETS)[number];

const isTarget = (s: string): s is MarkTargetName => (TARGETS as readonly string[]).includes(s);

const TARGET_KEY: Record<MarkTargetName, StringKey> = {
  seal: 'target.seal',
  date: 'target.date',
  postmark: 'target.postmark',
  stamp: 'target.stamp',
};

/** Booklet page that explains a place on the paper. */
const PAGE: Record<MarkTargetName, string> = {
  seal: 'muhurler',
  date: 'takvim',
  postmark: 'damgalar',
  stamp: 'pullar',
};

const LESSON_KEY: Record<MarkTargetName, StringKey> = {
  seal: 'lesson.seal',
  date: 'lesson.date',
  postmark: 'lesson.postmark',
  stamp: 'lesson.stamp',
};

export interface Pin {
  id: string;
  who: string;
  target: MarkTargetName;
  wrong: boolean;
}

/** Ringed places, oldest first, so the string fills as the clerk works. */
export function pinsOf(letters: Record<string, LetterProgress>, letterOf: (id: string) => Letter | undefined): Pin[] {
  const out: Pin[] = [];
  for (const [id, p] of Object.entries(letters)) {
    const letter = letterOf(id);
    if (!letter) continue;
    const who = letter.sender.split(' ').slice(-1)[0] ?? letter.sender;
    for (const target of p.marked ?? []) if (isTarget(target)) out.push({ id: `${id}:${target}`, who, target, wrong: false });
    for (const target of p.wrongMarked ?? []) if (isTarget(target)) out.push({ id: `${id}:x:${target}`, who, target, wrong: true });
  }
  return out;
}

/** Spy letters handed to the Şube for a reason the letter actually bears. */
export function dossierCount(letters: Record<string, LetterProgress>, letterOf: (id: string) => Letter | undefined): number {
  let n = 0;
  for (const [id, p] of Object.entries(letters)) {
    const letter = letterOf(id);
    if (letter?.threadId === SPY_THREAD && judge(letter, p).includes('spyCaught')) n++;
  }
  return n;
}

export interface MorningAsides {
  /** Extra lines on the director's note: the file, and a first miss that was not a warning. */
  mudur: string[];
  /** One sentence from home about the same day, when the house has something to say. */
  family: string | null;
}

/** What the two morning voices add, from yesterday's events. */
export function morningAsides(day: number, events: readonly string[], dossier: number): MorningAsides {
  const prev = day - 1;
  const has = (k: string) => events.includes(`d${prev}:${k}`);
  const mudur: string[] = [];
  if (dossier > 0) mudur.push(t('voice.file', { n: dossier }));
  if (has('lesson')) mudur.push(t('voice.lesson'));
  let family: string | null = null;
  if (prev >= 1) {
    if (has('warned') || has('lesson')) family = t('voice.family.warned');
    else if (has('rewarded')) family = t('voice.family.rewarded');
    else if (has('docked')) family = t('voice.family.docked');
  }
  return { mudur, family };
}

export interface Lesson {
  pageId: string;
  text: string;
}

/**
 * The one thing the ledger should teach before the book is closed.
 * A forgery let through comes first, then a ring around something that was sound,
 * then a line that should have been blacked out.
 */
export function lessonOf(decided: { letter: Letter; p: LetterProgress }[]): Lesson | null {
  for (const { letter, p } of decided) {
    if (!judge(letter, p).includes('forgeryMissed')) continue;
    const target = (letter.inspectables?.find((i) => i.anomaly)?.target ?? 'seal') as InspectTarget;
    const key = isTarget(target) ? target : 'seal';
    return { pageId: PAGE[key], text: t(LESSON_KEY[key]) };
  }
  for (const { letter, p } of decided) {
    const wrong = (p.wrongMarked ?? []).find(isTarget);
    if (!wrong) continue;
    return { pageId: PAGE[wrong], text: t('lesson.wrong', { what: t(TARGET_KEY[wrong]) }) };
  }
  for (const { letter, p } of decided) {
    const kinds = judge(letter, p);
    if (kinds.includes('sensitiveMissed')) return { pageId: 'malumat', text: t('lesson.sensitive') };
    if (kinds.includes('inkMissed')) return { pageId: 'umumi', text: t('lesson.ink') };
  }
  return null;
}

/** Spread index for a lesson, or the cover when that page is not pasted in yet. */
export function lessonSpread(pages: BookletPage[], pageId: string): number {
  return pages.some((p) => p.id === pageId) ? spreadFor(pages, pageId) : 0;
}

export const pinLabel = (pin: Pin) => `${pin.who} · ${t(TARGET_KEY[pin.target])}`;
