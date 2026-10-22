import type { SolveForwardResult } from '@growlog/nutrient-calc';

export function listSolutionVariants(result: SolveForwardResult) {
  return [result.best, ...result.alternatives];
}

export function formatDoseLine(d: {
  fertilizerName: string;
  amountPerL: number;
  unit: string;
  tank?: string;
  stockAmountPerL?: number;
}): string {
  const unit = d.unit === 'ml_per_L' ? 'mL/L' : 'g/L';
  const tank = d.tank && d.tank !== 'single' ? ` [${d.tank}]` : '';
  const stock =
    d.stockAmountPerL != null && d.stockAmountPerL > 0
      ? ` · stock ${d.stockAmountPerL.toFixed(2)} ${d.unit === 'ml_per_L' ? 'mL/L' : 'g/L'}`
      : '';
  return `${d.fertilizerName}: ${d.amountPerL.toFixed(3)} ${unit}${tank}${stock}`;
}
