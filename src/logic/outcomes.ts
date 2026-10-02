import type { Letter } from '../content/types';
import { matches } from './conditions';

export function pickOutcome(letter: Letter, flags: ReadonlySet<string>): string {
  return letter.outcomes.find((o) => matches(o.when, flags))?.text ?? '';
}
