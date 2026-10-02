import tr from '../../content/strings/tr.json';

export type StringKey = keyof typeof tr;

const table: Record<string, string> = tr;

/** All player-facing UI text goes through here. `{name}` placeholders are filled from vars. */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  const raw = table[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}
