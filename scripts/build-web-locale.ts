/**
 * Full web Messages for th|vi from EN + web-ui cache (non-nutrient). Nutrient block kept from current locale.
 * Usage: npx tsx scripts/build-web-locale.ts th|vi
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Locale } from '../lib/i18n/locales';
import { messagesByLocale } from '../lib/i18n/messages';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '../lib/i18n/web-ui/cache');

type StringTree = Record<string, unknown>;

function flat(obj: unknown, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else if (v && typeof v === 'object') Object.assign(out, flat(v, key));
  }
  return out;
}

function setByDotKey(obj: StringTree, dotKey: string, value: string) {
  const parts = dotKey.split('.').filter(Boolean);
  let cur: StringTree = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]!;
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p] as StringTree;
  }
  cur[parts[parts.length - 1]!] = value;
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function escapeStr(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function emitValue(v: unknown, indent: number): string {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const pad = '  '.repeat(indent);
    const padIn = '  '.repeat(indent + 1);
    const lines = [`${pad}{`];
    for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
      const key = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k) ? k : JSON.stringify(k);
      lines.push(`${padIn}${key}: ${emitValue(child, indent + 1)},`);
    }
    lines.push(`${pad}}`);
    return lines.join('\n');
  }
  if (typeof v === 'string') {
    if (v.includes('\n')) return JSON.stringify(v);
    if (v.includes('"') && !v.includes("'")) return `'${escapeStr(v)}'`;
    return JSON.stringify(v);
  }
  return JSON.stringify(v);
}

function keepEnglish(s: string): boolean {
  if (s.length <= 2) return true;
  if (/^(SOP|EC|pH|VPD|AI|Whisper|JSON|Zigbee|Home|Growlog)/.test(s)) return false;
  if (/^Growlog • OG Lab$/.test(s)) return true;
  return false;
}

function main() {
  const locale = process.argv[2] as 'th' | 'vi';
  if (locale !== 'th' && locale !== 'vi') {
    console.error('usage: build-web-locale.ts th|vi');
    process.exit(1);
  }

  const cachePath = path.join(CACHE_DIR, `en-${locale}.json`);
  if (!fs.existsSync(cachePath)) {
    console.error('Missing cache:', cachePath);
    process.exit(1);
  }
  const cache: Record<string, string> = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

  const en = deepClone(messagesByLocale.en) as StringTree;
  const cur = messagesByLocale[locale] as StringTree;
  const enFlat = flat(en);
  const curFlat = flat(cur);

  for (const [key, enVal] of Object.entries(enFlat)) {
    if (key.startsWith('nutrient.')) continue;
    const existing = curFlat[key];
    if (existing && existing !== enVal) {
      setByDotKey(en, key, existing);
      continue;
    }
    const translated = cache[enVal];
    if (translated) setByDotKey(en, key, translated);
    else if (!keepEnglish(enVal) && existing) setByDotKey(en, key, existing);
  }

  en.nutrient = deepClone(cur.nutrient);

  const outPath = path.join(__dirname, `../lib/i18n/messages/${locale}.ts`);
  const body = emitValue(en, 1);
  fs.writeFileSync(
    outPath,
    `import type { Messages } from '@/lib/i18n/types';

export const ${locale}: Messages = ${body};
`,
  );
  console.log('Wrote full web catalog', outPath);
}

main();
