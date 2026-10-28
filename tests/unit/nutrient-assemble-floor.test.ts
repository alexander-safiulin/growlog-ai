import { describe, expect, it } from 'vitest';
import {
  assembleShortfallWarnings,
  solutionMeetsAssembleFloor,
  solutionPassesAssembleOvershoot,
  type FertilizerSpec,
} from '@growlog/nutrient-calc';

const target = { N: 100, P: 40, K: 150, Ca: 100, Mg: 40, S: 50 };
const caps = { N: 20, N_NO3: 20, P: 20, K: 20, Ca: 30, Mg: 30, S: 30 };

const nitrate: FertilizerSpec = {
  id: 'cano3',
  name: 'Ca(NO3)2',
  physicalForm: 'solid',
  doseUnit: 'g_per_L',
  declaredPct: { NO3: 11.86, Ca: 16.98 },
  elementalPct: {},
};

const calciumChloride: FertilizerSpec = {
  id: 'cacl2',
  name: 'CaCl2',
  physicalForm: 'solid',
  doseUnit: 'g_per_L',
  declaredPct: { Ca: 36 },
  elementalPct: {},
};

describe('assemble floor', () => {
  it('keeps a recipe when sulfur is short and N P K Ca Mg are at least 90%', () => {
    const achieved = { N: 100, P: 40, K: 150, Ca: 95, Mg: 40, S: 20 };
    expect(solutionMeetsAssembleFloor(target, achieved, 'canonical')).toBe(true);
  });

  it('rejects calcium below 90% of target', () => {
    const achieved = { N: 100, P: 40, K: 150, Ca: 80, Mg: 40, S: 50 };
    expect(solutionMeetsAssembleFloor(target, achieved, 'canonical')).toBe(false);
  });

  it('uses each element ceiling and ignores sulfur overshoot', () => {
    expect(
      solutionPassesAssembleOvershoot(target, { ...target, Ca: 128 }, 'canonical', caps),
    ).toBe(true);
    expect(
      solutionPassesAssembleOvershoot(target, { ...target, N: 125 }, 'canonical', caps),
    ).toBe(false);
    expect(
      solutionPassesAssembleOvershoot(target, { ...target, S: 200 }, 'canonical', caps),
    ).toBe(true);
  });

  it('names nitrogen when calcium nitrate cannot reach the calcium floor', () => {
    const achieved = { N: 120, P: 40, K: 150, Ca: 60, Mg: 40, S: 50 };
    const warnings = assembleShortfallWarnings(target, achieved, [nitrate], 'canonical', caps);
    expect(warnings.find((code) => code.startsWith('assemble_blocked:Ca:'))).toMatch(/:N$/);
  });

  it('does not blame the nitrogen ceiling when another calcium salt can close the gap', () => {
    const achieved = { N: 120, P: 40, K: 150, Ca: 60, Mg: 40, S: 50 };
    const warnings = assembleShortfallWarnings(
      target,
      achieved,
      [nitrate, calciumChloride],
      'canonical',
      caps,
    );
    expect(warnings.some((code) => code.startsWith('assemble_short:Ca:'))).toBe(true);
    expect(warnings.some((code) => code.startsWith('assemble_blocked:'))).toBe(false);
  });

  it('says when the shelf has no calcium salt', () => {
    const kno3: FertilizerSpec = {
      id: 'kno3',
      name: 'KNO3',
      physicalForm: 'solid',
      doseUnit: 'g_per_L',
      declaredPct: { NO3: 13, K: 38 },
      elementalPct: {},
    };
    const warnings = assembleShortfallWarnings(
      target,
      { N: 100, P: 40, K: 150, Ca: 0, Mg: 40, S: 50 },
      [kno3],
      'canonical',
      caps,
    );
    expect(warnings).toContain('assemble_missing:Ca');
  });
});
