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

function fmtRu(n: number, maxFractionDigits = 3): string {
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
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
        `K₂O → K: умножьте долю на ${fmtRu(k2oFactor, 4)}.`,
        `P₂O₅ → P: умножьте на ${fmtRu(p2o5Factor, 4)}.`,
        `Na₂O → Na: умножьте на ${fmtRu(CANONICAL_OXIDE_FACTORS.Na2O.factor, 4)}.`,
      ],
    },
    {
      id: 'ppm-from-dose',
      title: 'Пример: ppm калия из дозы',
      lines: [
        `У KNO₃ на этикетке обычно K₂O ≈ 46% и общий азот ≈ 13%; здесь считаем только калий.`,
        `После пересчёта K₂O это ≈ ${fmtRu(kPctElemental, 1)}% K по массе.`,
        `При дозе ${fmtRu(doseK, 3)} г/л получается около ${fmtRu(manualKFromDose, 1)} ppm K (в расчёте: ${fmtRu(achievedK, 1)} ppm при цели ${fmtRu(targetK, 0)} ppm).`,
      ],
    },
    {
      id: 'source-water-net',
      title: 'Пример: вычитание воды',
      lines: [
        `Цель: K = ${fmtRu(200, 0)} ppm, Ca = ${fmtRu(150, 0)} ppm. Вода: K = ${fmtRu(12, 0)}, Ca = ${fmtRu(40, 0)} ppm.`,
        `Программа считает дозы под K = ${fmtRu(waterPrep.netTarget.K ?? 0, 1)} ppm и Ca = ${fmtRu(waterPrep.netTarget.Ca ?? 0, 1)} ppm.`,
      ],
    },
    {
      id: 'ec-estimate',
      title: 'Пример: оценка EC',
      lines: [
        `Для кальциевой смеси с Ca ≈ ${fmtRu(ecSample.best.achievedPpm.Ca ?? 0, 1)} ppm оценка EC ≈ ${fmtRu(ec, 2)} мСм/см.`,
        'После смешивания сверьте с показаниями вашего EC-метра.',
      ],
    },
    {
      id: 'units-mmol-meq',
      title: 'Пример: ммоль/л и мг-экв/л',
      lines: [
        `При K = ${fmtRu(achievedK, 1)} ppm это примерно ${fmtRu(kMmol, 3)} ммоль/л и ${fmtRu(kMeq, 3)} мг-экв/л.`,
      ],
    },
  ];
}

export function examplesById(): Record<string, NutrientHelpWorkedExample> {
  const map: Record<string, NutrientHelpWorkedExample> = {};
  for (const ex of computeNutrientHelpExamples()) map[ex.id] = ex;
  return map;
}
