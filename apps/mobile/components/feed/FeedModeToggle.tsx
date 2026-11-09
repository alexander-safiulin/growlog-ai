import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type FeedViewMode = 'events' | 'charts';

export function FeedModeToggle({
  mode,
  onChange,
}: {
  mode: FeedViewMode;
  onChange: (mode: FeedViewMode) => void;
}) {
  const { strings } = useMobileLocale();
  const cc = strings.timelineScreen.charts;
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.row}>
      {(['events', 'charts'] as const).map((key) => {
        const active = mode === key;
        const label = key === 'events' ? cc.modeEvents : cc.modeCharts;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[styles.pill, active && styles.pillActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
          >
            <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.chipBorder,
      overflow: 'hidden',
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: c.chipBg,
    },
    pillActive: { backgroundColor: `${c.primary}22` },
    text: { fontSize: 12, fontWeight: '600', color: c.chipText },
    textActive: { color: c.primary },
  });
}
