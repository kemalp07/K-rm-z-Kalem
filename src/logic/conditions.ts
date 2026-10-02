import type { Condition } from '../content/types';

export function matches(cond: Condition | undefined, flags: ReadonlySet<string>): boolean {
  if (!cond) return true;
  if (cond.all && !cond.all.every((f) => flags.has(f))) return false;
  if (cond.any && cond.any.length > 0 && !cond.any.some((f) => flags.has(f))) return false;
  if (cond.none && cond.none.some((f) => flags.has(f))) return false;
  return true;
}
