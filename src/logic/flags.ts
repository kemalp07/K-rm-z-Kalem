import type { Decision } from '../content/types';

/** Everything the player did to one letter. Serialisable, kept in the save. */
export interface LetterProgress {
  opened: boolean;
  censored: string[];
  revealed: string[];
  inspected: string[];
  /** Places ringed in red pencil that are really wrong (seal, date…). */
  marked?: string[];
  /** Places ringed that were in order: the ledger says so. */
  wrongMarked?: string[];
  /** Held over a night at least once; it came back the next morning. */
  wasHeld?: boolean;
  /** Why it was stopped or reported, ticked on the reason slip. */
  reason?: string;
  decision?: Decision;
}

export const emptyProgress = (): LetterProgress => ({
  opened: false,
  censored: [],
  revealed: [],
  inspected: [],
  marked: [],
  wrongMarked: [],
});

export const flag = {
  decision: (letterId: string, d: Decision) => `${letterId}:${d}`,
  censoredAny: (letterId: string) => `${letterId}:censored`,
  censored: (letterId: string, segId: string) => `${letterId}:censored:${segId}`,
  revealed: (letterId: string, segId: string) => `${letterId}:revealed:${segId}`,
  inspected: (letterId: string, inspId: string) => `${letterId}:inspected:${inspId}`,
  marked: (letterId: string, target: string) => `${letterId}:marked:${target}`,
  wrongMarked: (letterId: string, target: string) => `${letterId}:wrongmark:${target}`,
  reason: (letterId: string, r: string) => `${letterId}:reason:${r}`,
};

/** Flags only exist once a decision is stamped; half-read letters leave no trace. */
export function flagsForLetter(letterId: string, p: LetterProgress): string[] {
  // A letter held and not yet decided again only remembers that it was held.
  if (!p.decision) return p.wasHeld ? [flag.decision(letterId, 'held')] : [];
  const out = [flag.decision(letterId, p.decision)];
  if (p.wasHeld && p.decision !== 'held') out.push(flag.decision(letterId, 'held'));
  if (p.censored.length) out.push(flag.censoredAny(letterId));
  for (const s of p.censored) out.push(flag.censored(letterId, s));
  for (const s of p.revealed) out.push(flag.revealed(letterId, s));
  for (const i of p.inspected) out.push(flag.inspected(letterId, i));
  for (const m of p.marked ?? []) out.push(flag.marked(letterId, m));
  for (const m of p.wrongMarked ?? []) out.push(flag.wrongMarked(letterId, m));
  if (p.reason) out.push(flag.reason(letterId, p.reason));
  return out;
}

export function collectFlags(letters: Record<string, LetterProgress>): Set<string> {
  const set = new Set<string>();
  for (const [id, p] of Object.entries(letters)) for (const f of flagsForLetter(id, p)) set.add(f);
  return set;
}
