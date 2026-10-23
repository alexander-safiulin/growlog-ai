import type { DoseUnit } from '@growlog/nutrient-calc';

export function formatDoseUnit(unit: DoseUnit): string {
  switch (unit) {
    case 'g_per_L':
      return 'g/L';
    case 'ml_per_L':
      return 'mL/L';
    default:
      return unit;
  }
}

export function formatTankLabel(tank: string): string {
  if (tank === 'a') return 'A';
  if (tank === 'b') return 'B';
  return '';
}

export function formatStockAmount(
  amountPerL: number,
  unit: 'g_per_L' | 'ml_per_L',
  t?: (key: string) => string,
): string {
  const suffix = unit === 'ml_per_L' ? 'mL/L' : 'g/L';
  const stockLabel = t ? t('nutrient.stock') : 'stock';
  return `${amountPerL.toFixed(unit === 'ml_per_L' ? 2 : 2)} ${suffix} ${stockLabel}`;
}
