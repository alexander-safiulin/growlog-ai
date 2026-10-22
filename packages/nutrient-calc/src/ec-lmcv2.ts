/**
 * Electrical conductivity estimate (LMCv2-style limiting molar conductivity model).
 *
 * @see packages/nutrient-calc/EC.md
 * @see https://scienceinhydroponics.com/2020/04/nutrient-solution-conductivity-estimates-in-hydrobuddy.html
 */
import { applySulfateIonPairing } from './ec-ion-pairing';
import { LAMBDA0_BY_ION } from './ec-lambda0';

export const LMC_V2_K = 0.7025187;

export const EC_ESTIMATE_DISCLAIMER =
  'EC is a model estimate from ionic strength, tabulated limiting molar conductivities, and sulfate ion-pairing; verify with a calibrated meter.';

export interface IonMolPerL {
  id: keyof typeof LAMBDA0_BY_ION;
  cMolPerL: number;
}

const N_ATOMIC = 14.007;
const P_ATOMIC = 30.974;
const S_ATOMIC = 32.06;
const HCO3_MW = 61.016;

export interface EcSpeciationOptions {
  legacyNAsNitrate?: boolean;
  phosphateForm?: 'h2po4' | 'hpo4';
}

export interface EcEstimateOptions extends EcSpeciationOptions {
  /** Apply 2:2 sulfate ion-pairing correction (default true). */
  ionPairing?: boolean;
}

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

  const p = ppm.P ?? 0;
  if (p > 0) {
    const form = options?.phosphateForm ?? 'h2po4';
    if (form === 'h2po4') add('H2PO4', p / P_ATOMIC / 1000);
    else add('HPO4', p / P_ATOMIC / 1000);
  }

  const s = ppm.S ?? 0;
  if (s > 0) add('SO4', s / S_ATOMIC / 1000);

  const macroCations: Array<[IonMolPerL['id'], string, number]> = [
    ['K', 'K', 39.098],
    ['Ca', 'Ca', 40.078],
    ['Mg', 'Mg', 24.305],
    ['Na', 'Na', 22.99],
  ];
  for (const [ionId, key, mw] of macroCations) {
    const v = ppm[key] ?? 0;
    if (v > 0) add(ionId, v / mw / 1000);
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

export function ionicStrengthMolPerL(ions: Array<{ id: string; cMolPerL: number }>): number {
  let i = 0;
  for (const { id, cMolPerL } of ions) {
    const entry = LAMBDA0_BY_ION[id];
    if (!entry) continue;
    const z = entry.z;
    i += cMolPerL * z * z;
  }
  return 0.5 * i;
}

export function limitingMolarConductivity(ionId: string, ionicStrength: number): number {
  const entry = LAMBDA0_BY_ION[ionId];
  if (!entry) return 0;
  const z = entry.z;
  const sqrtI = ionicStrength > 0 ? Math.sqrt(ionicStrength) : 0;
  return entry.lambda0Scm2PerMol * Math.exp(-LMC_V2_K * sqrtI * Math.pow(z, 1.5));
}

export function estimateEcMsCmFromIons(
  ions: Array<{ id: string; cMolPerL: number }>,
  options?: EcEstimateOptions,
): number {
  let list = ions;
  const warnings: string[] = [];
  if (options?.ionPairing !== false) {
    const paired = applySulfateIonPairing(ions);
    list = [...paired.freeMolPerL.entries()].map(([id, c]) => ({ id, cMolPerL: c }));
    warnings.push(...paired.warnings);
  }
  if (list.length === 0) return 0;
  const I = ionicStrengthMolPerL(list);
  let ecMsCm = 0;
  for (const { id, cMolPerL } of list) {
    if (cMolPerL <= 0) continue;
    const lambda = limitingMolarConductivity(id, I);
    ecMsCm += cMolPerL * lambda;
  }
  return ecMsCm;
}

export function estimateEcMsCm(
  ppm: Record<string, number>,
  options?: EcEstimateOptions,
): number {
  const pairing = options?.ionPairing ?? false;
  return estimateEcMsCmFromIons(elementalPpmToIons(ppm, options), { ...options, ionPairing: pairing });
}

/** Hoagland No.1 reference EC ~2.5 mS/cm (Science in Hydroponics / measured full-strength). */
export const HOAGLAND_NO1_REFERENCE_EC_MS_CM = 2.5;
export const HOAGLAND_NO1_EC_TOLERANCE = 0.15;

export function defaultEcEstimator(achieved: Record<string, number>): number {
  return estimateEcMsCm(achieved, {
    legacyNAsNitrate: achieved.N != null && achieved.N_NO3 == null,
    ionPairing: false,
  });
}
