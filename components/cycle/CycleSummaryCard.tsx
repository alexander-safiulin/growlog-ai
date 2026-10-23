'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import {
  buildStageTimeline,
  computeCycleSummaryTotals,
  farmDateFromIso,
  fetchCycleFeedingRowsAll,
  fetchCycleHarvestRecord,
  fetchStageChangeEvents,
  formatRuDecimal,
  growerStageLabelRu,
  initialStageForMaterial,
  type GrowCycleStage,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';

export function CycleSummaryCard() {
  const { t } = useTranslation();
  const { supabase, farmId, cycle, farms } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';

  const feedingQuery = useQuery({
    queryKey: ['cycle-summary-feed', farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id,
    queryFn: () => fetchCycleFeedingRowsAll(supabase, { farmId: farmId!, cycleId: cycle!.id }),
  });

  const harvestQuery = useQuery({
    queryKey: ['cycle-harvest', cycle?.id],
    enabled: !!cycle?.id,
    queryFn: () => fetchCycleHarvestRecord(supabase, cycle!.id),
  });

  const stageQuery = useQuery({
    queryKey: ['cycle-stage-events', farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id,
    queryFn: () => fetchStageChangeEvents(supabase, { farmId: farmId!, cycleId: cycle!.id }),
  });

  if (!cycle) return null;

  const show =
    cycle.stage === 'drying' || cycle.stage === 'curing' || cycle.stage === 'completed';
  if (!show) return null;

  const stageEvents = stageQuery.data ?? [];
  const material = cycle.start_material === 'clone' ? 'clone' : 'seed';
  const initialStage =
    (stageEvents[0]?.payload?.from_stage as GrowCycleStage | undefined) ??
    initialStageForMaterial(material);
  const transitions = stageEvents.map((e) => ({
    toStage: (e.payload.to_stage as GrowCycleStage) ?? cycle.stage,
    occurredAt: e.occurred_at,
  }));
  const timeline = buildStageTimeline({
    cycleStartDate: cycle.start_date,
    initialStage,
    transitions,
    timeZone: farmTz,
  });

  let cycleEndDate: string | null = null;
  if (cycle.stage === 'completed' || cycle.status === 'harvested') {
    const last = stageEvents[stageEvents.length - 1];
    cycleEndDate = last ? farmDateFromIso(last.occurred_at, farmTz) : null;
  }

  const totals = computeCycleSummaryTotals({
    cycleStartDate: cycle.start_date,
    cycleEndDate,
    timeZone: farmTz,
    stageTimeline: timeline,
    feedingRows: feedingQuery.data ?? [],
    harvest: harvestQuery.data
      ? {
          wet_weight_kg: harvestQuery.data.wet_weight_kg,
          dry_weight_kg: harvestQuery.data.dry_weight_kg,
        }
      : null,
    plantCount: cycle.plant_count,
  });

  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3 text-sm dark:bg-muted/20">
      <h3 className="font-semibold">{t('cycle.summaryTitle')}</h3>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">{t('cycle.summaryTotalDays')}</dt>
        <dd className="font-medium">{totals.totalDays}</dd>
        <dt className="text-muted-foreground">{t('cycle.summaryWater')}</dt>
        <dd className="font-medium">
          {formatRuDecimal(totals.totalWaterLiters, 1)} {t('cycle.summaryLiters')}
        </dd>
        <dt className="text-muted-foreground">{t('cycle.summaryFeedings')}</dt>
        <dd className="font-medium">{totals.feedingCount}</dd>
        {totals.wetWeightKg != null ? (
          <>
            <dt className="text-muted-foreground">{t('cycle.harvestWet')}</dt>
            <dd className="font-medium">{formatRuDecimal(totals.wetWeightKg, 2)} кг</dd>
          </>
        ) : null}
        {totals.dryWeightKg != null ? (
          <>
            <dt className="text-muted-foreground">{t('cycle.harvestDry')}</dt>
            <dd className="font-medium">{formatRuDecimal(totals.dryWeightKg, 2)} кг</dd>
          </>
        ) : null}
        {totals.gramsPerPlant != null ? (
          <>
            <dt className="text-muted-foreground">{t('cycle.summaryGramsPerPlant')}</dt>
            <dd className="font-medium">{formatRuDecimal(totals.gramsPerPlant, 0)} г</dd>
          </>
        ) : null}
      </dl>
      <ul className="space-y-0.5 text-xs text-muted-foreground">
        {Object.entries(totals.stageDays).map(([stage, days]) => (
          <li key={stage}>
            {t('cycle.stageCounter', {
              stage: growerStageLabelRu(stage),
              day: String(days),
            })}
          </li>
        ))}
      </ul>
      {totals.fertilizerTotals.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t('cycle.summaryFertilizer')}</p>
          <ul className="text-xs">
            {totals.fertilizerTotals.map((row) => (
              <li key={row.key}>
                {row.label}: {formatRuDecimal(row.totalMl, 0)} мл
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
