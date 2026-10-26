import { CycleHarvestBlock } from '@/components/cycle/CycleHarvestBlock';
import { CycleStageActionsBlock } from '@/components/cycle/CycleStageActionsBlock';
import { CycleSummaryBlock } from '@/components/cycle/CycleSummaryBlock';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  buildStageTimeline,
  cycleDayNumber,
  daysInCurrentStage,
  fetchLastFeedingEvents,
  fetchLightScheduleHistory,
  fetchStageChangeEvents,
  growerStageLabelRu,
  initialStageForMaterial,
  lightSchedulePresetLabel,
  nextLightTransition,
  perStageDayCounters,
  stagesForStartMaterial,
  type GrowCycleStage,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export function CycleOverviewSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const cycleCopy = strings.cycle;
  const { supabase, farmId, farms, cycle, scopeId, isLocalWorkspace, localWorkspace } = useFarmContext();
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());

  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';

  const lastEventsQuery = useQuery({
    queryKey: ['cycle-last-feed', farmId, cycle?.id],
    enabled: visible && !!farmId && !!cycle?.id && !isLocalWorkspace,
    queryFn: () => fetchLastFeedingEvents(supabase, { farmId: farmId!, cycleId: cycle!.id }),
  });

  const stageEventsQuery = useQuery({
    queryKey: ['cycle-stage-events', farmId, cycle?.id],
    enabled: visible && !!farmId && !!cycle?.id && !isLocalWorkspace,
    queryFn: () => fetchStageChangeEvents(supabase, { farmId: farmId!, cycleId: cycle!.id }),
  });

  const lightHistoryQuery = useQuery({
    queryKey: ['cycle-light-history', cycle?.id],
    enabled: visible && !!cycle?.id && !isLocalWorkspace,
    queryFn: () => fetchLightScheduleHistory(supabase, cycle!.id),
  });

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [visible]);

  const localLast = useMemo(() => {
    if (!isLocalWorkspace || !localWorkspace) return null;
    let lastWatering: string | null = null;
    let lastFeeding: string | null = null;
    for (let i = localWorkspace.journal.length - 1; i >= 0; i -= 1) {
      const entry = localWorkspace.journal[i];
      if (entry.event_type === 'watering' && !lastWatering) lastWatering = entry.occurred_at;
      if (entry.event_type === 'feeding' && !lastFeeding) lastFeeding = entry.occurred_at;
      if (lastWatering && lastFeeding) break;
    }
    return { lastWatering, lastFeeding };
  }, [isLocalWorkspace, localWorkspace]);

  if (!cycle) return null;

  const day = cycleDayNumber({ startDate: cycle.start_date, timeZone: farmTz });
  const stageLabel = growerStageLabelRu(cycle.stage);
  const material = cycle.start_material === 'clone' ? 'clone' : 'seed';
  const stageEvents =
    isLocalWorkspace && localWorkspace
      ? localWorkspace.journal
          .filter((e) => e.event_type === 'stage_changed')
          .slice()
          .sort((a, b) => (a.occurred_at < b.occurred_at ? -1 : 1))
          .map((e) => ({ occurred_at: e.occurred_at, payload: e.payload }))
      : (stageEventsQuery.data ?? []);
  const lastFeed = isLocalWorkspace ? localLast : lastEventsQuery.data;
  const transitions = stageEvents.map((e) => ({
    toStage: (e.payload.to_stage as GrowCycleStage) ?? cycle.stage,
    occurredAt: e.occurred_at,
  }));
  const initialStage =
    (stageEvents[0]?.payload?.from_stage as GrowCycleStage | undefined) ??
    initialStageForMaterial(material);
  const timeline = buildStageTimeline({
    cycleStartDate: cycle.start_date,
    initialStage,
    transitions,
    timeZone: farmTz,
  });
  const stageDays = daysInCurrentStage({ timeline, timeZone: farmTz });
  const counters = perStageDayCounters({ timeline, timeZone: farmTz });
  const stageList = stagesForStartMaterial(material);
  const lightOn = cycle.light_hours_on ?? 18;
  const lightOff = cycle.light_hours_off ?? 6;
  const lightsOnAt = cycle.lights_on_at?.slice(0, 5) ?? '06:00';
  const countdown = nextLightTransition({
    schedule: { lightHoursOn: lightOn, lightHoursOff: lightOff, lightsOnAt },
    timeZone: farmTz,
    now,
  });

  function formatWhen(iso: string | null | undefined) {
    if (!iso) return cycleCopy.never;
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.sheetHeader}>
          <Text style={styles.title}>{cycle.name}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>{strings.commonMobile.cancel}</Text>
          </Pressable>
        </View>
        <Text style={styles.muted}>
          {stageLabel} · {cycleCopy.since} {cycle.start_date}
        </Text>
        {cycle.cultivar_name ? (
          <Text style={styles.muted}>{cycleCopy.cultivar.replace('{name}', cycle.cultivar_name)}</Text>
        ) : null}
        <Text style={styles.dayMeta}>{cycleCopy.dayOfCycle.replace('{day}', String(day))}</Text>
        <Text style={styles.muted}>{cycleCopy.stageDays.replace('{days}', String(stageDays))}</Text>

        <Text style={styles.meta}>
          {cycleCopy.lastWatering}: {formatWhen(lastFeed?.lastWatering)}
        </Text>
        <Text style={styles.meta}>
          {cycleCopy.lastFeeding}: {formatWhen(lastFeed?.lastFeeding)}
        </Text>
        <Text style={styles.meta}>
          {cycleCopy.lightSchedule}: {lightSchedulePresetLabel(lightOn, lightOff)} · {lightsOnAt}
        </Text>
        {countdown ? (
          <Text style={styles.meta}>
            {cycleCopy.lightsCountdown.replace('{event}', countdown.labelRu)}:{' '}
            {countdown.targetAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : null}
        {stageList.map((s) => {
          const d = counters[s];
          if (!d) return null;
          return (
            <Text key={s} style={styles.meta}>
              {growerStageLabelRu(s)}: {d}
            </Text>
          );
        })}
        {(lightHistoryQuery.data?.length ?? 0) > 1 ? (
          <Text style={styles.sectionTitle}>{cycleCopy.lightHistory}</Text>
        ) : null}
        {lightHistoryQuery.data?.slice(0, 3).map((row) => (
          <Text key={row.id} style={styles.meta}>
            {lightSchedulePresetLabel(row.light_hours_on, row.light_hours_off)} ·{' '}
            {row.lights_on_at?.slice(0, 5)}
          </Text>
        ))}

        {scopeId ? <CycleStageActionsBlock /> : null}
        <CycleSummaryBlock />
        <CycleHarvestBlock />

        {isLocalWorkspace ? null : (
          <Pressable
            style={styles.actionRow}
            onPress={() => {
              onClose();
              router.push('/cycle/new');
            }}
          >
            <Text style={styles.actionText}>{cycleCopy.newCycle}</Text>
          </Pressable>
        )}
      </ScrollView>
    </Modal>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    container: { padding: 16, gap: 8, backgroundColor: c.screen, paddingBottom: 32 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '600', color: c.text, flex: 1 },
    close: { fontSize: 16, color: c.primary, fontWeight: '600' },
    muted: { color: c.textMuted, fontSize: 14 },
    dayMeta: { fontSize: 14, fontWeight: '500', color: c.text },
    meta: { fontSize: 14, color: c.text },
    sectionTitle: { fontSize: 14, fontWeight: '600', marginTop: 8, color: c.text },
    actionRow: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    actionText: { fontSize: 15, fontWeight: '500', color: c.text, textAlign: 'center' },
  });
}
