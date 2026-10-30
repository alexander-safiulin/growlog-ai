import { PlacePickerSheet } from '@/components/layout/PlacePickerSheet';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { cycleDayNumber, growerStageLabelRu } from '@growlog/domain';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function CycleContextBar({
  eventCount,
  trailing,
}: {
  eventCount?: number;
  trailing?: ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { strings } = useMobileLocale();
  const { cycle, farms, farmId, primaryScope, displayFarmTimezone, loading } = useFarmContext();
  const [placeOpen, setPlaceOpen] = useState(false);

  if (loading || !cycle) {
    return <View style={{ height: insets.top, backgroundColor: colors.screen }} />;
  }

  const farm = farms.find((f) => f.id === farmId);
  const placeParts = [
    farm && farm.name !== cycle.name ? farm.name : null,
    cycle.name,
    primaryScope && primaryScope.display_name !== cycle.name ? primaryScope.display_name : null,
  ].filter((part): part is string => !!part);
  const place = placeParts.join(' · ');
  const day = cycleDayNumber({ startDate: cycle.start_date, timeZone: displayFarmTimezone });
  const stage = growerStageLabelRu(cycle.stage);
  const metaParts = [`D${day}`, stage];
  if (eventCount !== undefined) {
    metaParts.push(strings.dailyFocus.eventsShort.replace('{count}', String(eventCount)));
  }

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 12 }]}>
      <View style={styles.row}>
        <Pressable
          style={styles.placeBtn}
          accessibilityRole="button"
          accessibilityLabel={place}
          onPress={() => setPlaceOpen(true)}
        >
          <Text style={styles.placeName} numberOfLines={1}>
            {place}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </Pressable>
        <View style={styles.trailing}>
          <Text style={styles.meta} numberOfLines={1}>
            {metaParts.join(' · ')}
          </Text>
          {trailing}
        </View>
      </View>
      <PlacePickerSheet visible={placeOpen} onClose={() => setPlaceOpen(false)} />
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    bar: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      backgroundColor: c.screen,
    },
    row: {
      minHeight: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    placeBtn: {
      height: 24,
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      gap: 4,
      minWidth: 0,
    },
    placeName: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '600',
      color: c.text,
      flexShrink: 1,
      includeFontPadding: false,
    },
    chevron: { fontSize: 12, lineHeight: 20, color: c.textMuted, includeFontPadding: false },
    trailing: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
    meta: { fontSize: 13, lineHeight: 20, color: c.textMuted, includeFontPadding: false },
  });
}
