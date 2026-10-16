import type { DayState } from './dayFlow';

/** The first morning's voice. Each step waits until the clerk has done it. */
export type GuideStep = 'pile' | 'pen' | 'glass' | 'stamp';

type Taught = { segments: { id: string; kind: string }[] } | undefined;

/**
 * Day 1 only, and only until the first letter is decided.
 * The pen step is the open letter's sensitive lines; a letter with none goes on to the glass.
 */
export function guideStep(s: DayState, letterOf: (id: string) => Taught): GuideStep | null {
  if (s.day !== 1 || s.phase !== 'desk' || !s.morningDone) return null;
  if (s.done.length > 0) return null;
  if (!s.open) return 'pile';
  const letter = letterOf(s.open);
  const prog = s.letters[s.open];
  const sensitive = letter?.segments.filter((seg) => seg.kind === 'sensitive').map((seg) => seg.id) ?? [];
  const censored = new Set(prog?.censored ?? []);
  if (sensitive.some((id) => !censored.has(id))) return 'pen';
  const rang = (prog?.marked?.length ?? 0) + (prog?.wrongMarked?.length ?? 0) > 0;
  if (!rang) return 'glass';
  return 'stamp';
}
