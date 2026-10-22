/** Canonical display names by external_key (title case en, ru where common). */
const NAMES: Record<string, { en: string; ru: string }> = {
  'hydrobuddy:potassium-nitrate': { en: 'Potassium Nitrate', ru: 'Калиевая селитра' },
  'hydrobuddy:calcium-nitrate': { en: 'Calcium Nitrate', ru: 'Кальциевая селитра' },
  'hydrobuddy:magnesium-sulfate': { en: 'Magnesium Sulfate', ru: 'Сульфат магния' },
  'hydrobuddy:monopotassium-phosphate': { en: 'Monopotassium Phosphate', ru: 'Монофосфат калия' },
  'hydrobuddy:potassium-sulfate': { en: 'Potassium Sulfate', ru: 'Сульфат калия' },
};

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
