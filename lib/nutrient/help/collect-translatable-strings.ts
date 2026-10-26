const SKIP_TRANSLATE_KEYS = new Set([
  'id',
  'type',
  'exampleId',
  'href',
  'latex',
  'level',
  'ordered',
  'display',
  'locale',
]);

/** All user-facing strings in a help locale JSON (including list items). */
export function collectTranslatableHelpStrings(node: unknown, key?: string): string[] {
  if (typeof node === 'string') {
    if (key && SKIP_TRANSLATE_KEYS.has(key)) return [];
    return [node];
  }
  if (Array.isArray(node)) return node.flatMap((item) => collectTranslatableHelpStrings(item));
  if (node !== null && typeof node === 'object') {
    const out: string[] = [];
    for (const [k, v] of Object.entries(node)) {
      if (k === 'contextMap') continue;
      out.push(...collectTranslatableHelpStrings(v, k));
    }
    return out;
  }
  return [];
}

export function isLikelyLatex(text: string): boolean {
  return text.includes('\\text') || text.includes('\\frac') || text.includes('\\approx');
}
