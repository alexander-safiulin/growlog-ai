import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { messagesByLocale } from '../lib/i18n/messages';
import { thOverrides } from '../lib/i18n/messages/_th-old-ref';

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
  ruNode: unknown,
  deNode: unknown,
): void {
  if (!target || typeof target !== 'object' || Array.isArray(target)) return;
  if (!ruNode || typeof ruNode !== 'object' || Array.isArray(ruNode)) return;
  if (!deNode || typeof deNode !== 'object' || Array.isArray(deNode)) return;
  const t = target as Record<string, unknown>;
  const r = ruNode as Record<string, unknown>;
  const d = deNode as Record<string, unknown>;
  for (const k of Object.keys(r)) {
    if (!(k in t)) continue;
    const rv = r[k];
    const tv = t[k];
    const dv = d[k];
    if (rv && typeof rv === 'object' && !Array.isArray(rv)) {
      fillWhereStillDe(tv, rv, dv);
    } else if (typeof rv === 'string' && typeof tv === 'string' && typeof dv === 'string' && tv === dv) {
      t[k] = rv;
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
const ru = messagesByLocale.ru;
const merged = deepMerge(JSON.parse(JSON.stringify(de)) as Record<string, unknown>, thOverrides as Record<string, unknown>);
fillWhereStillDe(merged, ru, de);
deepMerge(merged, thOverrides as Record<string, unknown>);

const outPath = path.join(__dirname, '../lib/i18n/messages/th.ts');
const body = emitValue(merged, 1);
const src = `import type { Messages } from '@/lib/i18n/types';

export const th: Messages = ${body};
`;
fs.writeFileSync(outPath, src);
console.log('Wrote', outPath);
