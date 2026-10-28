/**
 * LMCv2-style EC from elemental ppm.
 */
import { crcEcMsCmAt001N } from './ec-electrolyte';
import { applySulfateIonPairing } from './ec-ion-pairing';
import { LAMBDA0_BY_ION } from './ec-lambda0';
import { unspecifiedNitrogenPpm } from './nitrogen-target';

export const LMC_V2_K = 0.7025187;

export const EC_ESTIMATE_DISCLAIMER =
  'EC is a model estimate (LMCv2 + optional sulfate ion pairing); verify with a calibrated meter.';

export const EC_WARNING_SULFATE_PAIRING_UNCERTAIN = 'ec_sulfate_ion_pairing_uncertain';

export interface IonMolPerL {
  id: keyof typeof LAMBDA0_BY_ION;
  cMolPerL: number;
}

const N_ATOMIC = 14.007;

function positivePpm(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}
const P_ATOMIC = 30.974;
const S_ATOMIC = 32.06;
const HCO3_MW = 61.016;

export interface EcSpeciationOptions {
  /**
   * Callers still pass this. Unspecified N is always a nitrate ion; form keys are added
   * beside it, and `N` is not dropped when they are present.
   */
  legacyNAsNitrate?: boolean;
  phosphateForm?: 'h2po4' | 'hpo4';
}

export interface EcEstimateOptions extends EcSpeciationOptions {
  ionPairing?: boolean;
}

export interface EcMsCmRange {
  low: number;
  high: number;
}

export interface EcEstimateResult {
  ecMsCm: number;
  warnings: string[];
  /** Present when sulfate pairing makes the point estimate unreliable vs published κ. */
  ecMsCmRange?: EcMsCmRange;
}

export function elementalPpmToIons(
  ppm: Record<string, number>,
  options?: EcSpeciationOptions,
): IonMolPerL[] {
  const ions: IonMolPerL[] = [];
  const add = (id: IonMolPerL['id'], cMolPerL: number) => {
    if (cMolPerL > 1e-15) ions.push({ id, cMolPerL });
  };

  const nNo3 = positivePpm(ppm.N_NO3);
  const nNh4 = positivePpm(ppm.N_NH4);
  // Unspecified N is stored twice (`N` and `N_UNKNOWN`). It is not a copy of the form
  // keys, so it stays in the nitrate term beside NO3/NH4. Urea carries almost no current.
  const nitrateN = nNo3 + unspecifiedNitrogenPpm(ppm);

  add('NO3', nitrateN / N_ATOMIC / 1000);
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
    ['MoO4', 'Mo', 95.95],
  ];
  for (const [ionId, key, mw] of micro) {
    const v = ppm[key] ?? 0;
    if (v > 0) add(ionId, v / mw / 1000);
  }

  if ((ppm.Zn ?? 0) > 0) add('Zn2', (ppm.Zn ?? 0) / 65.38 / 1000);
  if ((ppm.Cu ?? 0) > 0) add('Cu2', (ppm.Cu ?? 0) / 63.546 / 1000);

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

function lmcEcFromIonList(ions: Array<{ id: string; cMolPerL: number }>): number {
  if (ions.length === 0) return 0;
  const I = ionicStrengthMolPerL(ions);
  let ecMsCm = 0;
  for (const { id, cMolPerL } of ions) {
    if (cMolPerL <= 0) continue;
    ecMsCm += cMolPerL * limitingMolarConductivity(id, I);
  }
  return ecMsCm;
}

function ionsWithOptionalPairing(
  ions: Array<{ id: string; cMolPerL: number }>,
  ionPairing: boolean,
): { list: Array<{ id: string; cMolPerL: number }>; pairingWarnings: string[] } {
  if (!ionPairing) return { list: ions, pairingWarnings: [] };
  const I0 = ionicStrengthMolPerL(ions);
  const paired = applySulfateIonPairing(ions, I0);
  const list = [...paired.freeMolPerL.entries()].map(([id, cMolPerL]) => ({ id, cMolPerL }));
  return { list, pairingWarnings: paired.warnings };
}

