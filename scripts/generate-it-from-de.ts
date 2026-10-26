/**
 * Legacy helper: fills Italian gaps from French wherever it still equals German.
 * Do NOT run for production IT — prefer es-to-it-locale.mjs + hand-reviewed vpd/cycle/nutrient.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { messagesByLocale } from '../lib/i18n/messages';
import { itOverrides } from '../lib/i18n/messages/_it-overrides';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      deepMerge(target[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else if (v !== undefined) {
      target[k] = v;
    }
  }
  return target;
}

function fillWhereStillDe(
  target: unknown,
  frNode: unknown,
  deNode: unknown,
): void {
  if (!target || typeof target !== 'object' || Array.isArray(target)) return;
  if (!frNode || typeof frNode !== 'object' || Array.isArray(frNode)) return;
  if (!deNode || typeof deNode !== 'object' || Array.isArray(deNode)) return;
  const t = target as Record<string, unknown>;
  const f = frNode as Record<string, unknown>;
  const d = deNode as Record<string, unknown>;
  for (const k of Object.keys(f)) {
    if (!(k in t)) continue;
    const fv = f[k];
    const tv = t[k];
    const dv = d[k];
    if (fv && typeof fv === 'object' && !Array.isArray(fv)) {
      fillWhereStillDe(tv, fv, dv);
    } else if (typeof fv === 'string' && typeof tv === 'string' && typeof dv === 'string' && tv === dv) {
      t[k] = fv;
    }
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

const de = messagesByLocale.de;
const fr = messagesByLocale.fr;
const merged = deepMerge(JSON.parse(JSON.stringify(de)) as Record<string, unknown>, itOverrides as Record<string, unknown>);
fillWhereStillDe(merged, fr, de);
deepMerge(merged, itOverrides as Record<string, unknown>);

const outPath = path.join(__dirname, '../lib/i18n/messages/it.ts');
const body = emitValue(merged, 1);
const src = `import type { Messages } from '@/lib/i18n/types';

export const it: Messages = ${body};
`;
fs.writeFileSync(outPath, src);
console.log('Wrote', outPath);
