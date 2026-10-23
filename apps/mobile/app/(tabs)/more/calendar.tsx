import { CycleCalendarBlock } from '@/components/cycle/CycleCalendarBlock';
import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';
import { farmCalendarDateString } from '@growlog/domain';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function CalendarScreen() {
  const { strings } = useMobileLocale();
  const { cycle, farms, farmId } = useFarmContext();
  const router = useRouter();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDate === null) setSelectedDate(farmCalendarDateString(farmTz));
  }, [farmTz, selectedDate]);

  if (!cycle) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{strings.cycle.noActive}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{strings.more.calendar}</Text>
      <CycleCalendarBlock selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      {selectedDate ? (
        <Pressable
          style={styles.action}
          onPress={() => router.push(`/(tabs)/more/cycle-log?kind=watering&date=${selectedDate}`)}
        >
          <Text style={styles.actionText}>{strings.cycle.calAddEntry}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  container: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#1b4332' },
  muted: { color: '#52796f' },
  action: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fafafa',
  },
  actionText: { fontSize: 15, fontWeight: '500', color: '#1b4332' },
});
