import { renderHook, act } from '@testing-library/react-native';

jest.mock('@growlog/web-lib/nutrient/workspace/hooks', () => ({
  nutrientSolveInputKey: (params: { selectedProductIds: string[] }) => params.selectedProductIds.join(','),
}));

const mockSolveNutrientSelection = jest.fn(() => ({
  best: { doses: [], achievedPpm: {}, matchScore: 0, warnings: [] },
  alternatives: [],
  netTarget: {},
  solverVersion: 'test',
}));

jest.mock('@growlog/web-lib/nutrient/workspace/solve-sync', () => ({
  solveNutrientSelection: (...args: unknown[]) => mockSolveNutrientSelection(...args),
}));

import { useMobileNutrientSolve } from '@/components/nutrient/useMobileNutrientSolve';

function baseParams(selectedProductIds: string[]) {
  return {
    catalog: { target_profiles: [], elements: [] },
    unifiedProducts: [],
    selectedProductIds,
    volumeL: 100,
    model: 'canonical',
    tankMode: 'single',
    stockFactor: 100,
  };
}

describe('useMobileNutrientSolve', () => {
  beforeEach(() => {
    mockSolveNutrientSelection.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces burst selection changes into one solve', () => {
    const { rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useMobileNutrientSolve(baseParams(ids)),
      { initialProps: { ids: ['a'] } },
    );

    expect(mockSolveNutrientSelection).toHaveBeenCalledTimes(1);

    rerender({ ids: ['a', 'b'] });
    rerender({ ids: ['a', 'b', 'c'] });
    expect(mockSolveNutrientSelection).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(mockSolveNutrientSelection).toHaveBeenCalledTimes(2);
  });
});
