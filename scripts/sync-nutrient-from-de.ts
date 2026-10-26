/** Copy nutrient subtree from de where locale leaf equals en (then optional translate pass). */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { messagesByLocale } from '../lib/i18n/messages';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const locale = process.argv[2] as 'fr' | 'es' | 'it';
const TARGET = { fr: 'fr', es: 'es', it: 'it' } as const;

if (!locale || !(locale in TARGET)) {
  console.error('usage: sync-nutrient-from-de.ts fr|es|it');
  process.exit(1);
}

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

function setByDotKey(obj: Record<string, unknown>, dotKey: string, value: string) {
  const parts = dotKey.split('.').filter(Boolean);
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]!;
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}

const en = flat(messagesByLocale.en);
const de = flat(messagesByLocale.de);
const tree = JSON.parse(JSON.stringify(messagesByLocale[locale])) as Record<string, unknown>;

const toTranslate: string[] = [];
const keys: string[] = [];
for (const [key, enVal] of Object.entries(en)) {
  if (!key.startsWith('nutrient.')) continue;
  const cur = flat(tree)[key];
  if (cur !== enVal) continue;
  const deVal = de[key];
  if (!deVal || deVal === enVal) continue;
  keys.push(key);
  toTranslate.push(deVal);
}

const tmpIn = path.join(__dirname, `.nutrient-${locale}-in.json`);
const tmpOut = path.join(__dirname, `.nutrient-${locale}-out.json`);
fs.writeFileSync(tmpIn, JSON.stringify(toTranslate, null, 2));
const py = spawnSync(
  'python3',
  [
    path.join(__dirname, 'machine-translate-batch-lang.py'),
    'de',
    TARGET[locale],
    tmpIn,
    tmpOut,
  ],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
);
if (py.status !== 0) {
  console.error(py.stderr || py.stdout);
  process.exit(1);
}
const translated: string[] = JSON.parse(fs.readFileSync(tmpOut, 'utf8'));
keys.forEach((key, i) => setByDotKey(tree, key, translated[i] ?? toTranslate[i]!));

// re-emit like fill-locale-from-de (minimal)
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
    return JSON.stringify(v);
  }
  return JSON.stringify(v);
}

const outPath = path.join(__dirname, `../lib/i18n/messages/${locale}.ts`);
const body = emitValue(tree, 1);
fs.writeFileSync(
  outPath,
  `import type { Messages } from '@/lib/i18n/types';

export const ${locale}: Messages = ${body};
`,
);
fs.unlinkSync(tmpIn);
fs.unlinkSync(tmpOut);
console.log(`[${locale}] nutrient synced ${keys.length} keys`);
