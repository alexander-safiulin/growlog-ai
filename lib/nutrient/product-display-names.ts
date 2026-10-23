import { PRODUCT_DISPLAY_NAMES } from './product-display-names.generated';
import { PRODUCT_DISPLAY_NAME_RU_OVERRIDES } from './product-display-names-overrides';

const NAMES: Record<string, { en: string; ru: string }> = PRODUCT_DISPLAY_NAMES;

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

function lookupKey(externalKey: string): string {
  return externalKey.trim().toLowerCase();
}

export function productDisplayName(
  externalKey: string,
  fallbackName: string,
  locale: 'en' | 'ru',
  options?: { preserveFallback?: boolean },
): string {
  const key = lookupKey(externalKey);
  if (locale === 'ru' && PRODUCT_DISPLAY_NAME_RU_OVERRIDES[key]) {
    return PRODUCT_DISPLAY_NAME_RU_OVERRIDES[key];
  }
  const row = NAMES[externalKey] ?? NAMES[key];
  if (row) {
    if (locale === 'ru' && PRODUCT_DISPLAY_NAME_RU_OVERRIDES[key]) {
      return PRODUCT_DISPLAY_NAME_RU_OVERRIDES[key];
    }
    const ru = row.ru;
    if (locale === 'ru' && ru && /[а-яА-ЯёЁ]/.test(ru)) return ru;
    return row[locale] ?? row.en;
  }
  if (options?.preserveFallback || externalKey.startsWith('farm:')) return fallbackName;
  if (locale === 'ru' && /[а-яА-ЯёЁ]/.test(fallbackName)) return fallbackName;
  return titleCase(fallbackName);
}
