/** Re-apply hand-polished Thai nutrient strings from _th-old-ref after bulk build. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { messagesByLocale } from '../lib/i18n/messages';
import { thOverrides } from '../lib/i18n/messages/_th-old-ref';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type StringTree = Record<string, unknown>;

function deepMerge(target: StringTree, source: StringTree) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      deepMerge(target[k] as StringTree, v as StringTree);
    } else if (typeof v === 'string') target[k] = v;
  }
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

const tree = structuredClone(messagesByLocale.th.nutrient) as StringTree;
const overrides = (thOverrides as { nutrient?: StringTree }).nutrient;
if (overrides) deepMerge(tree, overrides);

const outPath = path.join(__dirname, '../lib/i18n/messages/th.ts');
let src = fs.readFileSync(outPath, 'utf8');
const replacement = `  nutrient: ${emitValue(tree, 2)},\n`;
const marker = '\n  nutrient:';
const start = src.indexOf(marker);
if (start === -1) throw new Error('nutrient block missing');
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
console.log('Merged Thai nutrient overrides into th.ts');
