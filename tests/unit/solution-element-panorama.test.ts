import { describe, expect, it } from 'vitest';
import { solutionElementPanorama } from '@/lib/nutrient/solution-element-panorama';

describe('solution element panorama', () => {
  it('sums nitrogen and colors tiles by tolerance', () => {
    const tiles = solutionElementPanorama({
      target: { N_NO3: 80, N_NH4: 20, K: 200, Fe: 2 },
      achieved: { N_NO3: 80, N_NH4: 20, K: 100, Fe: 4, Si: 3, Mo: 0.00001 },
    });

    expect(tiles.map((tile) => tile.element)).toEqual(['N', 'K', 'Fe']);
    expect(tiles[0]).toMatchObject({ achievedPpm: 100, tone: 'ok', group: 'macro' });
    expect(tiles[0]?.forms.map((form) => form.element)).toEqual(['N_NO3', 'N_NH4']);
    expect(tiles[1]).toMatchObject({ tone: 'under', group: 'macro' });
    expect(tiles[2]).toMatchObject({ tone: 'over', group: 'micro' });
  });

  it('drops a nitrogen form the mix did not deliver', () => {
    const tiles = solutionElementPanorama({
      target: { N_NO3: 80, N_NH4: 20 },
      achieved: { N_NH4: 20 },
    });
    expect(tiles[0]?.forms.map((form) => form.element)).toEqual(['N_NH4']);
  });

  it('calls unlabeled nitrogen an unknown form', () => {
    const tiles = solutionElementPanorama({
      target: { N: 50 },
      achieved: { N: 40 },
    });
    expect(tiles[0]?.forms.map((form) => form.element)).toEqual(['N_UNKNOWN']);
  });

  it('omits a target the mix did not deliver', () => {
    const tiles = solutionElementPanorama({
      target: { P: 40, K: 100 },
      achieved: { K: 100 },
    });
    expect(tiles.map((tile) => tile.element)).toEqual(['K']);
    expect(tiles[0]?.forms).toEqual([]);
  });

  it('keeps an untargeted element that is actually in the solution', () => {
    const tiles = solutionElementPanorama({
      target: {},
      achieved: { P: 12, Si: 4 },
    });
    expect(tiles.map((tile) => tile.element)).toEqual(['P']);
    expect(tiles[0]?.tone).toBe('neutral');
  });

  it('shows Si Cl Na only with the optional-ion switch', () => {
    const achieved = { Si: 4, Cl: 8, Na: 6 };
    expect(solutionElementPanorama({ target: {}, achieved })).toEqual([]);
    expect(
      solutionElementPanorama({ target: {}, achieved, showOptionalIons: true }).map((tile) => tile.element),
    ).toEqual(['Cl', 'Na', 'Si']);
  });
});
