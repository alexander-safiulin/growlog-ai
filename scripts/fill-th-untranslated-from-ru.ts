/**
 * For keys still identical to German de, copy Russian ru strings as a structural
 * placeholder — then replace Cyrillic with Thai in th.ts (manual / follow-up).
 * This script is for diagnostics only; do not run in CI.
 */
import { messagesByLocale } from '../lib/i18n/messages';

function flat(obj: unknown, p = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flat(v, key));
    else if (typeof v === 'string') out[key] = v;
  }
  return out;
}

const deF = flat(messagesByLocale.de);
const thF = flat(messagesByLocale.th);
const ruF = flat(messagesByLocale.ru);
let sameDe = 0;
for (const k of Object.keys(deF)) {
  if (thF[k] === deF[k]) sameDe++;
}
console.log('th keys still identical to de:', sameDe, '/', Object.keys(deF).length);
