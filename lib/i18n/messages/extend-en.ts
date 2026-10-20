import type { Messages } from '@/lib/i18n/types';
import { en } from './en';

/** Deep-clone English messages and apply shallow section overrides. */
export function extendEn(overrides: Partial<Messages>): Messages {
  const base = JSON.parse(JSON.stringify(en)) as Messages;
  for (const key of Object.keys(overrides) as (keyof Messages)[]) {
    const val = overrides[key];
    if (val == null) continue;
    if (typeof val === 'object' && typeof base[key] === 'object' && !Array.isArray(val)) {
      Object.assign(base[key] as Record<string, string>, val as Record<string, string>);
    } else {
      (base as Record<string, unknown>)[key as string] = val;
    }
  }
  return base;
}
