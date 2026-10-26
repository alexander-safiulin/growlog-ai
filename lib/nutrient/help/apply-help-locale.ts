import type { NutrientHelpLocaleContent } from './types';

const SKIP_TRANSLATE_KEYS = new Set([
  'id',
  'type',
  'exampleId',
  'href',
  'latex',
  'level',
  'ordered',
  'display',
  'contextMap',
]);

export function applyHelpStringMap(
  source: NutrientHelpLocaleContent,
  locale: string,
  map: Record<string, string>,
): NutrientHelpLocaleContent {
  const walk = (value: unknown, key?: string): unknown => {
    if (typeof value === 'string') {
      if (key && SKIP_TRANSLATE_KEYS.has(key)) return value;
      return map[value] ?? value;
    }
    if (Array.isArray(value)) return value.map((item) => walk(item));
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        if (k === 'locale') {
          out[k] = locale;
          continue;
        }
        out[k] = walk(v, k);
      }
      return out;
    }
    return value;
  };

  return walk(source) as NutrientHelpLocaleContent;
}
