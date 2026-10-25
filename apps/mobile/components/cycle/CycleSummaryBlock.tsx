import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
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
import { StyleSheet, Text, View } from 'react-native';

export function CycleSummaryBlock() {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cycle;
  const { supabase, farmId, cycle, farms } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';

  const feedingQuery = useQuery({
    queryKey: ['m-cycle-summary-feed', farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id,
    queryFn: () => fetchCycleFeedingRowsAll(supabase, { farmId: farmId!, cycleId: cycle!.id }),
  });

  const harvestQuery = useQuery({
    queryKey: ['m-harvest', cycle?.id],
    enabled: !!cycle?.id,
    queryFn: () => fetchCycleHarvestRecord(supabase, cycle!.id),
  });

  const stageQuery = useQuery({
    queryKey: ['m-cycle-stage-events', farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id,
    queryFn: () => fetchStageChangeEvents(supabase, { farmId: farmId!, cycleId: cycle!.id }),
  });

  if (!cycle) return null;
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
    <View style={styles.box}>
      <Text style={styles.title}>{copy.summaryTitle}</Text>
      <Text style={styles.line}>{copy.summaryTotalDays}: {totals.totalDays}</Text>
      <Text style={styles.line}>
        {copy.summaryWater}: {formatRuDecimal(totals.totalWaterLiters, 1)} {copy.summaryLiters}
      </Text>
      <Text style={styles.line}>{copy.summaryFeedings}: {totals.feedingCount}</Text>
      {totals.wetWeightKg != null ? (
        <Text style={styles.line}>{copy.harvestWet}: {formatRuDecimal(totals.wetWeightKg, 2)} кг</Text>
      ) : null}
      {totals.dryWeightKg != null ? (
        <Text style={styles.line}>{copy.harvestDry}: {formatRuDecimal(totals.dryWeightKg, 2)} кг</Text>
      ) : null}
      {totals.gramsPerPlant != null ? (
        <Text style={styles.line}>
          {copy.summaryGramsPerPlant}: {formatRuDecimal(totals.gramsPerPlant, 0)} г
        </Text>
      ) : null}
      {Object.entries(totals.stageDays).map(([stage, days]) => (
        <Text key={stage} style={styles.muted}>
          {growerStageLabelRu(stage)}: {days} дн.
        </Text>
      ))}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    box: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, gap: 4 },
    title: { fontWeight: '600', fontSize: 15, marginBottom: 4, color: c.text },
    line: { fontSize: 14, color: c.text },
    muted: { fontSize: 12, color: c.textMuted },
  });
}
