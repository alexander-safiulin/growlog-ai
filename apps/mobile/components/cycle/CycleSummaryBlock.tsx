import {
  CycleFormBodyText,
  CycleFormCaption,
  CycleFormCard,
  CycleFormDivider,
  CycleFormLabel,
} from '@/components/cycle/cycle-form-ui';
import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  buildStageTimeline,
  computeCycleSummaryTotals,
  fetchCycleFeedingRowsAll,
  fetchCycleHarvestRecord,
  fetchStageChangeEvents,
  formatRuDecimal,
  growerStageLabelRu,
  initialStageForMaterial,
  type GrowCycleStage,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';

export function CycleSummaryBlock() {
  const { strings } = useMobileLocale();
  const copy = strings.cycle;
  const { supabase, farmId, cycle, farms, isLocalWorkspace } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';

  const feedingQuery = useQuery({
    queryKey: ['m-cycle-summary-feed', farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id && !isLocalWorkspace,
    queryFn: () => fetchCycleFeedingRowsAll(supabase, { farmId: farmId!, cycleId: cycle!.id }),
  });

  const harvestQuery = useQuery({
    queryKey: ['m-harvest', cycle?.id],
    enabled: !!cycle?.id && !isLocalWorkspace,
    queryFn: () => fetchCycleHarvestRecord(supabase, cycle!.id),
  });

  const stageQuery = useQuery({
    queryKey: ['m-cycle-stage-events', farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id && !isLocalWorkspace,
    queryFn: () => fetchStageChangeEvents(supabase, { farmId: farmId!, cycleId: cycle!.id }),
  });

  if (!cycle || isLocalWorkspace) return null;
  if (!['drying', 'curing', 'completed'].includes(cycle.stage)) return null;

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

  const totals = computeCycleSummaryTotals({
    cycleStartDate: cycle.start_date,
    cycleEndDate: cycle.end_date ?? null,
    timeZone: farmTz,
    stageTimeline: timeline,
    feedingRows: feedingQuery.data ?? [],
    harvest: harvestQuery.data
      ? { wet_weight_kg: harvestQuery.data.wet_weight_kg, dry_weight_kg: harvestQuery.data.dry_weight_kg }
      : null,
    plantCount: cycle.plant_count,
  });

  return (
    <CycleFormCard>
      <CycleFormLabel>{copy.summaryTitle}</CycleFormLabel>
      <CycleFormBodyText>
        {copy.summaryTotalDays}: {totals.totalDays}
      </CycleFormBodyText>
      <CycleFormBodyText>
        {copy.summaryWater}: {formatRuDecimal(totals.totalWaterLiters, 1)} {copy.summaryLiters}
      </CycleFormBodyText>
      <CycleFormBodyText>
        {copy.summaryFeedings}: {totals.feedingCount}
      </CycleFormBodyText>
      {totals.wetWeightKg != null ? (
        <CycleFormBodyText>
          {copy.harvestWet}: {formatRuDecimal(totals.wetWeightKg, 2)} кг
        </CycleFormBodyText>
      ) : null}
      {totals.dryWeightKg != null ? (
        <CycleFormBodyText>
          {copy.harvestDry}: {formatRuDecimal(totals.dryWeightKg, 2)} кг
        </CycleFormBodyText>
      ) : null}
      {totals.gramsPerPlant != null ? (
        <CycleFormBodyText>
          {copy.summaryGramsPerPlant}: {formatRuDecimal(totals.gramsPerPlant, 0)} г
        </CycleFormBodyText>
      ) : null}
      {Object.keys(totals.stageDays).length ? (
        <>
          <CycleFormDivider />
          {Object.entries(totals.stageDays).map(([stage, days]) => (
            <CycleFormCaption key={stage}>
              {growerStageLabelRu(stage)}: {days} дн.
            </CycleFormCaption>
          ))}
        </>
      ) : null}
    </CycleFormCard>
  );
}