function hasSulfateDivalentCation(ions: Array<{ id: string; cMolPerL: number }>): boolean {
  const so4 = ions.find((i) => i.id === 'SO4')?.cMolPerL ?? 0;
  if (so4 <= 1e-9) return false;
  const div = ['Ca', 'Mg', 'Zn2', 'Cu2'];
  return div.some((id) => (ions.find((i) => i.id === id)?.cMolPerL ?? 0) > 1e-9);
}

/** CRC κ at 0.01 M for pure ZnSO₄ / CuSO₄ (published), when stoichiometry matches. */
function publishedPureMetalSulfateEcMsCm(
  ions: Array<{ id: string; cMolPerL: number }>,
): number | undefined {
  const active = ions.filter((i) => i.cMolPerL > 1e-9);
  if (active.length !== 2) return undefined;
  const so4 = active.find((i) => i.id === 'SO4')?.cMolPerL;
  const zn = active.find((i) => i.id === 'Zn2')?.cMolPerL;
  const cu = active.find((i) => i.id === 'Cu2')?.cMolPerL;
  if (so4 == null) return undefined;
  const relTol = 0.02;
  if (zn != null && Math.abs(zn - so4) / so4 < relTol && Math.abs(zn - 0.01) / 0.01 < relTol) {
    return crcEcMsCmAt001N('ZnSO4');
  }
  if (cu != null && Math.abs(cu - so4) / so4 < relTol && Math.abs(cu - 0.01) / 0.01 < relTol) {
    return crcEcMsCmAt001N('CuSO4');
  }
  return undefined;
}

export function estimateEcMsCmFromIons(
  ions: Array<{ id: string; cMolPerL: number }>,
  options?: EcEstimateOptions,
): number {
  return estimateEcWithMetaFromIons(ions, options).ecMsCm;
}

export function estimateEcWithMetaFromIons(
  ions: Array<{ id: string; cMolPerL: number }>,
  options?: EcEstimateOptions,
): EcEstimateResult {
  const warnings: string[] = [];
  const unpairedEc = lmcEcFromIonList(ions);
  const usePairing = options?.ionPairing === true;
  const { list, pairingWarnings } = ionsWithOptionalPairing(ions, usePairing);
  warnings.push(...pairingWarnings);
  const pairedEc = usePairing ? lmcEcFromIonList(list) : unpairedEc;
  const ecMsCm = usePairing ? pairedEc : unpairedEc;

  let ecMsCmRange: EcMsCmRange | undefined;
  if (usePairing && hasSulfateDivalentCation(ions)) {
    let low = Math.min(unpairedEc, pairedEc);
    let high = Math.max(unpairedEc, pairedEc);
    const crcPure = publishedPureMetalSulfateEcMsCm(ions);
    if (crcPure != null) {
      low = Math.min(low, crcPure);
      high = Math.max(high, crcPure);
    }
    if (high > low * 1.001) {
      ecMsCmRange = { low, high };
      warnings.push(EC_WARNING_SULFATE_PAIRING_UNCERTAIN);
    }
  }

  return { ecMsCm, warnings, ecMsCmRange };
}

export function estimateEcWithMeta(
  ppm: Record<string, number>,
  options?: EcEstimateOptions,
): EcEstimateResult {
  return estimateEcWithMetaFromIons(elementalPpmToIons(ppm, options), options);
}

export function estimateEcMsCm(
  ppm: Record<string, number>,
  options?: EcEstimateOptions,
): number {
  return estimateEcWithMeta(ppm, options).ecMsCm;
}

export const HOAGLAND_NO1_REFERENCE_EC_MS_CM = 2.5;
export const HOAGLAND_NO1_EC_TOLERANCE = 0.15;

export function defaultEcEstimator(achieved: Record<string, number>): number {
  return estimateEcMsCm(achieved, {
    legacyNAsNitrate: achieved.N != null && achieved.N_NO3 == null,
  });
}
