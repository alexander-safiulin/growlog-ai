import { PRODUCT_DISPLAY_NAMES } from './product-display-names.generated';

const NAMES: Record<string, { en: string; ru: string }> = PRODUCT_DISPLAY_NAMES;

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

export function productDisplayName(
  externalKey: string,
  fallbackName: string,
  locale: 'en' | 'ru',
): string {
  const row = NAMES[externalKey];
  if (row) return row[locale] ?? row.en;
  if (locale === 'ru' && /[а-яА-ЯёЁ]/.test(fallbackName)) return fallbackName;
  return titleCase(fallbackName);
}
