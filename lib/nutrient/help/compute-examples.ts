import {
  CANONICAL_OXIDE_FACTORS,
  declaredToElemental,
  estimateEcMsCm,
  ppmToMeq,
  ppmToMmol,
  prepareTargetWithSourceWater,
  solveForward,
  type FertilizerSpec,
} from '@growlog/nutrient-calc';
import type { NutrientHelpWorkedExample } from './types';
import { buildHelpExamples } from './example-copy';
import { normalizeHelpExampleLocale, type HelpExampleLocale } from './example-locale';

/** Deterministic numbers for help copy — must stay in sync with tests. */
export function computeNutrientHelpExamples(
  localeInput?: string | null,
): NutrientHelpWorkedExample[] {
  const locale: HelpExampleLocale = normalizeHelpExampleLocale(localeInput);
  const k2oFactor = CANONICAL_OXIDE_FACTORS.K2O.factor;
  const p2o5Factor = CANONICAL_OXIDE_FACTORS.P2O5.factor;

  const kno3: FertilizerSpec = {
    id: 'help-kno3',
    name: 'KNO₃ (example)',
    physicalForm: 'solid',
    doseUnit: 'g_per_L',
    declaredPct: { K2O: 46 },
    elementalPct: {},
  };

  const targetK = 150;
  const solveK = solveForward({
    target: { K: targetK },
    fertilizers: [kno3],
    options: { overdosePctByGroup: { K: 20 } },
  });
  const doseK = solveK.best.doses[0]?.amountPerL ?? 0;
  const achievedK = solveK.best.achievedPpm.K ?? 0;
  const elementalFromLabel = declaredToElemental({ K2O: 46 });
  const kPctElemental = elementalFromLabel.pct.K ?? 0;
  const manualKFromDose = doseK * (kPctElemental / 100) * 1000;

  const waterPrep = prepareTargetWithSourceWater(
    { K: 200, Ca: 150 },
    { ppm: { K: 12, Ca: 40, Na: 8, Cl: 15 } },
  );

  const caNo3: FertilizerSpec = {
    id: 'help-can',
    name: 'Ca(NO₃)₂·4H₂O (example)',
    physicalForm: 'solid',
    doseUnit: 'g_per_L',
    declaredPct: { Ca: 19, NO3: 11.9 },
    elementalPct: {},
  };
  const ecSample = solveForward({
    target: { Ca: 120, N_NO3: 100 },
    fertilizers: [caNo3],
    options: { overdosePctByGroup: { Ca: 30, N_NO3: 20 } },
  });
  const ec = estimateEcMsCm(ecSample.best.achievedPpm as Record<string, number>, {
    ionPairing: true,
  });

  const kMmol = ppmToMmol('K', achievedK);
  const kMeq = ppmToMeq('K', achievedK);

  return buildHelpExamples(locale, {
    k2oFactor,
    p2o5Factor,
    na2oFactor: CANONICAL_OXIDE_FACTORS.Na2O.factor,
    kPctElemental,
    doseK,
    manualKFromDose,
    achievedK,
    targetK,
    waterNetK: waterPrep.netTarget.K ?? 0,
    waterNetCa: waterPrep.netTarget.Ca ?? 0,
    caAchieved: ecSample.best.achievedPpm.Ca ?? 0,
    ec,
    kMmol,
    kMeq,
  });
}

export function examplesById(localeInput?: string | null): Record<string, NutrientHelpWorkedExample> {
  const map: Record<string, NutrientHelpWorkedExample> = {};
  for (const ex of computeNutrientHelpExamples(localeInput)) map[ex.id] = ex;
  return map;
}
