import { describe, expect, it } from 'vitest';
import {
  externalKeyForNpkImport,
  NPK_ANDROID_IMPORT_SOURCE,
  parseNpkAndroidExport,
} from '../../lib/nutrient/npk-android-import';

describe('NPK Android import stub', () => {
  it('records user provenance', () => {
    expect(NPK_ANDROID_IMPORT_SOURCE.provenance).toBe('user');
    expect(NPK_ANDROID_IMPORT_SOURCE.source_type).toBe('user_entered');
  });

  it('parses minimal export array', () => {
    const raw = JSON.stringify([
      {
        brand: 'Test',
        name: 'CalMag',
        composition: { CaO: 15, MgO: 6 },
        physical_form: 'liquid',
        density_g_per_ml: 1.2,
        label_basis: 'w_v',
      },
    ]);
    const bundle = parseNpkAndroidExport(raw);
    expect(bundle.products).toHaveLength(1);
    expect(bundle.products[0].dose_unit).toBe('ml_per_L');
    expect(bundle.products[0].lines).toEqual([
      { form_key: 'CaO', value_pct: 15 },
      { form_key: 'MgO', value_pct: 6 },
    ]);
    expect(externalKeyForNpkImport('Test', 'CalMag')).toMatch(/^user:npk-android:/);
  });
});
