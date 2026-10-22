import { describe, expect, it } from 'vitest';
import {
  assignTankForRoles,
  classifyFertilizerRoles,
  detectStockIncompatibilities,
  scaleToStockDoses,
  type FertilizerSpec,
} from '@growlog/nutrient-calc';

describe('A/B stock tanks', () => {
  const caNitrate: FertilizerSpec = {
    id: 'ca',
    name: 'Ca(NO3)2·4H2O',
    physicalForm: 'solid',
    doseUnit: 'g_per_L',
    declaredPct: { NO3: 11.86, Ca: 16.98 },
    elementalPct: {},
  };
  const mgSulfate: FertilizerSpec = {
    id: 'mgso4',
    name: 'MgSO4·7H2O',
    physicalForm: 'solid',
    doseUnit: 'g_per_L',
    declaredPct: { S: 13.01, Mg: 9.86 },
    elementalPct: {},
  };

  it('classifies Ca vs sulfate roles', () => {
    expect(classifyFertilizerRoles(caNitrate).providesCalcium).toBe(true);
    expect(classifyFertilizerRoles(mgSulfate).providesSulfate).toBe(true);
    expect(assignTankForRoles(classifyFertilizerRoles(caNitrate))).toBe('a');
    expect(assignTankForRoles(classifyFertilizerRoles(mgSulfate))).toBe('b');
  });

  it('flags Ca + MgSO4 in same tank at stock', () => {
    const doses = [
      {
        fertilizerId: 'ca',
        fertilizerName: 'Ca nitrate',
        amountPerL: 1,
        unit: 'g_per_L' as const,
        tank: 'a' as const,
      },
      {
        fertilizerId: 'mgso4',
        fertilizerName: 'Epsom',
        amountPerL: 0.5,
        unit: 'g_per_L' as const,
        tank: 'a' as const,
      },
    ];
    const warnings = detectStockIncompatibilities([caNitrate, mgSulfate], doses);
    expect(warnings.some((w) => w.includes('stock_incompatible'))).toBe(true);
  });

  it('splits tanks and scales concentration factor 1:100', () => {
    const split = scaleToStockDoses(
      [
        {
          fertilizerId: 'ca',
          fertilizerName: 'Ca',
          amountPerL: 0.01,
          unit: 'g_per_L',
          tank: 'single',
        },
        {
          fertilizerId: 'mgso4',
          fertilizerName: 'MgSO4',
          amountPerL: 0.005,
          unit: 'g_per_L',
          tank: 'single',
        },
      ],
      [caNitrate, mgSulfate],
      { concentrationFactor: 100, fieldVolumeL: 100, stockVolumeL: 1 },
    );
    expect(split.tankA.length).toBe(1);
    expect(split.tankB.length).toBe(1);
    expect(split.tankA[0].stockAmountPerL).toBeCloseTo(1, 3);
    expect(split.tankB[0].stockAmountPerL).toBeCloseTo(0.5, 3);
    expect(split.warnings.some((w) => w.includes('stock_incompatible'))).toBe(false);
  });
});
