import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import { productDisplayName } from '@/lib/nutrient/product-display-names';
import type { Locale } from '@/lib/i18n/locales';

export type NutrientWarningTranslator = (
  key: string,
  params?: Record<string, string>,
) => string;

const WARNING_BASE_KEYS = [
  'alkalinity_present_not_neutralized',
  'alkalinity_neutralization_assumes_open_system_co2_vented',
  'water_exceeds_target',
  'target_clamped_zero',
  'no_fertilizers',
  'nh4_share_worst_case',
  'below_min_match_threshold',
  'infeasible_best_effort',
  'micro_over_cap',
  'micro_harm_cap',
  'alternative_exclude_dominant_fertilizer',
  'nitrogen_form_unknown',
  'concentration_factor_below_one',
  'label_density_missing',
  'stock_solubility_unknown',
  'stock_solubility_unknown_key',
  'stock_solubility_exceeded',
  'stock_incompatible_ca_with_sulfate_or_phosphate_tank_a',
  'stock_incompatible_ca_with_sulfate_or_phosphate_tank_b',
] as const;

function warningMessageKey(base: string): string {
  return `nutrient.warnings.${base}`;
}

function fertilizerDisplayName(
  catalog: CatalogBundle,
  productId: string,
  locale: Locale,
): string {
  const row = catalog.fertilizers.find((f) => f.id === productId);
  if (!row) return productId;
  const localeKey = locale === 'ru' ? 'ru' : 'en';
  return productDisplayName(row.external_key, row.name, localeKey, {
    preserveFallback: true,
  });
}

export function formatNutrientWarning(
  key: string,
  t: NutrientWarningTranslator,
  catalog?: CatalogBundle,
  locale: Locale = 'en',
): string {
  const [base, ...rest] = key.split(':');
  const suffix = rest.join(':');

  const translated = t(warningMessageKey(base), {});
  const fallback = WARNING_BASE_KEYS.includes(base as (typeof WARNING_BASE_KEYS)[number])
    ? translated
    : key;

  if (base === 'label_density_missing' && suffix && catalog) {
    const name = catalog.fertilizers.find((f) => f.id === suffix)?.name;
    return name ? `${fallback} (${name})` : fallback;
  }

  if ((base === 'stock_solubility_unknown' || base === 'stock_solubility_exceeded') && suffix && catalog) {
    const productId = base === 'stock_solubility_exceeded' ? suffix.split(':')[0] : suffix;
    const name = fertilizerDisplayName(catalog, productId, locale);
    if (base === 'stock_solubility_exceeded') {
      const limitPart = suffix.includes('limit_') ? suffix.split('limit_')[1]?.replace('_g_per_L', '') : '';
      return limitPart
        ? t(warningMessageKey('stock_solubility_exceeded'), { name, limit: limitPart })
        : `${fallback} (${name})`;
    }
    return t(warningMessageKey('stock_solubility_unknown'), { name });
  }

  if (base === 'stock_solubility_unknown_key' && suffix) {
    return `${fallback} (${suffix})`;
  }

  if (
    base === 'stock_incompatible_ca_with_sulfate_or_phosphate_tank_a' ||
    base === 'stock_incompatible_ca_with_sulfate_or_phosphate_tank_b'
  ) {
    const tank = base.endsWith('_tank_a') ? 'A' : 'B';
    const msg = t(warningMessageKey(base), { tank });
    if (msg !== warningMessageKey(base)) return msg;
  }

  return suffix && !translated.includes(suffix) ? `${fallback} (${suffix})` : fallback;
}

/** Stable group id for UI (collapse duplicate warning types). */
export function nutrientWarningGroupId(key: string): string {
  const [base] = key.split(':');
  if (base.startsWith('stock_incompatible_ca_with_sulfate_or_phosphate_tank_')) {
    return 'stock_incompatible_ca_tank';
  }
  if (base === 'stock_solubility_unknown' || base === 'stock_solubility_exceeded') {
    return base;
  }
  return base;
}
