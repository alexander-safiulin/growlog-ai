import { useFarmContext } from '@/providers/FarmProvider';
import { useMobileLocale } from '@/context/LocaleContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  farmLocalDateString,
  LOCAL_WORKSPACE_IDS,
  farmMissingAiLocaleKey,
  persistFarmAiLocale,
  resolveAiLocaleFromFarmSettings,
  type ProductLocale,
} from '@growlog/domain';
import { postJson } from '@growlog/api-client';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const STORAGE_KEY = 'growlog_ai_locale';

type AiLocaleContextValue = {
  aiLocale: ProductLocale;
  setAiLocale: (locale: ProductLocale) => Promise<void>;
  syncing: boolean;
};

const AiLocaleContext = createContext<AiLocaleContextValue | null>(null);

export function AiLocaleProvider({ children }: { children: React.ReactNode }) {
  const { locale: uiLocale } = useMobileLocale();
  const {
    supabase,
    farmId,
    farms,
    refetchAll,
    isLocalWorkspace,
    cycle,
    primaryScope,
    displayFarmTimezone,
  } = useFarmContext();
  const farm = farms.find((f) => f.id === farmId);
  const [aiLocale, setAiLocaleState] = useState<ProductLocale>(uiLocale);
  const [syncing, setSyncing] = useState(false);
  const seededFarmAiLocaleRef = useRef<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached?.trim()) {
          setAiLocaleState(resolveAiLocaleFromFarmSettings({ ai_locale: cached }, uiLocale));
        }
      } catch {
        /* device cache optional */
      }
    })();
  }, [uiLocale]);

  useEffect(() => {
    if (!farm) {
      setAiLocaleState(uiLocale);
      return;
    }
    const resolved = resolveAiLocaleFromFarmSettings(farm.settings, uiLocale);
    setAiLocaleState(resolved);
    void AsyncStorage.setItem(STORAGE_KEY, resolved);
  }, [farm?.id, farm?.settings, farm, uiLocale]);

  useEffect(() => {
    const cloudFarm =
      farmId && !isLocalWorkspace && farmId !== LOCAL_WORKSPACE_IDS.farm && farm;
    if (!cloudFarm) return;
    if (!farmMissingAiLocaleKey(farm.settings)) return;
    if (seededFarmAiLocaleRef.current === farmId) return;
    seededFarmAiLocaleRef.current = farmId;
    const resolved = resolveAiLocaleFromFarmSettings(farm.settings, uiLocale);
    void (async () => {
      try {
        await persistFarmAiLocale(supabase, { farmId: farmId!, aiLocale: resolved });
        await refetchAll();
      } catch {
        /* seed best-effort; user can set explicitly in settings */
      }
    })();
  }, [farm, farmId, isLocalWorkspace, refetchAll, supabase, uiLocale]);

  const setAiLocale = useCallback(
    async (next: ProductLocale) => {
      setAiLocaleState(next);
      await AsyncStorage.setItem(STORAGE_KEY, next);
      const cloudFarm =
        farmId && !isLocalWorkspace && farmId !== LOCAL_WORKSPACE_IDS.farm;
      if (!cloudFarm) return;
      setSyncing(true);
      try {
        await persistFarmAiLocale(supabase, { farmId, aiLocale: next });
        await refetchAll();
        if (cycle?.id && primaryScope?.id) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (token) {
            const focusDate = farmLocalDateString(displayFarmTimezone);
            await postJson(
              '/api/focus/refresh',
              {
                farmId,
                cycleId: cycle.id,
                scopeId: primaryScope.id,
                focusDate,
                locale: next,
                force: true,
              },
              token
            );
          }
        }
      } finally {
        setSyncing(false);
      }
    },
    [farmId, isLocalWorkspace, refetchAll, supabase]
  );

  const value = useMemo(
    () => ({ aiLocale, setAiLocale, syncing }),
    [aiLocale, setAiLocale, syncing]
  );

  return <AiLocaleContext.Provider value={value}>{children}</AiLocaleContext.Provider>;
}

export function useAiLocale(): AiLocaleContextValue {
  const ctx = useContext(AiLocaleContext);
  if (!ctx) throw new Error('useAiLocale outside AiLocaleProvider');
  return ctx;
}
