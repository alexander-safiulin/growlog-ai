import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  buildStageTimeline,
  cycleDayNumber,
  daysInCurrentStage,
  initialStageForMaterial,
  nextLightTransition,
  perStageDayCounters,
  stagesForStartMaterial,
} from '@growlog/domain';

describe('grow-cycle tracking', () => {
  it('counts cycle day from start date', () => {
    const day = cycleDayNumber({
      startDate: '2026-10-01',
      today: new Date('2026-10-23T12:00:00Z'),
      timeZone: 'UTC',
    });
    expect(day).toBe(23);
  });

  it('skips germination for clones', () => {
    expect(stagesForStartMaterial('clone')).not.toContain('propagation');
    expect(initialStageForMaterial('clone')).toBe('veg');
    expect(initialStageForMaterial('seed')).toBe('propagation');
  });

  it('tracks days in stage and per-stage counters', () => {
    const timeline = buildStageTimeline({
      cycleStartDate: '2026-10-01',
      initialStage: 'propagation',
      transitions: [{ toStage: 'veg', occurredAt: '2026-10-05T10:00:00Z' }],
    });
    const inVeg = daysInCurrentStage({
      timeline,
      today: new Date('2026-10-10T12:00:00Z'),
      timeZone: 'UTC',
    });
    expect(inVeg).toBe(6);
    const counters = perStageDayCounters({
      timeline,
      today: new Date('2026-10-10T12:00:00Z'),
      timeZone: 'UTC',
    });
    expect(counters.propagation).toBe(5);
    expect(counters.veg).toBe(6);
  });

  it('migrates legacy cycle recipes without deleting nutrient_recipes rows', () => {
    const sql = readFileSync('supabase/migrations/20261023150000_grow_cycle_tracking.sql', 'utf8');
    expect(sql).toContain('grow_cycle_stage_recipes');
    expect(sql).toContain('on conflict (cycle_id, stage) do nothing');
    expect(sql).not.toMatch(/delete\s+from\s+public\.nutrient_recipes/i);
  });

  it('computes light countdown for 18/6', () => {
    const result = nextLightTransition({
      schedule: { lightHoursOn: 18, lightHoursOff: 6, lightsOnAt: '06:00' },
      now: new Date('2026-10-23T15:00:00Z'),
      timeZone: 'UTC',
    });
    expect(result).not.toBeNull();
    expect(result?.mode).toBe('lights_off');
  });
});
