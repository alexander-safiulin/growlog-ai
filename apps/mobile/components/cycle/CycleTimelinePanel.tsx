import { CycleCalendarBlock } from '@/components/cycle/CycleCalendarBlock';
import { CycleDayDetailBlock } from '@/components/cycle/CycleDayDetailBlock';
import { CycleHarvestBlock } from '@/components/cycle/CycleHarvestBlock';
import { CycleSummaryBlock } from '@/components/cycle/CycleSummaryBlock';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  farmCalendarDateString,
  type RawCalendarEvent,
  type RawFeedingRow,
} from '@growlog/domain';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function CycleTimelinePanel() {
  const { strings, locale } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cycle;
  const { farms, farmId, cycle, recentEvents } = useFarmContext();
  const router = useRouter();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const today = farmCalendarDateString(farmTz);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthData, setMonthData] = useState<{
    events: RawCalendarEvent[];
    feedingRows: RawFeedingRow[];
  }>({ events: [], feedingRows: [] });

  useEffect(() => {
    if (selectedDate === null) setSelectedDate(today);
  }, [today, selectedDate]);

  if (!cycle) return null;

  return (
    <View style={styles.section}>
      <CycleSummaryBlock />
      <CycleHarvestBlock />
      <CycleCalendarBlock
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onMonthData={setMonthData}
      />
      {selectedDate ? (
        <>
          <View style={styles.row}>
            <Pressable
              style={styles.action}
              onPress={() =>
                router.push(`/(tabs)/more/cycle-log?kind=watering&date=${selectedDate}`)
              }
            >
              <Text style={styles.actionText}>{copy.calAddWatering}</Text>
            </Pressable>
            <Pressable
              style={styles.action}
              onPress={() =>
                router.push(`/(tabs)/more/cycle-log?kind=feeding&date=${selectedDate}`)
              }
            >
              <Text style={styles.actionText}>{copy.calAddFeeding}</Text>
            </Pressable>
          </View>
          <CycleDayDetailBlock
            date={selectedDate}
            timeZone={farmTz}
            locale={locale}
            events={monthData.events}
            feedingRows={monthData.feedingRows}
          />
        </>
      ) : null}
      {recentEvents.slice(0, 8).map((ev) => (
        <Text key={ev.id} style={styles.eventLine}>{ev.body ?? ev.event_type}</Text>
      ))}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    section: { gap: 12 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    action: {
      flex: 1,
      minWidth: 140,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    actionText: { fontSize: 14, fontWeight: '500', textAlign: 'center', color: c.text },
    eventLine: { fontSize: 14, color: c.text },
  });
}
