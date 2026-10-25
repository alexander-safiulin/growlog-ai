export type ThemePreference = 'light' | 'dark' | 'harvest' | 'system';
export type ResolvedColorScheme = 'light' | 'dark';
export type ThemePalette = 'light' | 'dark' | 'harvest';

export type MobileThemeColors = {
  screen: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  tabBar: string;
  tabBarBorder: string;
  tabActive: string;
  tabInactive: string;
  primary: string;
  primaryText: string;
  sectionLabel: string;
  inputBg: string;
  inputBorder: string;
  rowActiveBg: string;
  rowActiveBorder: string;
  dangerBg: string;
  dangerText: string;
  okText: string;
  surfaceMuted: string;
  warningSurface: string;
  warningBorder: string;
  rangeBand: string;
  flashBg: string;
  divider: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
  fabBg: string;
  fabIcon: string;
  fabRing: string;
  vpdInRange: string;
  vpdBelow: string;
  vpdAbove: string;
  accentStripe: readonly string[] | null;
  overlay: string;
  placeholder: string;
  keyboardAppearance: 'light' | 'dark';
};

const light: MobileThemeColors = {
  screen: '#eef5ef',
  card: '#ffffff',
  text: '#1b4332',
  textMuted: '#6b7280',
  border: '#d8ead9',
  tabBar: '#f4faf5',
  tabBarBorder: '#d5e8d8',
  tabActive: '#1b4332',
  tabInactive: '#6b7280',
  primary: '#2d6a4f',
  primaryText: '#ffffff',
  sectionLabel: '#52796f',
  inputBg: '#ffffff',
  inputBorder: '#d1d5db',
  rowActiveBg: '#f0fdf4',
  rowActiveBorder: '#2d6a4f',
  dangerBg: '#fef2f2',
  dangerText: '#b91c1c',
  okText: '#166534',
  surfaceMuted: '#eef2f0',
  warningSurface: '#fffbeb',
  warningBorder: '#fbbf24',
  rangeBand: '#bbf7d0',
  flashBg: '#d1fae5',
  divider: '#f3f4f6',
  chipBg: '#ecfdf5',
  chipBorder: '#a7f3d0',
  chipText: '#065f46',
  fabBg: '#2d6a4f',
  fabIcon: '#ffffff',
  fabRing: '#f4faf5',
  vpdInRange: '#059669',
  vpdBelow: '#0284c7',
  vpdAbove: '#d97706',
  accentStripe: null,
  overlay: 'rgba(0,0,0,0.4)',
  placeholder: '#9ca3af',
  keyboardAppearance: 'light',
};

const dark: MobileThemeColors = {
  screen: '#101512',
  card: '#1a231c',
  text: '#e8f5e9',
  textMuted: '#9aa89e',
  border: '#2d4034',
  tabBar: '#151c16',
  tabBarBorder: '#243028',
  tabActive: '#95d5b2',
  tabInactive: '#7a8f82',
  primary: '#40916c',
  primaryText: '#ffffff',
  sectionLabel: '#74a088',
  inputBg: '#1a231c',
  inputBorder: '#3d5246',
  rowActiveBg: '#1f3328',
  rowActiveBorder: '#40916c',
  dangerBg: '#3a2020',
  dangerText: '#fca5a5',
  okText: '#86efac',
  surfaceMuted: '#243028',
  warningSurface: '#2a2418',
  warningBorder: '#ca8a04',
  rangeBand: '#2d5a40',
  flashBg: '#1f3328',
  divider: '#2d4034',
  chipBg: '#1f3328',
  chipBorder: '#40916c',
  chipText: '#86efac',
  fabBg: '#2d6a4f',
  fabIcon: '#ffffff',
  fabRing: '#f4faf5',
  vpdInRange: '#34d399',
  vpdBelow: '#38bdf8',
  vpdAbove: '#f59e0b',
  accentStripe: null,
  overlay: 'rgba(0,0,0,0.6)',
  placeholder: '#6b7c70',
  keyboardAppearance: 'dark',
};

const harvest: MobileThemeColors = {
  screen: '#0a1f16',
  card: '#12352a',
  text: '#fdf6e3',
  textMuted: '#a9c4ab',
  border: '#1f4d3b',
  tabBar: '#07170f',
  tabBarBorder: '#1f4d3b',
  tabActive: '#f6c945',
  tabInactive: '#7fa88a',
  primary: '#f6c945',
  primaryText: '#10261b',
  sectionLabel: '#9be15d',
  inputBg: '#0e2b21',
  inputBorder: '#2a5c45',
  rowActiveBg: '#1d3a22',
  rowActiveBorder: '#f6c945',
  dangerBg: '#4a1d18',
  dangerText: '#ff8a7a',
  okText: '#9be15d',
  surfaceMuted: '#0e2b21',
  warningSurface: '#3a2a0c',
  warningBorder: '#f6c945',
  rangeBand: '#2f6b35',
  flashBg: '#24563f',
  divider: '#1f4d3b',
  chipBg: '#f6c945',
  chipBorder: '#f6c945',
  chipText: '#10261b',
  fabBg: '#f6c945',
  fabIcon: '#10261b',
  fabRing: '#12352a',
  vpdInRange: '#b8f04a',
  vpdBelow: '#6cc7ff',
  vpdAbove: '#ff9f43',
  accentStripe: null,
  overlay: 'rgba(0,0,0,0.6)',
  placeholder: '#6f9479',
  keyboardAppearance: 'dark',
};

export function mobileThemeColors(palette: ThemePalette): MobileThemeColors {
  if (palette === 'dark') return dark;
  if (palette === 'harvest') return harvest;
  return light;
}

export function stackScreenOptions(c: MobileThemeColors) {
  return {
    headerTintColor: c.primary,
    headerTitleStyle: { color: c.text },
    headerStyle: { backgroundColor: c.screen },
    contentStyle: { backgroundColor: c.screen },
  };
}

export const THEME_PREFERENCE_STORAGE_KEY = 'growlog_theme_preference_v1';

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'harvest';

export function normalizeThemePreference(raw: string | null | undefined): ThemePreference {
  if (raw === 'botanical' || raw === 'midnightGrower' || raw === 'midnightHarvest') return 'harvest';
  if (raw === 'light' || raw === 'dark' || raw === 'harvest' || raw === 'system') return raw;
  return DEFAULT_THEME_PREFERENCE;
}

export function resolveThemePalette(
  preference: ThemePreference,
  systemScheme: ResolvedColorScheme | null | undefined,
): ThemePalette {
  if (preference === 'light' || preference === 'dark' || preference === 'harvest') return preference;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: ResolvedColorScheme | null | undefined,
): ResolvedColorScheme {
  return resolveThemePalette(preference, systemScheme) === 'light' ? 'light' : 'dark';
}
