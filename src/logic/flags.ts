import type { Decision } from '../content/types';

/** Everything the player did to one letter. Serialisable, kept in the save. */
export interface LetterProgress {
  opened: boolean;
  censored: string[];
  revealed: string[];
  inspected: string[];
  decision?: Decision;
}

export const emptyProgress = (): LetterProgress => ({
  opened: false,
  censored: [],
  revealed: [],
  inspected: [],
});

export const flag = {
  decision: (letterId: string, d: Decision) => `${letterId}:${d}`,
  censoredAny: (letterId: string) => `${letterId}:censored`,
  censored: (letterId: string, segId: string) => `${letterId}:censored:${segId}`,
  revealed: (letterId: string, segId: string) => `${letterId}:revealed:${segId}`,
  inspected: (letterId: string, inspId: string) => `${letterId}:inspected:${inspId}`,
};

/** Flags only exist once a decision is stamped; half-read letters leave no trace. */
export function flagsForLetter(letterId: string, p: LetterProgress): string[] {
  if (!p.decision) return [];
  const out = [flag.decision(letterId, p.decision)];
  if (p.censored.length) out.push(flag.censoredAny(letterId));
  for (const s of p.censored) out.push(flag.censored(letterId, s));
  for (const s of p.revealed) out.push(flag.revealed(letterId, s));
  for (const i of p.inspected) out.push(flag.inspected(letterId, i));
  return out;
}

export function collectFlags(letters: Record<string, LetterProgress>): Set<string> {
  const set = new Set<string>();
  for (const [id, p] of Object.entries(letters)) for (const f of flagsForLetter(id, p)) set.add(f);
  return set;
}
