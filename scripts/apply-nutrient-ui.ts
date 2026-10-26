/**
 * Translate and merge the full `nutrient` Messages subtree for a locale.
 * Usage: npx tsx scripts/apply-nutrient-ui.ts <fr|es|it|th|vi> [--offset=N] [--limit=N]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import type { Locale } from '../lib/i18n/locales';
import { messagesByLocale } from '../lib/i18n/messages';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TARGET: Partial<Record<Locale, string>> = {
  fr: 'fr',
  es: 'es',
  it: 'it',
  th: 'th',
  vi: 'vi',
};

const EXTEND_EN_LOCALES = new Set<Locale>(['th', 'vi']);

type StringTree = Record<string, unknown>;

function flatNutrient(obj: unknown, prefix = 'nutrient'): Record<string, string> {
  const out: Record<string, string> = {};
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = `${prefix}.${k}`;
    if (typeof v === 'string') out[key] = v;
    else if (v && typeof v === 'object') Object.assign(out, flatNutrient(v, key));
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

function shouldKeepEnglish(s: string): boolean {
  if (s.length <= 2 && /^[\d\s./%-]+$/.test(s)) return true;
  if (/^(N|P|K|Ca|Mg|S|Fe|Mn|Zn|Cu|B|Mo|Si|Na|Cl|g|ml|L|ppm|EC|pH|SOP)$/i.test(s)) return true;
  if (/^N \(NO₃|^SO₄|^HCO₃|^mS\/cm|^g\/L|^mL\/L/.test(s)) return true;
  if (s === 'Hydroodo Legacy' || s === 'Hydroodo 0.4 beta database') return true;
  return false;
}

function main() {
  const locale = process.argv[2] as Locale;
  const google = TARGET[locale];
  if (!locale || !google) {
    console.error('usage: apply-nutrient-ui.ts fr|es|it|th|vi [--offset=N] [--limit=N]');
    process.exit(1);
  }

  const offsetArg = process.argv.find((a) => a.startsWith('--offset='));
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const offset = offsetArg ? parseInt(offsetArg.split('=')[1] ?? '0', 10) : 0;
  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '9999', 10) : 9999;

  const enFlat = flatNutrient(messagesByLocale.en);
  const curFlat = flatNutrient(messagesByLocale[locale]);
  const deFlat = flatNutrient(messagesByLocale.de);

  const keys: string[] = [];
  const sources: string[] = [];
  const index = new Map<string, number>();

  for (const [key, enVal] of Object.entries(enFlat)) {
    const cur = curFlat[key] ?? enVal;
    const deVal = deFlat[key];
    if (deVal && cur === enVal && deVal !== enVal && !shouldKeepEnglish(enVal)) {
      let idx = index.get(enVal);
      if (idx === undefined) {
        idx = sources.length;
        sources.push(enVal);
        index.set(enVal, idx);
      }
      keys.push(key);
    }
  }

  const slice = sources.slice(offset, offset + limit);
  const sliceKeys = keys.filter((key) => {
    const idx = index.get(enFlat[key]!)!;
    return idx >= offset && idx < offset + limit;
  });

  console.log(`[${locale}] nutrient batch ${slice.length}/${sources.length} strings, ${sliceKeys.length} keys`);

  if (slice.length === 0) {
    console.log('nothing to do');
    return;
  }

  const tmpIn = path.join(__dirname, `.nutrient-ui-${locale}-in.json`);
  const tmpOut = path.join(__dirname, `.nutrient-ui-${locale}-out.json`);
  fs.writeFileSync(tmpIn, JSON.stringify(slice, null, 2));

  const py = spawnSync(
    'python3',
    [path.join(__dirname, 'machine-translate-batch-lang.py'), 'en', google, tmpIn, tmpOut],
    { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 },
  );
  if (py.status !== 0) {
    console.error(py.stderr || py.stdout);
    process.exit(1);
  }

  const translated: string[] = JSON.parse(fs.readFileSync(tmpOut, 'utf8'));
  const nutrientTree = deepClone(messagesByLocale.de.nutrient) as StringTree;

  for (const key of Object.keys(enFlat)) {
    const enVal = enFlat[key]!;
    const cur = curFlat[key];
    if (cur && cur !== enVal) {
      setByDotKey({ nutrient: nutrientTree }, key, cur);
    }
  }

  for (const key of sliceKeys) {
    const enVal = enFlat[key]!;
    const idx = index.get(enVal)! - offset;
    setByDotKey({ nutrient: nutrientTree }, key, translated[idx] ?? enVal);
  }

  const outPath = path.join(__dirname, `../lib/i18n/messages/${locale}.ts`);
  let src = fs.readFileSync(outPath, 'utf8');
  const nutrientBody = emitValue(nutrientTree, EXTEND_EN_LOCALES.has(locale) ? 2 : 2);
  const replacement = `  nutrient: ${nutrientBody},\n`;

  const marker = '\n  nutrient:';
  const start = src.indexOf(marker);
  if (start === -1) {
    throw new Error(`nutrient block not found in ${outPath}`);
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
  if (depth !== 0) throw new Error('failed to splice nutrient block');
  fs.writeFileSync(outPath, src);

  fs.unlinkSync(tmpIn);
  fs.unlinkSync(tmpOut);
  console.log('Updated', outPath);
}

main();
