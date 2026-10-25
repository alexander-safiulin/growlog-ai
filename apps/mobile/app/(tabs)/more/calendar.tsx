import { CycleCalendarBlock } from '@/components/cycle/CycleCalendarBlock';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { farmCalendarDateString } from '@growlog/domain';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function CalendarScreen() {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{strings.more.calendar}</Text>
      <CycleCalendarBlock selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      {selectedDate ? (
        <View style={styles.row}>
          <Pressable
            style={styles.action}
            onPress={() => router.push(`/(tabs)/more/cycle-log?kind=watering&date=${selectedDate}`)}
          >
            <Text style={styles.actionText}>{strings.cycle.calAddWatering}</Text>
          </Pressable>
          <Pressable
            style={styles.action}
            onPress={() => router.push(`/(tabs)/more/cycle-log?kind=feeding&date=${selectedDate}`)}
          >
            <Text style={styles.actionText}>{strings.cycle.calAddFeeding}</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      backgroundColor: c.screen,
    },
    screen: { backgroundColor: c.screen },
    container: { padding: 16, gap: 12, backgroundColor: c.screen },
    title: { fontSize: 20, fontWeight: '700', color: c.text },
    muted: { color: c.textMuted },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    action: {
      flex: 1,
      minWidth: 140,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceMuted,
    },
    actionText: { fontSize: 15, fontWeight: '500', color: c.text },
  });
}
