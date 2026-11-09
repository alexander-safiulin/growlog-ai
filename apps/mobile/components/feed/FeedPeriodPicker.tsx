import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import type { FeedChartPeriod } from '@growlog/domain';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const PERIODS: FeedChartPeriod[] = ['24h', '7d', '30d', 'cycle'];

export function FeedPeriodPicker({
  period,
  onChange,
}: {
  period: FeedChartPeriod;
  onChange: (p: FeedChartPeriod) => void;
}) {
  const { strings } = useMobileLocale();
  const cc = strings.timelineScreen.charts;
  const styles = useThemedStyles(makeStyles);
  const labels: Record<FeedChartPeriod, string> = {
    '24h': cc.period24h,
    '7d': cc.period7d,
    '30d': cc.period30d,
    cycle: cc.periodCycle,
  };

  return (
    <View style={styles.row}>
      {PERIODS.map((p) => {
        const active = period === p;
        return (
          <Pressable
            key={p}
            onPress={() => onChange(p)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.text, active && styles.textActive]}>{labels[p]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    chipActive: { borderColor: c.primary, backgroundColor: `${c.primary}14` },
    text: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    textActive: { color: c.primary },
  });
}
