import { describe, expect, it } from 'vitest';
import { evaluateSopTriggerAtAnchor } from '@growlog/domain';
import type { SopTriggerType } from '@growlog/domain';

function trigger(
  trigger_type: SopTriggerType,
  trigger_config: Record<string, unknown>,
  id = 'tr-1'
) {
  return { id, trigger_type, trigger_config, active: true };
}

describe('evaluateSopTriggerAtAnchor (preview)', () => {
  const base = {
    tz: 'UTC',
    cycleStartDate: '2026-10-20',
    cycleStage: 'drying',
    stageTransitions: [] as { fromStage: string | null; toStage: string | null }[],
    farmId: 'farm-1',
  };

  it('recurring_daily матчится на будущий день', () => {
    const res = evaluateSopTriggerAtAnchor({
      ...base,
      trigger: trigger('recurring_daily', { local_time: '09:00' }),
      anchorDate: '2026-11-12',
    });
    expect(res.kind).toBe('create');
    if (res.kind === 'create') {
      expect(res.anchorDate).toBe('2026-11-12');
    }
  });

  it('stage_based enter не матчится без transitions (preview)', () => {
    const res = evaluateSopTriggerAtAnchor({
      ...base,
      trigger: trigger('stage_based', {
        local_time: '10:00',
        stages: ['drying'],
        when: 'enter',
      }),
      anchorDate: '2026-11-12',
    });
    expect(res.kind).toBe('skip');
  });

  it('stage_based during матчится на текущей стадии', () => {
    const res = evaluateSopTriggerAtAnchor({
      ...base,
      trigger: trigger('stage_based', {
        local_time: '10:00',
        stages: ['drying'],
        when: 'during',
      }),
      anchorDate: '2026-11-12',
    });
    expect(res.kind).toBe('create');
  });
});
