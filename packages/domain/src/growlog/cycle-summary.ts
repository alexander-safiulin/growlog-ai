import type { GrowCycleStage } from './cycle-tracking';
import { cycleDayNumber, perStageDayCounters, type StageTransition } from './cycle-tracking';

export type CycleSummaryInput = {
  cycleStartDate: string;
  cycleEndDate?: string | null;
  timeZone: string;
  today?: Date;
  stageTimeline: StageTransition[];
  feedingRows: Array<{
    entry_kind: 'watering' | 'feeding';
    volume_ml: number;
    doses: Array<{
      product_label: string;
      amount_ml: number;
      fertilizer_product_id: string | null;
      farm_fertilizer_product_id: string | null;
    }>;
  }>;
  harvest: {
    wet_weight_kg: number | null;
    dry_weight_kg: number | null;
  } | null;
  plantCount: number | null;
};

export type FertilizerTotalRow = {
  key: string;
  label: string;
  totalMl: number;
};

export type CycleSummaryTotals = {
  totalDays: number;
  stageDays: Partial<Record<GrowCycleStage, number>>;
  totalWaterLiters: number;
  fertilizerTotals: FertilizerTotalRow[];
  feedingCount: number;
  wetWeightKg: number | null;
  dryWeightKg: number | null;
  gramsPerPlant: number | null;
};

export function computeCycleSummaryTotals(input: CycleSummaryInput): CycleSummaryTotals {
  const today = input.today ?? new Date();
  const endDate =
    input.cycleEndDate && input.cycleEndDate >= input.cycleStartDate
      ? input.cycleEndDate
      : undefined;
  const totalDays = endDate
    ? cycleDayNumber({ startDate: input.cycleStartDate, today: dateProbe(endDate), timeZone: input.timeZone })
    : cycleDayNumber({ startDate: input.cycleStartDate, today, timeZone: input.timeZone });

  const stageDays = perStageDayCounters({
    timeline: input.stageTimeline,
    today: endDate ? dateProbe(endDate) : today,
    timeZone: input.timeZone,
  });

  let totalWaterMl = 0;
  let feedingCount = 0;
  const fertMap = new Map<string, FertilizerTotalRow>();

  for (const row of input.feedingRows) {
    if (row.entry_kind === 'watering') {
      totalWaterMl += row.volume_ml;
    } else {
      feedingCount += 1;
      totalWaterMl += row.volume_ml;
      for (const d of row.doses) {
        const key = d.farm_fertilizer_product_id ?? d.fertilizer_product_id ?? d.product_label;
        const cur = fertMap.get(key) ?? { key, label: d.product_label, totalMl: 0 };
        cur.totalMl += d.amount_ml;
        fertMap.set(key, cur);
      }
    }
  }

  const wet = input.harvest?.wet_weight_kg ?? null;
  const dry = input.harvest?.dry_weight_kg ?? null;
  let gramsPerPlant: number | null = null;
  if (dry != null && input.plantCount != null && input.plantCount > 0) {
    gramsPerPlant = (dry * 1000) / input.plantCount;
  }

  return {
    totalDays,
    stageDays,
    totalWaterLiters: totalWaterMl / 1000,
    fertilizerTotals: [...fertMap.values()].sort((a, b) => b.totalMl - a.totalMl),
    feedingCount,
    wetWeightKg: wet,
    dryWeightKg: dry,
    gramsPerPlant,
  };
}

function dateProbe(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}
