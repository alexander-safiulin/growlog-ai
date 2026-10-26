import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { messagesByLocale } from '../lib/i18n/messages';
import { thOverrides } from '../lib/i18n/messages/_th-old-ref';

const de = messagesByLocale.de;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function deepMerge(target, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return target;
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      deepMerge(target[k], v);
    } else {
      target[k] = v;
    }
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
    if (v.includes('\n')) {
      return JSON.stringify(v);
    }
    if (v.includes('"') && !v.includes("'")) {
      return `'${escapeStr(v)}'`;
    }
    return JSON.stringify(v);
  }
  return JSON.stringify(v);
}

const merged = deepMerge(JSON.parse(JSON.stringify(de)), thOverrides);

const outPath = path.join(__dirname, '../lib/i18n/messages/th.ts');
const body = emitValue(merged, 1);
const src = `import type { Messages } from '@/lib/i18n/types';

export const th: Messages = ${body};
`;
fs.writeFileSync(outPath, src);
console.log('Wrote', outPath);
