import { describe, expect, it } from 'vitest';
import {
  buildManualSopTrigger,
  isoWeekday,
  linesForManualSchedules,
  monthDay,
  recurringDailyMatchesDate,
  schedulesFromManualForm,
  stageBasedMatches,
} from '@growlog/domain';

describe('sop schedule', () => {
  it('treats 2026-11-09 as Monday and 2026-11-01 as Sunday', () => {
    expect(isoWeekday('2026-11-09')).toBe(1);
    expect(isoWeekday('2026-11-01')).toBe(7);
    expect(monthDay('2026-11-01')).toBe(1);
  });

  it('matches weekdays and month days only when listed', () => {
    expect(recurringDailyMatchesDate('2026-11-09', { weekdays: [1] })).toBe(true);
    expect(recurringDailyMatchesDate('2026-11-10', { weekdays: [1] })).toBe(false);
    expect(recurringDailyMatchesDate('2026-11-01', { month_days: [1] })).toBe(true);
    expect(recurringDailyMatchesDate('2026-11-02', { month_days: [1] })).toBe(false);
    expect(recurringDailyMatchesDate('2026-02-28', { month_days: [31] })).toBe(false);
    expect(recurringDailyMatchesDate('2026-11-10', {})).toBe(true);
  });

  it('fires stage enter and exit from the stage_changed edge, not every day in the stage', () => {
    const enter = { stages: ['flower'], when: 'enter' };
    const exit = { stages: ['flower'], when: 'exit' };
    const during = { stages: ['flower'] };
    const started = [{ fromStage: 'veg', toStage: 'flower' }];
    expect(stageBasedMatches({ cfg: enter, cycleStage: 'flower', transitions: started })).toBe(true);
    expect(stageBasedMatches({ cfg: enter, cycleStage: 'flower', transitions: [] })).toBe(false);
    expect(stageBasedMatches({ cfg: exit, cycleStage: 'drying', transitions: [{ fromStage: 'flower', toStage: 'drying' }] })).toBe(
      true
    );
    expect(stageBasedMatches({ cfg: during, cycleStage: 'flower', transitions: [] })).toBe(true);
    expect(stageBasedMatches({ cfg: during, cycleStage: 'veg', transitions: [] })).toBe(false);
  });

  it('builds a Monday trigger and a flowering-start trigger', () => {
    const monday = buildManualSopTrigger({ kind: 'weekdays', localTime: '09:00', weekdays: [1] });
    expect(monday).toEqual({
      trigger_type: 'recurring_daily',
      trigger_config: { local_time: '09:00:00', weekdays: [1] },
    });
    const flower = buildManualSopTrigger({
      kind: 'stage_enter',
      localTime: '08:30',
      stage: 'flower',
    });
    expect(flower.trigger_type).toBe('stage_based');
    expect(flower.trigger_config).toMatchObject({
      stages: ['flower'],
      when: 'enter',
      local_time: '08:30:00',
    });
  });

  it('builds dual stage triggers and preview lines', () => {
    const items = schedulesFromManualForm({
      kind: 'stage',
      localTime: '10:00',
      weekdays: [1],
      monthDayText: '1',
      stage: 'flower',
      stageEnter: true,
      stageExit: true,
    });
    expect(items).toHaveLength(2);
    const lines = linesForManualSchedules(items ?? [], {
      locale: 'en',
      stageName: (s) => s,
      labels: {
        daily: (time) => `daily ${time}`,
        weekdays: (days, time) => `${days} @ ${time}`,
        monthDay: (day, time) => `d${day} @ ${time}`,
        stageEnter: (stage, time) => `enter ${stage} @ ${time}`,
        stageExit: (stage, time) => `exit ${stage} @ ${time}`,
      },
    });
    expect(lines).toEqual(['enter flower @ 10:00', 'exit flower @ 10:00']);
  });

  it('rejects an empty weekday list and a day past 31', () => {
    expect(() => buildManualSopTrigger({ kind: 'weekdays', localTime: '09:00', weekdays: [] })).toThrow(
      'invalid_weekdays'
    );
    expect(() => buildManualSopTrigger({ kind: 'month_day', localTime: '09:00', monthDay: 32 })).toThrow(
      'invalid_month_days'
    );
  });
});
