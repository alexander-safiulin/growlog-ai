'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { normalizeProductLocale } from '@/lib/assistant/locale';
import { type ProductLocale } from '@/lib/i18n/locales';
import { resolveAiLocaleFromFarmSettings, persistFarmAiLocale } from '@growlog/domain';
import { useCallback, useMemo, useState } from 'react';

export function useFarmAiLocale() {
  const { farms, farmId, supabase, refetchAll } = useFarmContext();
  const { locale: uiLocale } = useTranslation();
  const farm = farms.find((f) => f.id === farmId);
  const [syncing, setSyncing] = useState(false);

  const aiLocale = useMemo((): ProductLocale => {
    const fallback = normalizeProductLocale(uiLocale);
    if (!farm) return fallback;
    return resolveAiLocaleFromFarmSettings(farm.settings, fallback);
  }, [farm, uiLocale]);

  const setAiLocale = useCallback(
    async (next: ProductLocale) => {
      if (!farmId) return;
      setSyncing(true);
      try {
        await persistFarmAiLocale(supabase, { farmId, aiLocale: next });
        await refetchAll();
      } finally {
        setSyncing(false);
      }
    },
    [farmId, refetchAll, supabase]
  );

  return { aiLocale, setAiLocale, syncing };
}
