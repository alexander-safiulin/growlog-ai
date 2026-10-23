/**
 * Regenerate lib/nutrient/product-display-names.generated.ts from catalog bundle.
 * Run: pnpm exec tsx scripts/build-product-display-names.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const bundlePath = path.join(ROOT, 'supabase/seed/nutrient/adr014-catalog.bundle.json');
const outPath = path.join(ROOT, 'lib/nutrient/product-display-names.generated.ts');

const bundle = JSON.parse(readFileSync(bundlePath, 'utf8')) as {
  fertilizers: Array<{ external_key: string; name: string; metadata?: Record<string, unknown> }>;
};

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

const RU_OVERRIDES: Record<string, string> = {
  'hydrobuddy|kno3': 'Нитрат калия',
  'hydrobuddy|mgso4-7h2o': 'Сульфат магния (7-водный)',
  'hydrobuddy|caso4-2h2o': 'Сульфат кальция (2-водный)',
  'hydrobuddy|kh2po4': 'Фосфорнокислый калий (моно)',
};

const map: Record<string, { en: string; ru: string }> = {};
for (const f of bundle.fertilizers) {
  const en = titleCase(f.name);
  const ruMeta = f.metadata?.display_name_ru ?? f.metadata?.name_ru;
  const ru =
    RU_OVERRIDES[f.external_key] ??
    (typeof ruMeta === 'string' && ruMeta.trim() ? ruMeta.trim() : en);
  map[f.external_key] = { en, ru };
}

const lines = [
  '/** Auto-generated from adr014-catalog.bundle.json — do not edit by hand. */',
  'export const PRODUCT_DISPLAY_NAMES: Record<string, { en: string; ru: string }> = ',
  JSON.stringify(map, null, 2),
  ';',
  '',
];

writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('Wrote', outPath, Object.keys(map).length, 'entries');
