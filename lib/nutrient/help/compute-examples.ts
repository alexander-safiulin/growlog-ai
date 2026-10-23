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

function fmt(n: number, digits = 3): string {
  return Number(n.toFixed(digits)).toString();
}

function fmt1(n: number): string {
  return Number(n.toFixed(1)).toString();
}

/** Deterministic numbers for help copy — must stay in sync with tests. */
export function computeNutrientHelpExamples(): NutrientHelpWorkedExample[] {
  const k2oFactor = CANONICAL_OXIDE_FACTORS.K2O.factor;
  const p2o5Factor = CANONICAL_OXIDE_FACTORS.P2O5.factor;

  const kno3: FertilizerSpec = {
    id: 'help-kno3',
    name: 'KNO₃ (пример)',
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
    name: 'Ca(NO₃)₂·4H₂O (пример)',
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

  return [
    {
      id: 'oxide-factors',
      title: 'Пример: оксиды на этикетке → элемент',
      lines: [
        `K₂O → K: умножьте долю на ${fmt(k2oFactor, 4)}.`,
        `P₂O₅ → P: умножьте на ${fmt(p2o5Factor, 4)}.`,
        `Na₂O → Na: умножьте на ${fmt(CANONICAL_OXIDE_FACTORS.Na2O.factor, 4)}.`,
      ],
    },
    {
      id: 'ppm-from-dose',
      title: 'Пример: ppm калия из дозы',
      lines: [
        `На этикетке KNO₃ указано K₂O = 46% → это ≈ ${fmt1(kPctElemental)}% чистого K.`,
        `При дозе ${fmt(doseK)} г/л получается около ${fmt1(manualKFromDose)} ppm K (в расчёте: ${fmt1(achievedK)} ppm при цели ${targetK} ppm).`,
      ],
    },
    {
      id: 'source-water-net',
      title: 'Пример: вычитание воды',
      lines: [
        `Цель: K = 200 ppm, Ca = 150 ppm. Вода: K = 12, Ca = 40 ppm.`,
        `Программа считает дозы под K = ${fmt1(waterPrep.netTarget.K ?? 0)} ppm и Ca = ${fmt1(waterPrep.netTarget.Ca ?? 0)} ppm.`,
      ],
    },
    {
      id: 'ec-estimate',
      title: 'Пример: оценка EC',
      lines: [
        `Для кальциевой смеси с Ca ≈ ${fmt1(ecSample.best.achievedPpm.Ca ?? 0)} ppm оценка EC ≈ ${fmt(ec, 2)} мСм/см.`,
        'После смешивания сверьте с показанием вашего EC-метра.',
      ],
    },
    {
      id: 'units-mmol-meq',
      title: 'Пример: mmol/L и meq/L',
      lines: [
        `При K = ${fmt1(achievedK)} ppm это примерно ${fmt(kMmol, 3)} mmol/L и ${fmt(kMeq, 3)} meq/L.`,
      ],
    },
  ];
}

export function examplesById(): Record<string, NutrientHelpWorkedExample> {
  const map: Record<string, NutrientHelpWorkedExample> = {};
  for (const ex of computeNutrientHelpExamples()) map[ex.id] = ex;
  return map;
}
