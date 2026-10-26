/**
 * Build full nutrient UI from English catalog, with per-locale string cache (EN→locale).
 * Fallback cache: {locale}-from-de.json (DE→locale) via en-to-de mapping.
 * Usage: npx tsx scripts/build-nutrient-ui-locale.ts <fr|es|it|th|vi> [--translate-missing]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import type { Locale } from '../lib/i18n/locales';
import { messagesByLocale } from '../lib/i18n/messages';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '../lib/i18n/nutrient-ui/cache');

const GOOGLE: Partial<Record<Locale, string>> = {
  fr: 'fr',
  es: 'es',
  it: 'it',
  th: 'th',
  vi: 'vi',
};

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

function spliceNutrient(outPath: string, nutrientTree: unknown) {
  let src = fs.readFileSync(outPath, 'utf8');
  const replacement = `  nutrient: ${emitValue(nutrientTree, 2)},\n`;
  const marker = '\n  nutrient:';
  let start = src.indexOf(marker);
  if (start === -1) {
    const close = src.lastIndexOf('});');
    if (close === -1) throw new Error(`nutrient block not found in ${outPath}`);
    const insert = `\n${replacement.trimEnd()}\n`;
    src = src.slice(0, close) + insert + src.slice(close);
    fs.writeFileSync(outPath, src);
    return;
  }
  let depth = 0;
  let i = src.indexOf('{', start);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) {
        let end = i + 1;
        while (end < src.length && /[\s,]/.test(src[end] ?? '')) end++;
        src = src.slice(0, start + 1) + `\n${replacement.trimEnd()}` + src.slice(end);
        break;
      }
    }
  }
  fs.writeFileSync(outPath, src);
}

function main() {
  const locale = process.argv[2] as Locale;
  const translateMissing = process.argv.includes('--translate-missing');
  const google = GOOGLE[locale];
  if (!locale || !google) {
    console.error('usage: build-nutrient-ui-locale.ts fr|es|it|th|vi [--translate-missing]');
    process.exit(1);
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const enCachePath = path.join(CACHE_DIR, `en-${locale}.json`);
  const deCachePath = path.join(CACHE_DIR, `${locale}-from-de.json`);
  const enToDePath = path.join(CACHE_DIR, 'en-to-de.json');
  const useEnCache = fs.existsSync(enCachePath);
  const enCache: Record<string, string> = useEnCache
    ? JSON.parse(fs.readFileSync(enCachePath, 'utf8'))
    : {};
  const deCache: Record<string, string> =
    !useEnCache && fs.existsSync(deCachePath)
      ? JSON.parse(fs.readFileSync(deCachePath, 'utf8'))
      : {};
  const enToDe: Record<string, string> = fs.existsSync(enToDePath)
    ? JSON.parse(fs.readFileSync(enToDePath, 'utf8'))
    : {};

  const enTree = deepClone(messagesByLocale.en.nutrient) as StringTree;
  const enFlat = flat(enTree);
  const unique = [...new Set(Object.values(enFlat))].filter((s) => typeof s === 'string');

  const missing = unique.filter((s) => {
    if (useEnCache) return !enCache[s];
    const deVal = enToDe[s];
    return deVal ? !deCache[deVal] : true;
  });

  if (translateMissing && missing.length > 0) {
    const tmpIn = path.join(CACHE_DIR, `.${locale}-en-in.json`);
    const tmpOut = path.join(CACHE_DIR, `.${locale}-en-out.json`);
    fs.writeFileSync(tmpIn, JSON.stringify(missing, null, 2));
    console.log(`Translating ${missing.length} strings en→${google}…`);
    const py = spawnSync(
      'python3',
      [path.join(__dirname, 'machine-translate-batch-lang.py'), 'en', google, tmpIn, tmpOut],
      { encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 },
    );
    if (py.status !== 0) {
      console.error(py.stderr || py.stdout);
      process.exit(1);
    }
    const out: string[] = JSON.parse(fs.readFileSync(tmpOut, 'utf8'));
    missing.forEach((s, i) => {
      enCache[s] = out[i] ?? s;
    });
    fs.writeFileSync(enCachePath, JSON.stringify(enCache, null, 2));
    fs.unlinkSync(tmpIn);
    fs.unlinkSync(tmpOut);
  }

  const deFlat = flat(messagesByLocale.de.nutrient);

  for (const [key, enVal] of Object.entries(enFlat)) {
    let next = enVal;
    if (useEnCache) {
      next = enCache[enVal] ?? enVal;
    } else if (Object.keys(deCache).length > 0) {
      const deVal = (enToDe[enVal] ?? deFlat[key]) as string | undefined;
      next = deVal && deCache[deVal] ? deCache[deVal] : enVal;
    }
    setByDotKey(enTree, key, next);
  }

  const outPath = path.join(__dirname, `../lib/i18n/messages/${locale}.ts`);
  spliceNutrient(outPath, enTree);
  const cacheHits = unique.filter((s) =>
    useEnCache ? Boolean(enCache[s]) : Boolean(enToDe[s] && deCache[enToDe[s]!]),
  ).length;
  console.log(
    `Updated nutrient in ${outPath} (${useEnCache ? 'en' : 'de'} cache ${cacheHits}/${unique.length})`,
  );
}

main();
