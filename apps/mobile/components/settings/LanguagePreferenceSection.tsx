import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { PRODUCT_LOCALES, PRODUCT_LOCALE_LABELS } from '@growlog/domain/i18n/mobile-strings';
import { Pressable, StyleSheet, Text, View } from 'react-native';

function LanguageMark({ selected }: { selected: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.mark, { borderColor: colors.border }, selected && { borderColor: colors.primary }]}>
      {selected ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
    </View>
  );
}

export function LanguagePreferenceSection() {
  const { locale, setLocale, strings } = useMobileLocale();
  const { colors } = useTheme();
  const sectionLabel = strings.language.label;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.section, { color: colors.sectionLabel }]}>{sectionLabel}</Text>
      {PRODUCT_LOCALES.map((code) => {
        const on = locale === code;
        return (
          <Pressable
            key={code}
            style={styles.row}
            onPress={() => void setLocale(code)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <LanguageMark selected={on} />
            <Text style={[styles.label, { color: colors.text }]}>{PRODUCT_LOCALE_LABELS[code]}</Text>
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
