/**
 * Build or patch a web Messages locale via gap-fill translation (English source strings).
 * Usage: npx tsx scripts/fill-locale-from-de.ts <locale> [--full]
 *   --full: translate entire en catalog (minus unchanged product tokens)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import type { Locale } from '../lib/i18n/locales';
import { messagesByLocale } from '../lib/i18n/messages';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGET_MAP: Partial<Record<Locale, string>> = {
  it: 'it',
  fr: 'fr',
  es: 'es',
  th: 'th',
  vi: 'vi',
};

type StringTree = { [key: string]: string | StringTree };

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

function deepMerge(target: StringTree, source: StringTree) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      deepMerge(target[k] as StringTree, v as StringTree);
    } else if (typeof v === 'string') target[k] = v;
  }
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

function looksWrongLanguage(curVal: string, locale: Locale): boolean {
  if (/[\u0400-\u04FF]/.test(curVal)) return true;
  if (/[äöüßÄÖÜ]/.test(curVal) && locale !== 'de') return true;
  if (locale === 'it' && /\b(Chargement|Enregistrer|Thème|Une |Aucun |pour le)\b/.test(curVal)) return true;
  return false;
}

function shouldTranslateKey(
  key: string,
  enVal: string,
  curVal: string | undefined,
  full: boolean,
  locale: Locale,
): boolean {
  if (full) return enVal.length > 0;
  if (curVal === undefined) return true;
  if (curVal === enVal && enVal.length > 3) return true;
  if (curVal && looksWrongLanguage(curVal, locale)) return true;
  return false;
}

async function main() {
  const locale = process.argv[2] as Locale;
  const full = process.argv.includes('--full');
  const googleTarget = TARGET_MAP[locale];
  if (!locale || !googleTarget) {
    console.error('Supported: it, fr, es, th, vi');
    process.exit(1);
  }

  const en = messagesByLocale.en as unknown as StringTree;
  const current = deepClone(messagesByLocale[locale] ?? en) as StringTree;

  const enFlat = flat(en);
  const curFlat = flat(current);

  const keysToFill: string[] = [];
  const sourceStrings: string[] = [];
  const sourceIndex = new Map<string, number>();

  for (const [key, enVal] of Object.entries(enFlat)) {
    const curVal = curFlat[key];
    if (!shouldTranslateKey(key, enVal, curVal, full, locale)) continue;
    let idx = sourceIndex.get(enVal);
    if (idx === undefined) {
      idx = sourceStrings.length;
      sourceStrings.push(enVal);
      sourceIndex.set(enVal, idx);
    }
    keysToFill.push(key);
  }

  const offsetArg = process.argv.find((a) => a.startsWith('--offset='));
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const offset = offsetArg ? parseInt(offsetArg.split('=')[1] ?? '0', 10) : 0;
  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '99999', 10) : sourceStrings.length;
  const slice = sourceStrings.slice(offset, offset + limit);
  const sliceKeySet = new Set(
    keysToFill.filter((key) => {
      const enVal = enFlat[key]!;
      const idx = sourceIndex.get(enVal)!;
      return idx >= offset && idx < offset + limit;
    }),
  );

  console.log(
    `[${locale}] translating ${slice.length}/${sourceStrings.length} unique strings (${sliceKeySet.size} keys), full=${full}, offset=${offset}`,
  );

  const tmpIn = path.join(__dirname, `.translate-${locale}-in.json`);
  const tmpOut = path.join(__dirname, `.translate-${locale}-out.json`);
  fs.writeFileSync(tmpIn, JSON.stringify(slice, null, 2));

  const py = spawnSync(
    'python3',
    [
      path.join(__dirname, 'machine-translate-batch-lang.py'),
      'en',
      googleTarget,
      tmpIn,
      tmpOut,
    ],
    { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 },
  );
  if (py.status !== 0) {
    console.error(py.stderr || py.stdout);
    process.exit(1);
  }

  const translated: string[] = JSON.parse(fs.readFileSync(tmpOut, 'utf8'));
  const outTree = full && offset === 0 ? deepClone(en) : deepClone(current);

  for (const key of keysToFill) {
    if (!sliceKeySet.has(key)) continue;
    const enVal = enFlat[key]!;
    const idx = sourceIndex.get(enVal)!;
    const sliceIdx = idx - offset;
    setByDotKey(outTree, key, translated[sliceIdx] ?? enVal);
  }

  if (locale === 'th') {
    try {
      const { thOverrides } = await import('../lib/i18n/messages/_th-old-ref');
      deepMerge(outTree, thOverrides as StringTree);
    } catch {
      /* optional */
    }
  }
  if (locale === 'it') {
    try {
      const { itOverrides } = await import('../lib/i18n/messages/_it-overrides');
      deepMerge(outTree, itOverrides as StringTree);
    } catch {
      /* optional */
    }
  }

  const outPath = path.join(__dirname, `../lib/i18n/messages/${locale}.ts`);
  const body = emitValue(outTree, 1);
  fs.writeFileSync(
    outPath,
    `import type { Messages } from '@/lib/i18n/types';

export const ${locale}: Messages = ${body};
`,
  );

  fs.unlinkSync(tmpIn);
  fs.unlinkSync(tmpOut);
  console.log('Wrote', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
