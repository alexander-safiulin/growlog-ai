import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_HEATMAP_CAP,
  activityByFarmDay,
  chartPeriodBounds,
  feedingPhEcSeries,
  pairVpdFromDailyStats,
  pairVpdFromReadings,
  splitClimateReadingsByMetric,
  stageSpansForCycle,
  type ClimateDailyStatPoint,
  type ClimateReadingPoint,
  type RawFeedingRow,
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

  it('pairs VPD from readings in the same UTC second', () => {
    const readings: ClimateReadingPoint[] = [
      { capturedAt: '2026-11-09T10:00:00.100Z', metricCode: 'temp_air', value: 25, unit: 'C' },
      { capturedAt: '2026-11-09T10:00:00.800+00:00', metricCode: 'rh', value: 60, unit: '%' },
    ];
    const series = pairVpdFromReadings(readings);
    expect(series).toHaveLength(1);
    expect(series[0]!.vpdKpa).toBeGreaterThan(0);
    expect(Number.isNaN(new Date(series[0]!.x).getTime())).toBe(false);
  });

  it('does not pair readings a second apart', () => {
    const readings: ClimateReadingPoint[] = [
      { capturedAt: '2026-11-09T10:00:00.000Z', metricCode: 'temp_air', value: 25, unit: 'C' },
      { capturedAt: '2026-11-09T10:00:01.000Z', metricCode: 'rh', value: 60, unit: '%' },
    ];
    expect(pairVpdFromReadings(readings)).toHaveLength(0);
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
    const { cells, truncated } = activityByFarmDay({
      occurredAts: ['2026-11-09T08:00:00.000Z', '2026-11-09T12:00:00.000Z', 'not-a-date', '2026-11-10T08:00:00.000Z'],
      timeZone: 'UTC',
      cycleStartDate: '2026-11-09',
      today: '2026-11-10',
    });
    expect(truncated).toBe(false);
    expect(cells).toHaveLength(2);
    expect(cells[0]!.count).toBe(2);
    expect(cells[1]!.count).toBe(1);
  });

  it('caps a multi-year activity heatmap', () => {
    const { cells, truncated } = activityByFarmDay({
      occurredAts: [],
      timeZone: 'UTC',
      cycleStartDate: '2020-01-01',
      today: '2026-11-09',
    });
    expect(truncated).toBe(true);
    expect(cells).toHaveLength(ACTIVITY_HEATMAP_CAP);
    expect(cells[cells.length - 1]!.date).toBe('2026-11-09');
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
    expect(spans[0]!.toDate >= spans[0]!.fromDate).toBe(true);
    expect(splitClimateReadingsByMetric([]).temp_air).toEqual([]);
  });

  it('keeps a same-day stage change from inverting the span', () => {
    const spans = stageSpansForCycle({
      cycleStartDate: '2026-11-01',
      initialStage: 'cloning',
      stageChanges: [{ occurred_at: '2026-11-01T18:00:00.000Z', payload: { to_stage: 'veg' } }],
      timeZone: 'UTC',
      today: '2026-11-02',
    });
    expect(spans[0]!.toDate >= spans[0]!.fromDate).toBe(true);
    expect(spans.some((s) => s.stage === 'veg')).toBe(true);
  });

  it('ignores unknown stage names', () => {
    const spans = stageSpansForCycle({
      cycleStartDate: '2026-11-01',
      initialStage: 'cloning',
      stageChanges: [{ occurred_at: '2026-11-03T12:00:00.000Z', payload: { to_stage: 'not-a-stage' } }],
      timeZone: 'UTC',
      today: '2026-11-04',
    });
    expect(spans.every((s) => s.stage !== ('not-a-stage' as never))).toBe(true);
    expect(spans).toHaveLength(1);
  });

  it('does not throw on a bad timezone or a cycle that has not started', () => {
    const future = chartPeriodBounds({
      period: '7d',
      today: '2026-11-09',
      timeZone: 'Not/AZone',
      cycleStartDate: '2026-12-01',
    });
    expect(future.fromIso <= future.toIso).toBe(true);
    expect(future.fromDate <= future.toDate).toBe(true);
    expect(
      activityByFarmDay({
        occurredAts: ['bad'],
        timeZone: 'Not/AZone',
        cycleStartDate: 'nope',
        today: '2026-11-09',
      }).cells,
    ).toEqual([]);
  });

  it('drops climate readings outside a physical range', () => {
    const split = splitClimateReadingsByMetric([
      { capturedAt: '2026-11-09T10:00:00.000Z', metricCode: 'temp_air', value: 9999, unit: 'C' },
      { capturedAt: '2026-11-09T10:00:00.000Z', metricCode: 'temp_air', value: 24, unit: 'C' },
      { capturedAt: '2026-11-09T10:00:00.000Z', metricCode: 'rh', value: 140, unit: '%' },
    ]);
    expect(split.temp_air).toHaveLength(1);
    expect(split.temp_air[0]!.value).toBe(24);
    expect(split.rh).toHaveLength(0);
  });

  it('drops pH and EC outside the log range', () => {
    const series = feedingPhEcSeries([
      {
        occurred_at: '2026-11-09T10:00:00.000Z',
        ph: 40,
        ec_ms: Number.NaN,
        entry_kind: 'watering',
      } as RawFeedingRow,
    ]);
    expect(series[0]!.ph).toBeNull();
    expect(series[0]!.ecMs).toBeNull();
  });
});
