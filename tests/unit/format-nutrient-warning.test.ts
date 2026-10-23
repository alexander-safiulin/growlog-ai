import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import { createTranslator } from '@/lib/i18n/translate';
import { ru } from '@/lib/i18n/messages/ru';
import { formatNutrientWarning } from '@/lib/nutrient/format-warning';

const bundlePath = path.join(process.cwd(), 'supabase/seed/nutrient/adr014-catalog.bundle.json');
const catalog = JSON.parse(readFileSync(bundlePath, 'utf8')) as CatalogBundle;

describe('formatNutrientWarning', () => {
  it('localizes single-tank solubility warnings with product display name (no {name})', () => {
    const fertilizer = catalog.fertilizers.find((f) => f.external_key === 'hydrobuddy|5ca-no3-2-nh4no3-10h2o');
    expect(fertilizer).toBeTruthy();

    const t = createTranslator(ru);
    const key = `stock_solubility_unknown:${fertilizer!.id}`;
    const msg = formatNutrientWarning(key, (k, params) => t(k, params), catalog, 'ru');

    expect(msg).not.toContain('{name}');
    expect(msg).toContain('Кальциевая селитра');
  });
});
