import { describe, expect, it, vi } from 'vitest';
import {
  savedRecipeIdAfterFingerprintChange,
  solutionDoseFingerprint,
  wandWorkspaceFingerprint,
} from '@/lib/nutrient/workspace/wand-recipe-session';
import type { SolveForwardResult } from '@growlog/nutrient-calc';

const result: SolveForwardResult = {
  best: {
    doses: [{ fertilizerId: 'a', fertilizerName: 'A', amountPerL: 1, unit: 'g_per_L', tank: 'A' }],
    achievedPpm: {},
    matchScore: 1,
    warnings: [],
  },
  alternatives: [],
};

describe('wand save → log feeding flow', () => {
  it('keeps saved recipe id after reload when fingerprint is unchanged (1 save, 1 log)', async () => {
    const fp = wandWorkspaceFingerprint({
      selectedIds: ['a'],
      profileSlug: 'hoagland-standard',
      volumeL: 100,
      tankMode: 'ab',
      stockFactor: 100,
      model: 'canonical',
      waterProfileId: '',
      systemStepId: '',
      doseFingerprint: solutionDoseFingerprint(result),
    });

    let savedRecipeId: string | null = null;
    let prevFp: string | null = null;

    const save = async () => {
      savedRecipeId = 'recipe-1';
    };
    const reloadFarmData = async () => {
      const fpAfterReload = wandWorkspaceFingerprint({
        selectedIds: ['a'],
        profileSlug: 'hoagland-standard',
        volumeL: 100,
        tankMode: 'ab',
        stockFactor: 100,
        model: 'canonical',
        waterProfileId: '',
        systemStepId: '',
        doseFingerprint: solutionDoseFingerprint({ ...result }),
      });
      expect(fpAfterReload).toBe(fp);
      savedRecipeId = savedRecipeIdAfterFingerprintChange(prevFp, fpAfterReload, savedRecipeId);
      prevFp = fpAfterReload;
    };

    prevFp = fp;
    await save();
    await reloadFarmData();
    expect(savedRecipeId).toBe('recipe-1');

    const logFeeding = vi.fn();
    if (!savedRecipeId) throw new Error('saveBeforeLog');
    await logFeeding({ recipeId: savedRecipeId });
    expect(logFeeding).toHaveBeenCalledTimes(1);
    expect(logFeeding).toHaveBeenCalledWith({ recipeId: 'recipe-1' });
  });
});
