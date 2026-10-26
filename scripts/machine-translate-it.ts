import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { messagesByLocale } from '../lib/i18n/messages';
import { itOverrides } from '../lib/i18n/messages/_it-overrides';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function flat(obj, p = '') {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flat(v, key));
    else if (typeof v === 'string') out[key] = v;
  }
  return out;
}

function setByDotKey(obj, dotKey, value) {
  const parts = dotKey.split('.').filter(Boolean);
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function needsItalian(s) {
  if (/[àâçéèêëîïôùûäöüßÄÖÜ]|¿/.test(s)) return true;
  return false;
}

function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      deepMerge(target[k], v);
    } else if (v !== undefined) target[k] = v;
  }
  return target;
}

function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function emitValue(v, indent) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const pad = '  '.repeat(indent);
    const padIn = '  '.repeat(indent + 1);
    const lines = [`${pad}{`];
    for (const [k, child] of Object.entries(v)) {
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

const it = JSON.parse(JSON.stringify(messagesByLocale.it));
const fr = messagesByLocale.fr;
const itFlat = flat(it);
const frFlat = flat(fr);
const overrideFlat = flat(itOverrides);

const toTranslate = new Set();
for (const [k, v] of Object.entries(itFlat)) {
  if (overrideFlat[k] === v) continue;
  if (frFlat[k] === v || needsItalian(v)) toTranslate.add(v);
}

const list = [...toTranslate];
const tmpIn = path.join(__dirname, '.it-translate-in.json');
const tmpOut = path.join(__dirname, '.it-translate-out.json');
fs.writeFileSync(tmpIn, JSON.stringify(list, null, 2));

const py = spawnSync(
  'python3',
  [path.join(__dirname, 'machine-translate-batch-it.py'), tmpIn, tmpOut],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
);
if (py.status !== 0) {
  console.error(py.stderr || py.stdout);
  process.exit(1);
}

const translatedList = JSON.parse(fs.readFileSync(tmpOut, 'utf8'));
const map = new Map(list.map((s, i) => [s, translatedList[i] ?? s]));

for (const [k, v] of Object.entries(itFlat)) {
  if (overrideFlat[k] === v) continue;
  const next = map.get(v);
  if (next && next !== v) setByDotKey(it, k, next);
}

deepMerge(it, itOverrides);

const outPath = path.join(__dirname, '../lib/i18n/messages/it.ts');
const body = emitValue(it, 1);
fs.writeFileSync(
  outPath,
  `import type { Messages } from '@/lib/i18n/types';

export const it: Messages = ${body};
`,
);
console.log('Translated', map.size, 'unique strings →', outPath);
fs.unlinkSync(tmpIn);
fs.unlinkSync(tmpOut);
