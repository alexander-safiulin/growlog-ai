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
