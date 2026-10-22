import type { TargetPpm } from './types';
import { netTargetAfterWater } from './matrix';

/** Source water elemental contribution (ppm as mg/L). */
export interface SourceWaterProfile {
  ppm?: TargetPpm | Record<string, number>;
  /**
   * Bicarbonate alkalinity as HCO₃⁻ mg/L.
   * If `alkalinityAsCaco3Equivalent` is true, value is converted using factor 61.016/50.0.
   */
  alkalinityHco3Ppm?: number;
  alkalinityAsCaco3Equivalent?: boolean;
}

export type AlkalinityNeutralizer = 'HNO3' | 'H3PO4';

export interface AcidNeutralizationResult {
  /** mg/L of pure acid (HNO₃ or H₃PO₄) required to neutralize reported alkalinity. */
  acidMgPerL: number;
  /** Additional elemental ppm credited to the working solution after neutralization. */
  addedPpm: TargetPpm;
  /** mmol/L HCO₃⁻ neutralized. */
  hco3NeutralizedMmolPerL: number;
  warnings: string[];
}

const HNO3_MW = 63.008;
const H3PO4_MW = 97.994;
const HCO3_MW = 61.016;
const CACO3_EQ_TO_HCO3 = HCO3_MW / 50.0;
const N_ATOMIC = 14.007;
const P_ATOMIC = 30.974;

/**
 * Convert alkalinity reading to bicarbonate mg/L.
 * Many labs report alkalinity as mg/L CaCO₃ equivalent (charge basis).
 */
export function bicarbonateMgPerLFromProfile(water: SourceWaterProfile): number {
  const raw = water.alkalinityHco3Ppm ?? 0;
  if (raw <= 0) return 0;
  if (water.alkalinityAsCaco3Equivalent) return raw * CACO3_EQ_TO_HCO3;
  return raw;
}

/**
 * Neutralize bicarbonate with strong acid (1:1 mol H⁺ : HCO₃⁻ in open system, CO₂ vented).
 *
 * HNO₃: adds nitrate-N (14.007 mg per mmol).
 * H₃PO₄ (first proton): adds phosphate-P (30.974 mg per mmol).
 */
export function neutralizeBicarbonateWithAcid(
  hco3MgPerL: number,
  acid: AlkalinityNeutralizer,
): AcidNeutralizationResult {
  const warnings: string[] = [];
  if (hco3MgPerL <= 0) {
    return { acidMgPerL: 0, addedPpm: {}, hco3NeutralizedMmolPerL: 0, warnings };
  }
  const mmol = hco3MgPerL / HCO3_MW;
  warnings.push('alkalinity_neutralization_assumes_open_system_co2_vented');
  if (acid === 'HNO3') {
    return {
      acidMgPerL: mmol * HNO3_MW,
      addedPpm: { N_NO3: mmol * N_ATOMIC },
      hco3NeutralizedMmolPerL: mmol,
      warnings,
    };
  }
  return {
    acidMgPerL: mmol * H3PO4_MW,
    addedPpm: { P: mmol * P_ATOMIC },
    hco3NeutralizedMmolPerL: mmol,
    warnings,
  };
}

export interface PreparedWaterResult {
  /** Elemental ppm contributed by water (after acid credit, HCO₃ removed). */
  effectiveWaterPpm: TargetPpm;
  netTarget: TargetPpm;
  acid?: AcidNeutralizationResult & { acid: AlkalinityNeutralizer };
  warnings: string[];
}

/**
 * Subtract source water from target; optionally neutralize bicarbonate before subtraction.
 */
export function prepareTargetWithSourceWater(
  target: TargetPpm | Record<string, number>,
  water: SourceWaterProfile | undefined,
  options?: { neutralizeAlkalinityWith?: AlkalinityNeutralizer },
): PreparedWaterResult {
  const warnings: string[] = [];
  const baseWater: Record<string, number> = { ...(water?.ppm ?? {}) };
  let acidBlock: (AcidNeutralizationResult & { acid: AlkalinityNeutralizer }) | undefined;

  const hco3 = bicarbonateMgPerLFromProfile(water ?? {});
  const hco3FromPpm = baseWater.HCO3 ?? baseWater.hco3 ?? 0;
  const totalHco3 = hco3 > 0 ? hco3 : hco3FromPpm;

  if (totalHco3 > 0 && options?.neutralizeAlkalinityWith) {
    const acid = options.neutralizeAlkalinityWith;
    const neu = neutralizeBicarbonateWithAcid(totalHco3, acid);
    warnings.push(...neu.warnings);
    acidBlock = { ...neu, acid };
    for (const [k, v] of Object.entries(neu.addedPpm)) {
      baseWater[k] = (baseWater[k] ?? 0) + (v ?? 0);
    }
    delete baseWater.HCO3;
    delete baseWater.hco3;
  } else if (totalHco3 > 0) {
    baseWater.HCO3 = totalHco3;
    warnings.push('alkalinity_present_not_neutralized');
  }

  const effectiveWaterPpm = baseWater as TargetPpm;
  const netTarget = netTargetAfterWater(target as TargetPpm, effectiveWaterPpm);
  return { effectiveWaterPpm, netTarget, acid: acidBlock, warnings };
}
