/**
 * Electrical conductivity estimate (LMCv2-style limiting molar conductivity model).
 *
 * Method (independent implementation; do not copy GPL HydroBuddy sources):
 * 1. Map elemental ppm → principal ion mol/L with documented speciation assumptions.
 * 2. Ionic strength I = ½ Σ cᵢ zᵢ² (mol/L).
 * 3. Λᵢ = Λ°ᵢ exp(−k √I · |zᵢ|^1.5) with k = 0.7025187 (published LMCv2 constant).
 * 4. With cᵢ in mol/L and Λᵢ in S·cm²·mol⁻¹, κ (mS/cm) = Σ cᵢ Λᵢ
 *    (equivalent to κ (S/cm) = Σ cᵢ Λᵢ / 1000 because 1 L = 1000 cm³).
 *
 * Reference description: Science in Hydroponics — limiting molar conductivity articles
 * https://scienceinhydroponics.com/ (LMCv2 coefficient as cited in ADR-014).
 *
 * This is an **estimate**, not a replacement for a calibrated meter.
 */
import { LAMBDA0_BY_ION } from './ec-lambda0';

/** Published LMCv2 Debye–Hückel–Onsager style constant (dimensionless). */
export const LMC_V2_K = 0.7025187;

export const EC_ESTIMATE_DISCLAIMER =
  'EC is a model estimate from ionic strength and tabulated limiting molar conductivities; verify with a calibrated meter.';

export interface IonMolPerL {
  id: keyof typeof LAMBDA0_BY_ION;
  cMolPerL: number;
}

const N_ATOMIC = 14.007;
const P_ATOMIC = 30.974;
const S_ATOMIC = 32.06;
const HCO3_MW = 61.016;

export interface EcSpeciationOptions {
  /** Assume nitrate-N for undifferentiated legacy `N` group (Hydroodo mode). */
  legacyNAsNitrate?: boolean;
  /**
   * Phosphate speciation at working pH: monovalent H2PO4- vs divalent HPO4 2-.
   * Default `h2po4` (~pH 5.5–6.5 hydroponic range).
   */
  phosphateForm?: 'h2po4' | 'hpo4';
}

/**
 * Convert elemental / group ppm map to ion mol/L for EC.
 * Assumptions documented in ADR-014 and EC.md.
 */
export function elementalPpmToIons(
  ppm: Record<string, number>,
  options?: EcSpeciationOptions,
): IonMolPerL[] {
  const ions: IonMolPerL[] = [];
  const add = (id: IonMolPerL['id'], cMolPerL: number) => {
    if (cMolPerL > 1e-15) ions.push({ id, cMolPerL });
  };

  const nNo3 = ppm.N_NO3 ?? 0;
  const nNh4 = ppm.N_NH4 ?? 0;
  const nUrea = ppm.N_UREA ?? 0;
  let nLegacy = ppm.N ?? 0;
  if (nLegacy > 0 && nNo3 + nNh4 + nUrea > 0) nLegacy = 0;

  add('NO3', (nNo3 + (options?.legacyNAsNitrate ? nLegacy : 0)) / N_ATOMIC / 1000);
  if (!options?.legacyNAsNitrate && nLegacy > 0) {
    add('NO3', nLegacy / N_ATOMIC / 1000);
  }
  add('NH4', nNh4 / N_ATOMIC / 1000);
  // Urea is non-ionic; omitted from EC.

  const p = ppm.P ?? 0;
  if (p > 0) {
    const form = options?.phosphateForm ?? 'h2po4';
    if (form === 'h2po4') add('H2PO4', p / P_ATOMIC / 1000);
    else add('HPO4', p / P_ATOMIC / 1000);
  }

  const s = ppm.S ?? 0;
  if (s > 0) add('SO4', s / S_ATOMIC / 1000);

  const macroCations: Array<[IonMolPerL['id'], string]> = [
    ['K', 'K'],
    ['Ca', 'Ca'],
    ['Mg', 'Mg'],
    ['Na', 'Na'],
  ];
  for (const [ionId, key] of macroCations) {
    const v = ppm[key] ?? 0;
    if (v > 0) add(ionId, v / (ionId === 'K' ? 39.098 : ionId === 'Ca' ? 40.078 : ionId === 'Mg' ? 24.305 : 22.99) / 1000);
  }

  const cl = ppm.Cl ?? 0;
  if (cl > 0) add('Cl', cl / 35.45 / 1000);

  const hco3 = ppm.HCO3 ?? ppm.hco3 ?? 0;
  if (hco3 > 0) add('HCO3', hco3 / HCO3_MW / 1000);

  const micro: Array<[IonMolPerL['id'], string, number]> = [
    ['Fe2', 'Fe', 55.845],
    ['Mn2', 'Mn', 54.938],
    ['Zn2', 'Zn', 65.38],
    ['Cu2', 'Cu', 63.546],
    ['MoO4', 'Mo', 95.95],
  ];
  for (const [ionId, key, mw] of micro) {
    const v = ppm[key] ?? 0;
    if (v > 0) add(ionId, v / mw / 1000);
  }

  return ions;
}

export function ionicStrengthMolPerL(ions: IonMolPerL[]): number {
  let i = 0;
  for (const { id, cMolPerL } of ions) {
    const z = LAMBDA0_BY_ION[id].z;
    i += cMolPerL * z * z;
  }
  return 0.5 * i;
}

export function limitingMolarConductivity(
  ionId: IonMolPerL['id'],
  ionicStrength: number,
): number {
  const entry = LAMBDA0_BY_ION[ionId];
  const z = entry.z;
  const sqrtI = ionicStrength > 0 ? Math.sqrt(ionicStrength) : 0;
  return entry.lambda0Scm2PerMol * Math.exp(-LMC_V2_K * sqrtI * Math.pow(z, 1.5));
}

/**
 * Estimate EC in mS/cm from elemental ppm map (working solution).
 */
export function estimateEcMsCm(
  ppm: Record<string, number>,
  options?: EcSpeciationOptions,
): number {
  const ions = elementalPpmToIons(ppm, options);
  if (ions.length === 0) return 0;
  const I = ionicStrengthMolPerL(ions);
  let ecMsCm = 0;
  for (const { id, cMolPerL } of ions) {
    const lambda = limitingMolarConductivity(id, I);
    ecMsCm += cMolPerL * lambda;
  }
  return ecMsCm;
}

/** Default EC estimator wired into the forward solver constraint hook. */
export function defaultEcEstimator(achieved: Record<string, number>): number {
  return estimateEcMsCm(achieved, { legacyNAsNitrate: achieved.N != null && achieved.N_NO3 == null });
}
