import { describe, expect, it } from 'vitest';
import {
  activityByFarmDay,
  chartPeriodBounds,
  pairVpdFromDailyStats,
  pairVpdFromReadings,
  splitClimateReadingsByMetric,
  stageSpansForCycle,
  type ClimateDailyStatPoint,
  type ClimateReadingPoint,
} from '@growlog/domain';

describe('cycle-charts', () => {
  it('chartPeriodBounds uses rolling window for 7d', () => {
    const b = chartPeriodBounds({
      period: '7d',
      today: '2026-11-09',
      timeZone: 'UTC',
      cycleStartDate: '2026-11-01',
    });
    expect(b.useDailyStats).toBe(true);
    expect(b.fromDate).toBe('2026-11-03');
    expect(b.toDate).toBe('2026-11-09');
  });

  it('chartPeriodBounds clamps cycle window to cycle start', () => {
    const b = chartPeriodBounds({
      period: '30d',
      today: '2026-11-09',
      timeZone: 'UTC',
      cycleStartDate: '2026-11-07',
    });
    expect(b.fromDate).toBe('2026-11-07');
  });

  it('pairs VPD from aligned readings', () => {
    const readings: ClimateReadingPoint[] = [
      { capturedAt: '2026-11-09T10:00:00.000Z', metricCode: 'temp_air', value: 25, unit: 'C' },
      { capturedAt: '2026-11-09T10:00:00.500Z', metricCode: 'rh', value: 60, unit: '%' },
    ];
    const series = pairVpdFromReadings(readings);
    expect(series).toHaveLength(1);
    expect(series[0]!.vpdKpa).toBeGreaterThan(0);
  });

  it('pairs VPD from daily averages', () => {
    const stats: ClimateDailyStatPoint[] = [
      {
        statDate: '2026-11-09',
        metricCode: 'temp_air',
        min: 22,
        max: 26,
        avg: 24,
        readingCount: 3,
      },
      {
        statDate: '2026-11-09',
        metricCode: 'rh',
        min: 50,
        max: 70,
        avg: 60,
        readingCount: 3,
      },
    ];
    const series = pairVpdFromDailyStats(stats);
    expect(series).toHaveLength(1);
    expect(series[0]!.fromDailyAvg).toBe(true);
  });

  it('counts activity per farm day', () => {
    const cells = activityByFarmDay({
      occurredAts: ['2026-11-09T08:00:00.000Z', '2026-11-09T12:00:00.000Z', '2026-11-10T08:00:00.000Z'],
      timeZone: 'UTC',
      cycleStartDate: '2026-11-09',
      today: '2026-11-10',
    });
    expect(cells).toHaveLength(2);
    expect(cells[0]!.count).toBe(2);
    expect(cells[1]!.count).toBe(1);
  });

  it('builds stage spans from timeline', () => {
    const spans = stageSpansForCycle({
      cycleStartDate: '2026-11-01',
      initialStage: 'cloning',
      stageChanges: [{ occurred_at: '2026-11-05T12:00:00.000Z', payload: { to_stage: 'veg' } }],
      timeZone: 'UTC',
      today: '2026-11-09',
    });
    expect(spans.length).toBeGreaterThanOrEqual(2);
    expect(spans[0]!.stage).toBe('cloning');
    expect(splitClimateReadingsByMetric([]).temp_air).toEqual([]);
  });
});
