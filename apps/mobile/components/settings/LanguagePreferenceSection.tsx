import { SettingsDropdown } from '@/components/settings/SettingsDropdown';
import { useMobileLocale } from '@/context/LocaleContext';
import { PRODUCT_LOCALES, PRODUCT_LOCALE_LABELS } from '@growlog/domain/i18n/mobile-strings';
import { Platform, type TextStyle } from 'react-native';

/** San Francisco has no Myanmar glyphs, so the row was clipped into boxes. */
const myanmarLabel: TextStyle = {
  fontSize: 17,
  lineHeight: 36,
  ...(Platform.OS === 'ios' ? { fontFamily: 'Myanmar Sangam MN' } : null),
};

const myanmarSection: TextStyle = {
  fontSize: 15,
  lineHeight: 28,
  textTransform: 'none',
  ...(Platform.OS === 'ios' ? { fontFamily: 'Myanmar Sangam MN' } : null),
};

export function LanguagePreferenceSection() {
  const { locale, setLocale, strings } = useMobileLocale();
  const options = PRODUCT_LOCALES.map((code) => ({
    id: code,
    label: PRODUCT_LOCALE_LABELS[code],
    labelStyle: code === 'my' ? myanmarLabel : undefined,
  }));

  return (
    <SettingsDropdown
      label={strings.language.label}
      labelStyle={locale === 'my' ? myanmarSection : undefined}
      value={PRODUCT_LOCALE_LABELS[locale]}
      valueStyle={locale === 'my' ? myanmarLabel : undefined}
      options={options}
      selectedId={locale}
      onSelect={(code) => void setLocale(code)}
    />
  );
}
