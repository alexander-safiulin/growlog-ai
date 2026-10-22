import type { FertilizerSpec } from './types';

/** Label GA is % w/w; ppm per 1 mL/L dose ≈ (% / 100) × density_g_ml × 1000 = % × density × 10. */
export function usesWwLiquidDensity(fert: FertilizerSpec): boolean {
  if (fert.doseUnit !== 'ml_per_L') return false;
  const prov = String(fert.metadata?.provenance_class ?? '');
  if (prov === 'hydroodo_legacy') return false;
  if (prov === 'manufacturer_label' || prov === 'manufacturer_feedchart') return true;
  if (prov === 'community') return true;
  return false;
}

export function labelDensityGPerMl(fert: FertilizerSpec): {
  densityGPerMl: number;
  assumedUnitDensity: boolean;
} {
  const raw = fert.metadata?.density_g_ml ?? fert.metadata?.densityGPerMl;
  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed > 0) {
    return { densityGPerMl: parsed, assumedUnitDensity: false };
  }
  return { densityGPerMl: 1, assumedUnitDensity: true };
}

export function doseMassMultiplierFromSpec(fert: FertilizerSpec): number {
  if (fert.doseUnit !== 'ml_per_L') return 1;
  if (!usesWwLiquidDensity(fert)) return 1;
  const { densityGPerMl } = labelDensityGPerMl(fert);
  const purity = Number(
    fert.metadata?.purity_mass_fraction ?? fert.metadata?.purityMassFraction ?? 1,
  );
  const p = Number.isFinite(purity) && purity > 0 ? purity : 1;
  return densityGPerMl * p;
}

export function missingLabelDensityWarnings(fertilizers: FertilizerSpec[]): string[] {
  const warnings: string[] = [];
  for (const f of fertilizers) {
    if (!usesWwLiquidDensity(f)) continue;
    const prov = String(f.metadata?.provenance_class ?? '');
    if (prov !== 'manufacturer_label' && prov !== 'manufacturer_feedchart') continue;
    const { assumedUnitDensity } = labelDensityGPerMl(f);
    if (assumedUnitDensity) {
      warnings.push(`label_density_missing:${f.id}`);
    }
  }
  return warnings;
}
