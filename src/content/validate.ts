import type { Day, Letter, Thread, VariantOp } from './types';

/** Returns human-readable problems; an empty list means the content is sound. */
export function validateDay(day: Day, threads: Thread[]): string[] {
  const problems: string[] = [];
  const threadIds = new Set(threads.map((t) => t.id));
  const letterIds = new Set<string>();

  for (const letter of day.letters) {
    const where = `letter ${letter.id}`;
    if (letterIds.has(letter.id)) problems.push(`${where}: duplicate id`);
    letterIds.add(letter.id);

    if (!threadIds.has(letter.threadId)) problems.push(`${where}: unknown thread ${letter.threadId}`);
    if (letter.day !== day.day) problems.push(`${where}: day ${letter.day} inside day ${day.day}`);
    if (letter.kind === 'paket' && !letter.items?.length) problems.push(`${where}: package without items`);
    if (letter.outcomes.length === 0) problems.push(`${where}: no outcomes`);
    if (letter.outcomes.at(-1)?.when) problems.push(`${where}: last outcome should be unconditional`);

    for (const insp of letter.inspectables ?? []) {
      if (insp.target === 'date' && !letter.dateLine) problems.push(`${where}: date inspectable without dateLine`);
      if (insp.target === 'seal' && !letter.seal) problems.push(`${where}: seal inspectable without seal`);
    }

    problems.push(...validateSegments(letter, where));
  }
  return problems;
}

function validateSegments(letter: Letter, where: string): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const seg of letter.segments) {
    if (ids.has(seg.id)) problems.push(`${where}: duplicate segment ${seg.id}`);
    ids.add(seg.id);
    if (seg.kind === 'hiddenInk' && !seg.revealBy) problems.push(`${where}: hidden ${seg.id} has no revealBy`);
    if (!seg.text.trim()) problems.push(`${where}: empty segment ${seg.id}`);
  }
  for (const variant of letter.variants ?? []) {
    for (const op of variant.ops) {
      if (!ids.has(op.target)) problems.push(`${where}: variant ${variant.id} targets missing ${op.target}`);
      const added = addedSegmentId(op);
      if (added && ids.has(added) && op.op !== 'replace') {
        problems.push(`${where}: variant ${variant.id} reuses segment id ${added}`);
      }
    }
  }
  return problems;
}

function addedSegmentId(op: VariantOp): string | undefined {
  return op.op === 'remove' ? undefined : op.segment.id;
}
