import { describe, expect, it } from 'vitest';

import { GROWER_STAGE_ORDER, immediateNextStage } from '@growlog/domain';

describe('grow cycle stage order', () => {
  it('follows harvest → drying → trimming → curing after flower', () => {
    expect(GROWER_STAGE_ORDER).toEqual([
      'propagation',
      'cloning',
      'veg',
      'preflower',
      'flower',
      'harvest',
      'drying',
      'trimming',
      'curing',
      'completed',
    ]);
    expect(immediateNextStage('flower', 'seed')).toBe('harvest');
    expect(immediateNextStage('harvest', 'seed')).toBe('drying');
    expect(immediateNextStage('drying', 'seed')).toBe('trimming');
    expect(immediateNextStage('trimming', 'seed')).toBe('curing');
    expect(immediateNextStage('curing', 'seed')).toBe('completed');
  });
});
