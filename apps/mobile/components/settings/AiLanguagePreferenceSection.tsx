import { SettingsDropdown } from '@/components/settings/SettingsDropdown';
import { useAiLocale } from '@/context/AiLocaleContext';
import { useMobileLocale } from '@/context/LocaleContext';
import { PRODUCT_LOCALES, PRODUCT_LOCALE_LABELS } from '@growlog/domain/i18n/mobile-strings';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export function AiLanguagePreferenceSection() {
  const { strings } = useMobileLocale();
  const { aiLocale, setAiLocale, syncing } = useAiLocale();
  const { colors } = useTheme();
  const lang = strings.language;

  const options = PRODUCT_LOCALES.map((code) => ({
    id: code,
    label: PRODUCT_LOCALE_LABELS[code],
  }));

  return (
    <View>
      <SettingsDropdown
        label={lang.aiLabel}
        value={PRODUCT_LOCALE_LABELS[aiLocale]}
        options={options}
        selectedId={aiLocale}
        onSelect={(code) => void setAiLocale(code)}
      />
      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: -4, marginBottom: 8 }}>
        {lang.aiHint}
      </Text>
      {syncing ? <ActivityIndicator color={colors.primary} style={{ marginBottom: 8 }} /> : null}
    </View>
  );
}
