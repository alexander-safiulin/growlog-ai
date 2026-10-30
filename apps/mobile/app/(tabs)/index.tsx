import { CycleContextBar } from '@/components/layout/CycleContextBar';
import { FocusedPlantBar } from '@/components/layout/FocusedPlantBar';
import { useTheme } from '@/context/ThemeContext';
import { useFarmContext } from '@/providers/FarmProvider';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { anchorDateForTimezone, sopRunTitle } from '@/lib/sop-utils';
import { fetchOpenSopRuns, SOP_RUNS_QUERY_KEY } from '@growlog/domain';
import { materializeSopRuns } from '@growlog/api-client';
import { useQuery } from '@tanstack/react-query';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VpdWidget } from '@/components/sensors/VpdWidget';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

const RISK_TYPES = ['issue_detected', 'pest_detected', 'deficiency_suspected', 'anomaly'];

export default function DailyFocusScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => focusStyles(colors), [colors]);
  const { strings } = useMobileLocale();
  const df = strings.dailyFocus;
  const {
    supabase,
    farmId,
    cycle,
    farms,
    todayEvents,
    recentEvents,
    loading,
    primaryScope,
    refetchAll,
    isLocalWorkspace,
    userId,
  } = useFarmContext();
  const farm = farms.find((f) => f.id === farmId);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const sopRunsQuery = useQuery({
    queryKey: [SOP_RUNS_QUERY_KEY, farmId, cycle?.id, 'daily-focus'],
    enabled: !!farmId && !!cycle?.id && !!farm && !loading && !isLocalWorkspace && !!userId,
    queryFn: async () => {
      const anchorDate = anchorDateForTimezone(farm?.timezone ?? 'UTC');
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return [];
      await materializeSopRuns(token, {
        farmId: farmId!,
        cycleId: cycle!.id,
        anchorDate,
      }).catch(() => undefined);
      return fetchOpenSopRuns(supabase, { farmId: farmId!, cycleId: cycle!.id });
    },
  });

  const onRefresh = useCallback(async () => {
    if (!farmId || !cycle?.id) return;
    setRefreshing(true);
    try {
      await Promise.all([sopRunsQuery.refetch(), Promise.resolve(refetchAll())]);
    } finally {
      setRefreshing(false);
    }
  }, [sopRunsQuery, farmId, cycle?.id, refetchAll]);

  if (loading || !cycle || !primaryScope) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>{df.loading}</Text>
      </View>
    );
  }

  const risks = recentEvents.filter((e) => RISK_TYPES.includes(e.event_type));
  const sopRuns = sopRunsQuery.data ?? [];

  return (
    <View style={styles.screen}>
      <CycleContextBar eventCount={todayEvents.length} />
      <FocusedPlantBar />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
      <VpdWidget cycleStage={cycle.stage} cycleId={cycle.id} zoneId={cycle.zone_id} />

      <View style={[styles.card, risks.length > 0 && styles.riskCardHighlight]}>
        <Text style={styles.cardTitle}>{df.alertsRisks}</Text>
        {risks.length === 0 ? (
          <Text style={styles.muted}>{df.noRisks}</Text>
        ) : (
          risks.slice(0, 5).map((e) => (
            <View key={e.id} style={styles.riskRow}>
              <Text style={styles.riskType}>{e.event_type.replace(/_/g, ' ')}</Text>
              {e.body ? <Text style={styles.cardBody}>{e.body}</Text> : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{df.todaySop}</Text>
        {sopRunsQuery.isLoading && <Text style={styles.muted}>{df.loadingTasks}</Text>}
        {sopRuns.length === 0 && !sopRunsQuery.isLoading && (
          <>
            <Text style={styles.muted}>{df.noSopRuns}</Text>
            <Pressable onPress={() => router.push('/sop/new')}>
              <Text style={styles.link}>{df.createSop}</Text>
            </Pressable>
          </>
        )}
        {sopRuns.slice(0, 4).map((r) => (
          <Pressable
            key={r.id}
            style={styles.sopRow}
            onPress={() => router.push(`/sop/run/${r.id}`)}
          >
            <Text style={styles.sopTitle}>
              {sopRunTitle(r)}
              {r.status === 'overdue' ? ' · overdue' : ''}
            </Text>
            <Text style={styles.sopMeta}>{r.status}</Text>
          </Pressable>
        ))}
        {sopRuns.length > 4 && (
          <Pressable onPress={() => router.push('/(tabs)/sop')}>
            <Text style={styles.link}>View all SOP</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick actions</Text>
        <View style={styles.quickRow}>
          <Pressable style={styles.quickBtn} onPress={() => router.push('/(tabs)/more/photos')}>
            <Text style={styles.quickBtnText}>Photo</Text>
          </Pressable>
          <Pressable
            style={styles.quickBtn}
            onPress={() => {
              if (!userId) {
                router.push('/(auth)/login?reason=sensors&next=sensor');
                return;
              }
              router.push('/capture/sensor');
            }}
          >
            <Text style={styles.quickBtnText}>Sensor</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent</Text>
        {recentEvents.length === 0 ? (
          <Text style={styles.muted}>No events yet. Tap the mic to log your first entry.</Text>
        ) : (
          recentEvents.slice(0, 6).map((e) => (
            <Text key={e.id} style={styles.eventRow}>
              {e.event_type.replace(/_/g, ' ')}: {e.body?.slice(0, 60) ?? '—'}
            </Text>
          ))
        )}
        <Pressable onPress={() => router.push('/(tabs)/timeline')}>
          <Text style={styles.link}>Full timeline</Text>
        </Pressable>
      </View>
    </ScrollView>
    </View>
  );
}

function focusStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: c.screen },
    screen: { flex: 1, backgroundColor: c.screen },
    scroll: { flex: 1 },
    container: { padding: 16, paddingTop: 4, paddingBottom: 36, gap: 12 },
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    riskCardHighlight: { borderColor: c.warningBorder, backgroundColor: c.warningSurface },
    cardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.sectionLabel,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    cardBody: { fontSize: 14, color: c.text, lineHeight: 20, marginTop: 4 },
    riskRow: {
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: c.warningBorder,
    },
    riskType: {
      fontSize: 11,
      fontWeight: '700',
      color: '#b45309',
      textTransform: 'uppercase',
    },
    sopRow: {
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    sopTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    sopMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    eventRow: { fontSize: 14, color: c.text, marginBottom: 6, lineHeight: 20, opacity: 0.92 },
    muted: { color: c.textMuted, fontSize: 14 },
    link: { fontSize: 13, fontWeight: '600', color: c.primary, marginTop: 8 },
    quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    quickBtn: {
      backgroundColor: c.chipBg,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: c.chipBorder,
    },
    quickBtnText: { fontSize: 13, fontWeight: '600', color: c.chipText },
  });
}
