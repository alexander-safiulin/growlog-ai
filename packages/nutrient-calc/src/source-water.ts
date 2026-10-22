import type { TargetPpm } from './types';

/** Source water elemental contribution (ppm as mg/L). */
export interface SourceWaterProfile {
  ppm?: TargetPpm | Record<string, number>;
  alkalinityHco3Ppm?: number;
  alkalinityAsCaco3Equivalent?: boolean;
}

export type AlkalinityNeutralizer = 'HNO3' | 'H3PO4';

export interface AcidProductStrength {
  acid: AlkalinityNeutralizer;
  /** Active acid mass % (e.g. 65 for 65% HNO3). */
  strengthMassPct: number;
  /** Solution density g/mL. */
  densityGPerMl: number;
}

export interface AcidNeutralizationResult {
  acidMgPerL: number;
  addedPpm: TargetPpm;
  hco3NeutralizedMmolPerL: number;
  /** Commercial acid solution mL/L when `acidProduct` supplied. */
  acidMlPerL?: number;
  warnings: string[];
}

const HNO3_MW = 63.008;
const H3PO4_MW = 97.994;
const HCO3_MW = 61.016;
const CACO3_EQ_TO_HCO3 = HCO3_MW / 50.0;
const N_ATOMIC = 14.007;
const P_ATOMIC = 30.974;

export function bicarbonateMgPerLFromProfile(water: SourceWaterProfile): number {
  const raw = water.alkalinityHco3Ppm ?? 0;
  if (raw <= 0) return 0;
  if (water.alkalinityAsCaco3Equivalent) return raw * CACO3_EQ_TO_HCO3;
  return raw;
}

export function neutralizeBicarbonateWithAcid(
  hco3MgPerL: number,
  acid: AlkalinityNeutralizer,
  acidProduct?: AcidProductStrength,
): AcidNeutralizationResult {
  const warnings: string[] = [];
  if (hco3MgPerL <= 0) {
    return { acidMgPerL: 0, addedPpm: {}, hco3NeutralizedMmolPerL: 0, warnings };
  }
  const mmol = hco3MgPerL / HCO3_MW;
  warnings.push('alkalinity_neutralization_assumes_open_system_co2_vented');
  const acidMgPerL = mmol * (acid === 'HNO3' ? HNO3_MW : H3PO4_MW);
  const addedPpm: TargetPpm =
    acid === 'HNO3' ? { N_NO3: mmol * N_ATOMIC } : { P: mmol * P_ATOMIC };

  let acidMlPerL: number | undefined;
  if (acidProduct && acidProduct.strengthMassPct > 0 && acidProduct.densityGPerMl > 0) {
    const pureGPerL = acidMgPerL / 1000;
    const solutionGPerL = pureGPerL / (acidProduct.strengthMassPct / 100);
    acidMlPerL = solutionGPerL / acidProduct.densityGPerMl;
  }

  return {
    acidMgPerL,
    addedPpm,
    hco3NeutralizedMmolPerL: mmol,
    acidMlPerL,
    warnings,
  };
}

export interface SourceWaterPrepareOptions {
  neutralizeAlkalinityWith?: AlkalinityNeutralizer;
  /** Leave this much HCO₃⁻ (mmol/L) un-neutralized (default 0.5). */
  residualHco3MmolPerL?: number;
  warnOnWaterExceedsTarget?: boolean;
  acidProduct?: AcidProductStrength;
}

export interface PreparedWaterResult {
  effectiveWaterPpm: TargetPpm;
  netTarget: TargetPpm;
  acid?: AcidNeutralizationResult & { acid: AlkalinityNeutralizer };
  warnings: string[];
}

function netTargetSubtractWithWarnings(
  target: TargetPpm,
  water: Record<string, number>,
  warn: boolean,
): { net: TargetPpm; warnings: string[] } {
  const warnings: string[] = [];
  const keys = new Set([...Object.keys(target), ...Object.keys(water)]);
  const out: TargetPpm = {};
  for (const key of keys) {
    const t = target[key as keyof TargetPpm] ?? 0;
    const w = water[key] ?? 0;
    if (warn && t > 0 && w > t + 1e-6) {
      warnings.push(`water_exceeds_target:${key}`);
    }
    const net = t - w;
    out[key as keyof TargetPpm] = net > 0 ? net : 0;
    if (net < 0 && warn) {
      warnings.push(`target_clamped_zero:${key}`);
    }
  }
  return { net: out, warnings };
}

export function prepareTargetWithSourceWater(
  target: TargetPpm | Record<string, number>,
  water: SourceWaterProfile | undefined,
  options?: SourceWaterPrepareOptions,
): PreparedWaterResult {
  const warnings: string[] = [];
  const baseWater: Record<string, number> = { ...(water?.ppm ?? {}) };
  let acidBlock: (AcidNeutralizationResult & { acid: AlkalinityNeutralizer }) | undefined;

  const hco3 = bicarbonateMgPerLFromProfile(water ?? {});
  const hco3FromPpm = baseWater.HCO3 ?? baseWater.hco3 ?? 0;
  const totalHco3 = hco3 > 0 ? hco3 : hco3FromPpm;
  const residualMmol = options?.residualHco3MmolPerL ?? 0.5;
  const residualMg = residualMmol * HCO3_MW;

  if (totalHco3 > 0 && options?.neutralizeAlkalinityWith) {
    const toNeutralize = Math.max(0, totalHco3 - residualMg);
    const acid = options.neutralizeAlkalinityWith;
    const neu = neutralizeBicarbonateWithAcid(toNeutralize, acid, options.acidProduct);
    warnings.push(...neu.warnings);
    acidBlock = { ...neu, acid };
    for (const [k, v] of Object.entries(neu.addedPpm)) {
      baseWater[k] = (baseWater[k] ?? 0) + (v ?? 0);
    }
    const leftover = totalHco3 - toNeutralize;
    if (leftover > 0) baseWater.HCO3 = leftover;
    delete baseWater.hco3;
  } else if (totalHco3 > 0) {
    baseWater.HCO3 = totalHco3;
    warnings.push('alkalinity_present_not_neutralized');
  }

  const effectiveWaterPpm = baseWater as TargetPpm;
  const warnExceed = options?.warnOnWaterExceedsTarget !== false;
  const { net, warnings: netWarn } = netTargetSubtractWithWarnings(
    target as TargetPpm,
    baseWater,
    warnExceed,
  );
  warnings.push(...netWarn);

  return { effectiveWaterPpm, netTarget: net, acid: acidBlock, warnings };
}
