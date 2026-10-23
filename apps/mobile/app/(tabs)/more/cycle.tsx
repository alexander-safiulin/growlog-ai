import { CycleStageActionsBlock } from '@/components/cycle/CycleStageActionsBlock';
import { CycleTimelinePanel } from '@/components/cycle/CycleTimelinePanel';
import { VpdWidget } from '@/components/sensors/VpdWidget';
import { useMobileLocale } from '@/context/LocaleContext';
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
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Tab = 'overview' | 'timeline' | 'nutrition';

export default function CycleScreen() {
  const { strings } = useMobileLocale();
  const cycleCopy = strings.cycle;
  const { supabase, farmId, farms, cycle, recentEvents } = useFarmContext();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [now, setNow] = useState(() => new Date());

  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';

  const lastEventsQuery = useQuery({
    queryKey: ['cycle-last-feed', farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id,
    queryFn: () => fetchLastFeedingEvents(supabase, { farmId: farmId!, cycleId: cycle!.id }),
  });

  const stageEventsQuery = useQuery({
    queryKey: ['cycle-stage-events', farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id,
    queryFn: () => fetchStageChangeEvents(supabase, { farmId: farmId!, cycleId: cycle!.id }),
  });

  const lightHistoryQuery = useQuery({
    queryKey: ['cycle-light-history', cycle?.id],
    enabled: !!cycle?.id,
    queryFn: () => fetchLightScheduleHistory(supabase, cycle!.id),
  });

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!cycle) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: cycleCopy.screenTitle }} />
        <Text style={styles.muted}>{cycleCopy.noActive}</Text>
      </View>
    );
  }

  const day = cycleDayNumber({ startDate: cycle.start_date, timeZone: farmTz });
  const stageLabel = growerStageLabelRu(cycle.stage);
  const material = cycle.start_material === 'clone' ? 'clone' : 'seed';
  const stageEvents = stageEventsQuery.data ?? [];
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
    return `${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: cycleCopy.screenTitle }} />
      <View style={styles.header}>
        <Text style={styles.title}>{cycle.name}</Text>
        <Text style={styles.muted}>
          {stageLabel} · {cycleCopy.since} {cycle.start_date}
        </Text>
        {cycle.cultivar_name ? (
          <Text style={styles.muted}>
            {cycleCopy.cultivar.replace('{name}', cycle.cultivar_name)}
          </Text>
        ) : null}
        <Text style={styles.dayMeta}>{cycleCopy.dayOfCycle.replace('{day}', String(day))}</Text>
        <Text style={styles.muted}>{cycleCopy.stageDays.replace('{days}', String(stageDays))}</Text>
      </View>

      <View style={styles.tabs}>
        {(
          [
            ['overview', cycleCopy.tabOverview],
            ['timeline', cycleCopy.tabTimeline],
            ['nutrition', cycleCopy.tabNutrition],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            style={[styles.tabPill, tab === id && styles.tabPillActive]}
          >
            <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'overview' ? (
        <View style={styles.section}>
          <Text style={styles.meta}>
            {cycleCopy.lastWatering}: {formatWhen(lastEventsQuery.data?.lastWatering)}
          </Text>
          <Text style={styles.meta}>
            {cycleCopy.lastFeeding}: {formatWhen(lastEventsQuery.data?.lastFeeding)}
          </Text>
          <Text style={styles.meta}>
            {cycleCopy.lightSchedule}: {lightSchedulePresetLabel(lightOn, lightOff)} · {lightsOnAt}
          </Text>
          {countdown ? (
            <Text style={styles.meta}>
              {cycleCopy.lightsCountdown.replace('{event}', countdown.labelRu)}:{' '}
              {countdown.targetAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          ) : null}
          {stageList.map((s) => {
            const d = counters[s];
            if (!d) return null;
            return (
              <Text key={s} style={styles.meta}>
                {growerStageLabelRu(s)}: день {d}
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
          <CycleStageActionsBlock />
          <Pressable style={styles.actionRow} onPress={() => router.push('/(tabs)/more/cycle-log?kind=watering')}>
            <Text style={styles.actionText}>{cycleCopy.logWatering}</Text>
          </Pressable>
          <Pressable style={styles.actionRow} onPress={() => router.push('/(tabs)/more/cycle-log?kind=feeding')}>
            <Text style={styles.actionText}>{cycleCopy.logFeeding}</Text>
          </Pressable>
          <Pressable style={styles.actionRow} onPress={() => router.push('/(tabs)/more/cycle-new')}>
            <Text style={styles.actionText}>{cycleCopy.newCycle}</Text>
          </Pressable>
        </View>
      ) : null}

      {tab === 'timeline' ? <CycleTimelinePanel /> : null}

      {tab === 'nutrition' ? (
        <View style={styles.section}>
          <Pressable style={styles.actionRow} onPress={() => router.push('/(tabs)/more/nutrient')}>
            <Text style={styles.actionText}>{strings.more.nutrient}</Text>
          </Pressable>
        </View>
      ) : null}

      <VpdWidget cycleStage={cycle.stage} cycleId={cycle.id} zoneId={cycle.zone_id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  header: { gap: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  title: { fontSize: 18, fontWeight: '600' },
  muted: { color: '#666', fontSize: 14 },
  dayMeta: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  meta: { fontSize: 14, color: '#333' },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f0f0f0',
  },
  tabPillActive: { backgroundColor: '#2d6a4f' },
  tabText: { fontSize: 13, color: '#444' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  section: { gap: 8 },
  actionRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fafafa',
  },
  actionText: { fontSize: 15, fontWeight: '500' },
  eventLine: { fontSize: 14, marginBottom: 6, color: '#333' },
});
