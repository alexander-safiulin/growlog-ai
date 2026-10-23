/**
 * Import path for Android «NPK Калькулятор» user export.
 * Format TBD — this module defines provenance and a minimal stub parser for tests.
 */

export const NPK_ANDROID_IMPORT_SOURCE = {
  source_type: 'user_entered' as const,
  provenance: 'user',
  slug: 'npk-android-calculator-import',
  name: 'NPK Калькулятор (Android export)',
};

export interface NpkAndroidImportProduct {
  brand: string;
  name: string;
  lines: Array<{ form_key: string; value_pct: number }>;
  physical_form: 'solid' | 'liquid';
  dose_unit: 'g_per_L' | 'ml_per_L';
  density_g_per_ml?: number | null;
  label_basis?: 'w_w' | 'w_v' | null;
}

export interface NpkAndroidImportBundle {
  format: 'npk-android-v0-stub';
  products: NpkAndroidImportProduct[];
}

/** Stub: accepts JSON array of { brand, name, composition: { P2O5: 52, ... } } */
export function parseNpkAndroidExport(raw: string): NpkAndroidImportBundle {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('npk_android_import: expected JSON array');
  }
  const products: NpkAndroidImportProduct[] = parsed.map((row, idx) => {
    if (!row || typeof row !== 'object') {
      throw new Error(`npk_android_import: invalid row ${idx}`);
    }
    const r = row as Record<string, unknown>;
    const brand = String(r.brand ?? 'Import');
    const name = String(r.name ?? `Product ${idx + 1}`);
    const composition = (r.composition ?? r.pct ?? {}) as Record<string, number>;
    const lines = Object.entries(composition).map(([form_key, value_pct]) => ({
      form_key,
      value_pct: Number(value_pct),
    }));
    const physical_form = r.physical_form === 'liquid' ? 'liquid' : 'solid';
    const dose_unit = physical_form === 'liquid' ? 'ml_per_L' : 'g_per_L';
    return {
      brand,
      name,
      lines,
      physical_form,
      dose_unit,
      density_g_per_ml: r.density_g_per_ml != null ? Number(r.density_g_per_ml) : null,
      label_basis: r.label_basis === 'w_v' ? 'w_v' : r.label_basis === 'w_w' ? 'w_w' : null,
    };
  });
  return { format: 'npk-android-v0-stub', products };
}

export function externalKeyForNpkImport(brand: string, name: string): string {
  const slug = `${brand}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `user:npk-android:${slug}`;
}
