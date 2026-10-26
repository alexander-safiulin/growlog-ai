import fs from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const enPath = path.join(root, 'lib/nutrient/help/locales/en.json');
const mapsDir = path.join(root, 'lib/nutrient/help/i18n/maps');
const LOCALE_CODES = ['fr', 'de', 'es', 'it', 'th', 'vi'];

const SKIP_TRANSLATE_KEYS = new Set([
  'id',
  'type',
  'exampleId',
  'href',
  'latex',
  'level',
  'ordered',
  'display',
]);

/**
 * @param {unknown} value
 * @param {Record<string, string>} map
 * @param {string} locale
 * @param {string | undefined} key
 */
function walk(value, map, locale, key) {
  if (typeof value === 'string') {
    if (key && SKIP_TRANSLATE_KEYS.has(key)) return value;
    const translated = map[value];
    if (translated === undefined) {
      console.warn(`[${locale}] missing map entry: ${value.slice(0, 80)}…`);
      return value;
    }
    return translated;
  }
  if (Array.isArray(value)) {
    return value.map((item) => walk(item, map, locale, undefined));
  }
  if (value !== null && typeof value === 'object') {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'contextMap') {
        out[k] = v;
        continue;
      }
      if (k === 'locale') {
        out[k] = locale;
        continue;
      }
      out[k] = walk(v, map, locale, k);
    }
    return out;
  }
  return value;
}

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

for (const code of LOCALE_CODES) {
  const mapPath = path.join(mapsDir, `${code}.json`);
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const out = walk(en, map, code, undefined);
  out.locale = code;
  const outPath = path.join(root, 'lib/nutrient/help/locales', `${code}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
}

console.log('Wrote help locales:', LOCALE_CODES.join(', '));
