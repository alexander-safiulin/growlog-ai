import { describe, expect, it } from 'vitest';
import {
  assignTankForRoles,
  classifyFertilizerRoles,
  detectStockIncompatibilities,
  SALT_SOLUBILITY_G_PER_L,
  scaleToStockDoses,
  type FertilizerSpec,
} from '@growlog/nutrient-calc';

describe('A/B stock tanks', () => {
  it('NH4NO3 solubility at 20 °C within published CRC band (1500–1900 g/L)', () => {
    const row = SALT_SOLUBILITY_G_PER_L.NH4NO3;
    expect(row.gPerL).toBeGreaterThanOrEqual(1500);
    expect(row.gPerL).toBeLessThanOrEqual(1900);
    expect(row.citation).toMatch(/CRC/);
  });

  const caNitrate: FertilizerSpec = {
    id: 'ca',
    name: 'Ca(NO3)2·4H2O',
    physicalForm: 'solid',
    doseUnit: 'g_per_L',
    declaredPct: { NO3: 11.86, Ca: 16.98 },
    elementalPct: {},
    metadata: { solubility_key: 'Ca(NO3)2·4H2O' },
  };
  const mgSulfate: FertilizerSpec = {
    id: 'mgso4',
    name: 'MgSO4·7H2O',
    physicalForm: 'solid',
    doseUnit: 'g_per_L',
    declaredPct: { S: 13.01, Mg: 9.86 },
    elementalPct: {},
    metadata: { solubility_key: 'MgSO4·7H2O' },
  };
  const kno3: FertilizerSpec = {
    id: 'kno3',
    name: 'KNO3',
    physicalForm: 'solid',
    doseUnit: 'g_per_L',
    declaredPct: { NO3: 13.86, K: 38.67 },
    elementalPct: {},
    metadata: { solubility_key: 'KNO3' },
  };

  it('classifies Ca vs sulfate roles', () => {
    expect(classifyFertilizerRoles(caNitrate).providesCalcium).toBe(true);
    expect(classifyFertilizerRoles(mgSulfate).providesSulfate).toBe(true);
    expect(assignTankForRoles(classifyFertilizerRoles(caNitrate), { twoTankMode: true })).toBe('a');
    expect(assignTankForRoles(classifyFertilizerRoles(mgSulfate), { twoTankMode: true })).toBe('b');
    expect(assignTankForRoles(classifyFertilizerRoles(kno3), { twoTankMode: true })).toBe('b');
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

  it('default twoTankMode assigns every salt to A or B (no single)', () => {
    const split = scaleToStockDoses(
      [
        {
          fertilizerId: 'kno3',
          fertilizerName: 'KNO3',
          amountPerL: 0.004,
          unit: 'g_per_L',
          tank: 'single',
        },
      ],
      [kno3],
      { concentrationFactor: 100 },
    );
    expect(split.single.length).toBe(0);
    expect(split.tankB.length).toBe(1);
  });

  it('reports liquid stock in ml/L scale without g/L solubility warning', () => {
    const liquid: FertilizerSpec = {
      id: 'liq',
      name: 'Liquid feed',
      physicalForm: 'liquid',
      doseUnit: 'ml_per_L',
      declaredPct: { N: 5, P: 3, K: 4 },
      elementalPct: {},
    };
    const split = scaleToStockDoses(
      [
        {
          fertilizerId: 'liq',
          fertilizerName: 'Liquid feed',
          amountPerL: 2,
          unit: 'ml_per_L',
          tank: 'a',
        },
      ],
      [liquid],
      { concentrationFactor: 100, twoTankMode: true },
    );
    expect(split.tankA[0].stockAmountPerL).toBeCloseTo(200, 1);
    expect(split.warnings.some((w) => w.startsWith('stock_solubility_unknown'))).toBe(false);
  });

  it('two-tank mode assigns every salt to A or B (no single)', () => {
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
        {
          fertilizerId: 'kno3',
          fertilizerName: 'KNO3',
          amountPerL: 0.004,
          unit: 'g_per_L',
          tank: 'single',
        },
      ],
      [caNitrate, mgSulfate, kno3],
      { concentrationFactor: 100, twoTankMode: true, fieldVolumeL: 100, stockVolumeL: 1 },
    );
    expect(split.single.length).toBe(0);
    expect(split.tankA.length + split.tankB.length).toBe(3);
    expect(split.tankA[0].stockAmountPerL).toBeCloseTo(1, 3);
  });
});
