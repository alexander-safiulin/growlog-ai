import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  type Theme as NavigationTheme,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme as useSystemColorScheme } from 'react-native';
import {
  DEFAULT_THEME_PREFERENCE,
  mobileThemeColors,
  normalizeThemePreference,
  resolveThemePalette,
  THEME_PREFERENCE_STORAGE_KEY,
  type MobileThemeColors,
  type ResolvedColorScheme,
  type ThemePreference,
} from '@/lib/mobile-theme';

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => Promise<void>;
  colorScheme: ResolvedColorScheme;
  colors: MobileThemeColors;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemSchemeRaw = useSystemColorScheme();
  const systemScheme: ResolvedColorScheme = systemSchemeRaw === 'dark' ? 'dark' : 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const [systemTick, setSystemTick] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)
      .then((raw) => setPreferenceState(normalizeThemePreference(raw)))
      .catch(() => setPreferenceState(DEFAULT_THEME_PREFERENCE));
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(() => setSystemTick((n) => n + 1));
    return () => sub.remove();
  }, []);

  const palette = useMemo(
    () => resolveThemePalette(preference, systemScheme),
    [preference, systemScheme, systemTick],
  );
  const colorScheme: ResolvedColorScheme = palette === 'light' ? 'light' : 'dark';

  const colors = useMemo(() => mobileThemeColors(palette), [palette]);

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = palette === 'light' ? DefaultTheme : DarkTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.screen,
        card: colors.screen,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [palette, colors]);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference, colorScheme, colors }),
    [preference, setPreference, colorScheme, colors],
  );

  return (
    <ThemeContext.Provider value={value}>
      <NavigationThemeProvider value={navigationTheme}>
        <StatusBar style={palette === 'light' ? 'dark' : 'light'} />
        {children as any}
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme outside ThemeProvider');
  return ctx;
}

export function useAppColorScheme(): ResolvedColorScheme {
  return useTheme().colorScheme;
}

export function useOptionalColorScheme(): ResolvedColorScheme {
  const ctx = useContext(ThemeContext);
  const systemSchemeRaw = useSystemColorScheme();
  const systemScheme: ResolvedColorScheme = systemSchemeRaw === 'dark' ? 'dark' : 'light';
  if (ctx) return ctx.colorScheme;
  return systemScheme;
}
