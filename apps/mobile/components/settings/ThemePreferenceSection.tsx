import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { ThemePreference } from '@/lib/mobile-theme';
import { SettingsDropdown } from '@/components/settings/SettingsDropdown';

export function ThemePreferenceSection() {
  const { strings } = useMobileLocale();
  const { preference, setPreference } = useTheme();
  const copy = strings.appearance;

  const options: { id: ThemePreference; label: string }[] = [
    { id: 'light', label: copy.themeLight },
    { id: 'dark', label: copy.themeDark },
    { id: 'harvest', label: copy.themeHarvest },
    { id: 'system', label: copy.themeSystem },
  ];
  const current = options.find((option) => option.id === preference) ?? options[0];

  return (
    <SettingsDropdown
      label={copy.theme}
      value={current.label}
      options={options}
      selectedId={preference}
      onSelect={(id) => void setPreference(id)}
    />
  );
}
