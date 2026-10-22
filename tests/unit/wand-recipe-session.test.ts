import { describe, expect, it } from 'vitest';
import {
  solutionDoseFingerprint,
  wandWorkspaceFingerprint,
} from '@/lib/nutrient/workspace/wand-recipe-session';
import type { SolveForwardResult } from '@growlog/nutrient-calc';

const baseResult = (): SolveForwardResult => ({
  best: {
    doses: [{ fertilizerId: 'a', fertilizerName: 'A', amountPerL: 1.2, unit: 'g_per_L', tank: 'A' }],
    achievedPpm: { N_NO3: 100 },
    matchScore: 0.9,
    warnings: [],
  },
  alternatives: [],
});

describe('wand recipe session fingerprint', () => {
  it('keeps fingerprint when result object is replaced with same doses', () => {
    const fp1 = wandWorkspaceFingerprint({
      selectedIds: ['x', 'y'],
      profileSlug: 'hoagland-standard',
      volumeL: 100,
      tankMode: 'ab',
      stockFactor: 100,
      model: 'canonical',
      waterProfileId: '',
      systemStepId: '',
      doseFingerprint: solutionDoseFingerprint(baseResult()),
    });
    const fp2 = wandWorkspaceFingerprint({
      selectedIds: ['y', 'x'],
      profileSlug: 'hoagland-standard',
      volumeL: 100,
      tankMode: 'ab',
      stockFactor: 100,
      model: 'canonical',
      waterProfileId: '',
      systemStepId: '',
      doseFingerprint: solutionDoseFingerprint({ ...baseResult(), best: { ...baseResult().best } }),
    });
    expect(fp1).toBe(fp2);
  });

  it('changes fingerprint when selection changes', () => {
    const dose = solutionDoseFingerprint(baseResult());
    const a = wandWorkspaceFingerprint({
      selectedIds: ['a'],
      profileSlug: 'hoagland-standard',
      volumeL: 100,
      tankMode: 'ab',
      stockFactor: 100,
      model: 'canonical',
      waterProfileId: '',
      systemStepId: '',
      doseFingerprint: dose,
    });
    const b = wandWorkspaceFingerprint({
      selectedIds: ['b'],
      profileSlug: 'hoagland-standard',
      volumeL: 100,
      tankMode: 'ab',
      stockFactor: 100,
      model: 'canonical',
      waterProfileId: '',
      systemStepId: '',
      doseFingerprint: dose,
    });
    expect(a).not.toBe(b);
  });
});
