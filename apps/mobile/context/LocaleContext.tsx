import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  mobileStrings,
  normalizeProductLocale,
  type MobileStrings,
  type ProductLocale,
} from '@growlog/domain/i18n/mobile-strings';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'growlog_product_locale';

type LocaleContextValue = {
  locale: ProductLocale;
  strings: MobileStrings;
  setLocale: (locale: ProductLocale) => Promise<void>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<ProductLocale>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => setLocaleState(normalizeProductLocale(raw)))
      .catch(() => setLocaleState('en'));
  }, []);

  const setLocale = useCallback(async (next: ProductLocale) => {
    setLocaleState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      strings: mobileStrings(locale),
      setLocale,
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useMobileLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useMobileLocale outside LocaleProvider');
  return ctx;
}
