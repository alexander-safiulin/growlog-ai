import { AiFocusCard } from '@/components/daily-focus/AiFocusCard';
import { useTheme } from '@/context/ThemeContext';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { sopRunTitle } from '@/lib/sop-utils';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useAiLocale } from '@/context/AiLocaleContext';
import {
  buildDailyFocusAgenda,
  deterministicDailyFocusBodyFromAgenda,
  farmLocalDayUtcBounds,
  fetchOpenSopRunsLatestActivity,
  fetchTodayDailyFocusInsight,
  fetchTodaySupplementalInsights,
  loadOpenSopRunsForCycleDay,
  previewSopTriggersForDays,
  SOP_OPEN_RUNS_STALE_MS,
  SOP_RUNS_QUERY_KEY,
  type DailyFocusInsightRow,
} from '@growlog/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFarmLocalDateString } from '@/lib/use-farm-local-date';
import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { postJson } from '@growlog/api-client';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  supabase: SupabaseClient;
  farmId: string;
  cycleId: string;
  scopeId: string;
  timezone: string;
  enabled?: boolean;
  sopLocked?: boolean;
  parentRefreshBusy?: boolean;
};

export function DailyFocusSection({
  supabase,
  farmId,
  cycleId,
  scopeId,
  timezone,
  enabled = true,
  sopLocked = false,
  parentRefreshBusy = false,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { strings } = useMobileLocale();
  const { aiLocale } = useAiLocale();
  const df = strings.dailyFocus;
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const focusDate = useFarmLocalDateString(timezone);
  const { dayStartIso, dayEndIso } = useMemo(
    () => farmLocalDayUtcBounds(focusDate, timezone),
    [focusDate, timezone]
  );

  const sopRunsQuery = useQuery({
    queryKey: [SOP_RUNS_QUERY_KEY, farmId, cycleId, 'daily-focus-merged', focusDate],
    enabled: enabled && !!farmId && !!cycleId && !sopLocked,
    staleTime: SOP_OPEN_RUNS_STALE_MS,
    queryFn: () =>
      loadOpenSopRunsForCycleDay(supabase, {
        farmId,
        cycleId,
        timezone,
        scopeId,
        anchorDate: focusDate,
      }),
  });

  const upcomingQuery = useQuery({
    queryKey: ['sop-upcoming-preview', farmId, cycleId, focusDate],
    enabled: enabled && !!farmId && !!cycleId && !sopLocked,
    staleTime: SOP_OPEN_RUNS_STALE_MS,
    queryFn: () =>
      previewSopTriggersForDays(supabase, {
        farmId,
        cycleId,
        fromDate: focusDate,
        timezone,
        days: 3,
      }),
  });

  const dailyInsightQuery = useQuery({
    queryKey: ['ai-insight-daily-focus-today', farmId, cycleId, focusDate],
    enabled: enabled && !!farmId && !!cycleId && !sopLocked,
    queryFn: () =>
      fetchTodayDailyFocusInsight(supabase, {
        farmId,
        cycleId,
        dayStartIso,
        dayEndIso,
      }),
  });

  const supplementalQuery = useQuery({
    queryKey: ['ai-insights-supplemental-today', farmId, cycleId, focusDate],
    enabled: enabled && !!farmId && !!cycleId && !sopLocked,
    queryFn: () =>
      fetchTodaySupplementalInsights(supabase, {
        farmId,
        cycleId,
        dayStartIso,
        dayEndIso,
        limit: 6,
      }),
  });

  const sopActivityQuery = useQuery({
    queryKey: ['sop-runs-max-updated', farmId, cycleId],
    enabled: enabled && !!farmId && !!cycleId && !sopLocked,
    staleTime: SOP_OPEN_RUNS_STALE_MS,
    queryFn: () => fetchOpenSopRunsLatestActivity(supabase, { farmId, cycleId }),
  });

  const agenda = useMemo(
    () =>
      buildDailyFocusAgenda({
        focusDate,
        runs: sopRunsQuery.data ?? [],
        upcoming: upcomingQuery.data ?? [],
      }),
    [focusDate, sopRunsQuery.data, upcomingQuery.data]
  );

  const insight = dailyInsightQuery.data ?? null;
  const localizedDailyFocus = useMemo(() => {
    if (!insight || insight.insight_type !== 'daily_focus') return null;
    return deterministicDailyFocusBodyFromAgenda(agenda, { locale: aiLocale });
  }, [agenda, aiLocale, insight]);

  const dailyFocusInsightForUi: DailyFocusInsightRow | null = useMemo(() => {
    if (!insight) return null;
    if (!localizedDailyFocus || insight.insight_type !== 'daily_focus') return insight;
    return {
      ...insight,
      title: localizedDailyFocus.title,
      body: localizedDailyFocus.body,
    };
  }, [insight, localizedDailyFocus]);
  const insightUpdated = insight?.updated_at ?? insight?.created_at ?? null;
  const sopUpdated = sopActivityQuery.data ?? null;
  const aiStale =
    insightUpdated != null &&
    sopUpdated != null &&
    new Date(sopUpdated).getTime() > new Date(insightUpdated).getTime();

  const requestRefresh = async () => {
    if (refreshing || parentRefreshBusy || sopLocked) return;
    setRefreshing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      await postJson(
        '/api/focus/refresh',
        { farmId, cycleId, scopeId, focusDate, locale: aiLocale, force: true },
        token
      );
      await loadOpenSopRunsForCycleDay(supabase, {
        farmId,
        cycleId,
        timezone,
        scopeId,
        anchorDate: focusDate,
        forceMaterialize: true,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [SOP_RUNS_QUERY_KEY, farmId, cycleId] }),
        queryClient.invalidateQueries({
          queryKey: ['ai-insight-daily-focus-today', farmId, cycleId, focusDate],
        }),
        queryClient.invalidateQueries({
          queryKey: ['ai-insights-supplemental-today', farmId, cycleId, focusDate],
        }),
        sopRunsQuery.refetch(),
        upcomingQuery.refetch(),
        sopActivityQuery.refetch(),
      ]);
      for (let i = 0; i < 5; i += 1) {
        if (i > 0) await new Promise((r) => setTimeout(r, 2_000));
        const result = await dailyInsightQuery.refetch();
        await supplementalQuery.refetch();
        if (result.data != null || i >= 4) break;
      }
    } finally {
      setRefreshing(false);
    }
  };

  const loading =
    !sopLocked &&
    (sopRunsQuery.isLoading || upcomingQuery.isLoading || dailyInsightQuery.isLoading);

  const showSoon = !sopLocked && !loading && agenda.upcoming.length > 0;

  return (
    <View style={styles.stack}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{df.mergedTitle}</Text>
          {!sopLocked ? (
            <Pressable
              style={styles.refreshBtn}
              onPress={() => void requestRefresh()}
              disabled={refreshing || parentRefreshBusy}
            >
              <Text style={styles.refreshBtnText}>
                {refreshing ? '…' : df.refresh}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {sopLocked ? (
          <>
            <Text style={styles.muted}>{df.sopNeedsAccount}</Text>
            <Pressable onPress={() => router.push('/(auth)/login?reason=sop')}>
              <Text style={styles.link}>{strings.cloudGate.signIn}</Text>
            </Pressable>
          </>
        ) : null}

        {!sopLocked && loading && (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
        )}

        {!sopLocked && !loading && (
          <>
            {agenda.orderedRuns.length === 0 ? (
              <>
                <Text style={styles.muted}>{df.noSopRuns}</Text>
                <Pressable onPress={() => router.push('/sop/new')}>
                  <Text style={styles.link}>{df.createSop}</Text>
                </Pressable>
              </>
            ) : (
              agenda.orderedRuns.slice(0, 6).map((item) => {
                const run = (sopRunsQuery.data ?? []).find((r) => r.id === item.runId);
                if (!run) return null;
                return (
                  <Pressable
                    key={item.runId}
                    style={styles.sopRow}
                    onPress={() => router.push(`/sop/run/${run.id}`)}
                  >
                    <Text style={styles.sopTitle}>
                      {sopRunTitle(run)}
                      {run.status === 'overdue' ? ` · ${df.overdueBadge}` : ''}
                    </Text>
                    <Text style={styles.sopMeta}>
                      {run.priority}
                      {run.reason_text ? ` · ${run.reason_text}` : ''}
                    </Text>
                  </Pressable>
                );
              })
            )}

            {agenda.orderedRuns.length > 6 ? (
              <Pressable onPress={() => router.push('/(tabs)/sop')}>
                <Text style={styles.link}>{df.viewAllSop}</Text>
              </Pressable>
            ) : null}

            <View style={styles.aiBlock}>
              {!insight ? <Text style={styles.aiBlockTitle}>{df.aiComment}</Text> : null}
              {aiStale ? <Text style={styles.staleNote}>{df.aiStale}</Text> : null}
              {dailyFocusInsightForUi ? (
                <AiFocusCard
                  insight={dailyFocusInsightForUi}
                  supabase={supabase}
                  onOpenAssistant={() => router.push('/(tabs)/assistant')}
                />
              ) : (
                <View style={styles.emptyAi}>
                  <Text style={styles.emptyAiText}>{df.noAiInsight}</Text>
                  <Text style={styles.emptyAiHint}>{df.noAiInsightHint}</Text>
                  <Pressable style={styles.emptyBtn} onPress={() => router.push('/(tabs)/assistant')}>
                    <Text style={styles.emptyBtnText}>{df.openAssistant}</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {(supplementalQuery.data ?? []).map((row) => (
              <AiFocusCard
                key={row.id}
                insight={row}
                supabase={supabase}
                onOpenAssistant={() => router.push('/(tabs)/assistant')}
              />
            ))}
          </>
        )}
      </View>

      {showSoon ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{df.soon}</Text>
          {agenda.upcoming.slice(0, 4).map((u) => (
            <Text key={`${u.triggerId}-${u.anchorDate}`} style={styles.soonLine}>
              {u.definitionTitle} — {u.anchorDate}
              {u.localTime ? ` ${u.localTime.slice(0, 5)}` : ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    stack: { gap: 12 },
    section: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    refreshBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: c.chipBg,
    },
    refreshBtnText: { fontSize: 12, fontWeight: '600', color: c.chipText },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.sectionLabel,
      textTransform: 'uppercase',
    },
    muted: { color: c.textMuted, fontSize: 14, marginTop: 4 },
    link: { fontSize: 13, fontWeight: '600', color: c.primary, marginTop: 8 },
    sopRow: {
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    sopTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    sopMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    soonLine: { fontSize: 13, color: c.textMuted, marginTop: 8, lineHeight: 18 },
    aiBlock: { marginTop: 14 },
    aiBlockTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: c.sectionLabel,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    staleNote: { fontSize: 12, color: '#b45309', marginBottom: 8 },
    emptyAi: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.inputBorder,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
    },
    emptyAiText: { fontSize: 14, fontWeight: '600', color: c.text, textAlign: 'center' },
    emptyAiHint: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 6,
      textAlign: 'center',
      lineHeight: 18,
    },
    emptyBtn: {
      marginTop: 10,
      backgroundColor: c.primary,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    emptyBtnText: { color: c.primaryText, fontWeight: '600', fontSize: 14 },
  });
}
