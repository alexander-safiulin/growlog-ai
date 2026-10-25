import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePreference } from '@/lib/mobile-theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function ThemeMark({ selected }: { selected: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.mark, { borderColor: colors.border }, selected && { borderColor: colors.primary }]}>
      {selected ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
    </View>
  );
}

export function ThemePreferenceSection() {
  const { strings } = useMobileLocale();
  const { preference, setPreference, colors } = useTheme();
  const copy = strings.appearance;

  const options: { id: ThemePreference; label: string }[] = [
    { id: 'light', label: copy.themeLight },
    { id: 'dark', label: copy.themeDark },
    { id: 'harvest', label: copy.themeHarvest },
    { id: 'system', label: copy.themeSystem },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.section, { color: colors.sectionLabel }]}>{copy.theme}</Text>
      {options.map((opt) => {
        const on = preference === opt.id;
        return (
          <Pressable
            key={opt.id}
            style={styles.row}
            onPress={() => void setPreference(opt.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <ThemeMark selected={on} />
            <Text style={[styles.label, { color: colors.text }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  section: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: { fontSize: 16 },
  mark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
