import type { DoseUnit } from '@growlog/nutrient-calc';
import type { Locale } from '@/lib/i18n/locales';
import { formatLocaleDecimal } from '@/lib/i18n/format-locale-number';

export type DoseUnitTranslator = (key: string) => string;

export function formatDoseUnit(unit: DoseUnit, t?: DoseUnitTranslator): string {
  if (t) {
    switch (unit) {
      case 'g_per_L':
        return t('nutrient.units.gPerL');
      case 'ml_per_L':
        return t('nutrient.units.mlPerL');
      default:
        return unit;
    }
  }
  switch (unit) {
    case 'g_per_L':
      return 'g/L';
    case 'ml_per_L':
      return 'mL/L';
    default:
      return unit;
  }
}

export function formatMassUnitFromDoseUnit(unit: DoseUnit, t?: DoseUnitTranslator): string {
  if (t) {
    return unit === 'ml_per_L' ? t('nutrient.units.ml') : t('nutrient.units.g');
  }
  return unit === 'ml_per_L' ? 'mL' : 'g';
}

export function formatEcUnit(t?: DoseUnitTranslator): string {
  return t ? t('nutrient.units.msCm') : 'mS/cm';
}

export function formatTankLabel(tank: string): string {
  if (tank === 'a' || tank === 'A') return 'A';
  if (tank === 'b' || tank === 'B') return 'B';
  return tank;
}

export function formatStockAmount(
  amountPerL: number,
  unit: 'g_per_L' | 'ml_per_L',
  t?: DoseUnitTranslator,
  locale?: Locale,
): string {
  const suffix = formatDoseUnit(unit, t);
  const stockLabel = t ? t('nutrient.stock') : 'stock';
  const amount = locale
    ? formatLocaleDecimal(amountPerL, locale, 2)
    : amountPerL.toFixed(2);
  return `${amount} ${suffix} ${stockLabel}`;
}

export function formatLocaleAmount(
  value: number,
  locale: Locale,
  fractionDigits: number,
): string {
  return formatLocaleDecimal(value, locale, fractionDigits);
}
