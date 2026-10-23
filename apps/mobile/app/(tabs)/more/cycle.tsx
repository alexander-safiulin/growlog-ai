import { VpdWidget } from '@/components/sensors/VpdWidget';
import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  cycleDayNumber,
  growerStageLabelRu,
  vpdStageLabelRu,
} from '@growlog/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Tab = 'overview' | 'timeline' | 'nutrition';

export default function CycleScreen() {
  const { strings } = useMobileLocale();
  const cycleCopy = strings.cycle;
  const { cycle, farms, farmId, recentEvents } = useFarmContext();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');

  if (!cycle) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>{cycleCopy.noActive}</Text>
      </View>
    );
  }

  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const day = cycleDayNumber({ startDate: cycle.start_date, timeZone: farmTz });
  const stageLabel = growerStageLabelRu(cycle.stage) || vpdStageLabelRu(cycle.stage);

  return (
    <ScrollView contentContainerStyle={styles.container}>
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

      {tab === 'timeline' ? (
        <View style={styles.section}>
          {recentEvents.slice(0, 15).map((ev) => (
            <Text key={ev.id} style={styles.eventLine}>{ev.body ?? ev.event_type}</Text>
          ))}
        </View>
      ) : null}

      {tab === 'nutrition' ? (
        <View style={styles.section}>
          <Text style={styles.muted}>{cycleCopy.tabNutrition}</Text>
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
