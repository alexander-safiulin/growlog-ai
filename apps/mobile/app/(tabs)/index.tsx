import { useTheme } from '@/context/ThemeContext';
import { useFarmContext } from '@/providers/FarmProvider';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { anchorDateForTimezone, sopRunTitle } from '@/lib/sop-utils';
import { fetchOpenSopRuns, LOCAL_WORKSPACE_IDS, SOP_RUNS_QUERY_KEY, vpdStageLabelRu } from '@growlog/domain';
import { materializeSopRuns } from '@growlog/api-client';
import { useQuery } from '@tanstack/react-query';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    scopes,
    scopeId,
    setFarmId,
    setScopeId,
    refetchAll,
    isLocalWorkspace,
    userId,
  } = useFarmContext();
  const farm = farms.find((f) => f.id === farmId);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);

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

  const dayNumber = Math.max(
    1,
    Math.ceil((Date.now() - new Date(cycle.start_date).getTime()) / (1000 * 60 * 60 * 24))
  );
  const stageLabel = vpdStageLabelRu(cycle.stage);

  const risks = recentEvents.filter((e) => RISK_TYPES.includes(e.event_type));
  const sopRuns = sopRunsQuery.data ?? [];

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <View style={styles.contextRow}>
        <Pressable
          style={styles.placeBtn}
          accessibilityRole="button"
          accessibilityLabel={df.viewCycle}
          onPress={() => setPlaceOpen(true)}
        >
          <Text style={styles.placeName} numberOfLines={1}>
            {farm && farm.name !== cycle.name ? `${farm.name} · ` : ''}
            {cycle.name}
            {primaryScope.display_name !== cycle.name ? ` · ${primaryScope.display_name}` : ''}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </Pressable>
        <Text style={styles.contextMeta} numberOfLines={1}>
          {`D${dayNumber} · ${stageLabel} · ${df.eventsShort.replace('{count}', String(todayEvents.length))}`}
        </Text>
      </View>

      <Modal visible={placeOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setPlaceOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            {farms.length > 0 ? <Text style={styles.modalSection}>{df.placeFarms}</Text> : null}
            {farms.map((f) => (
              <Pressable
                key={f.id}
                style={styles.modalItem}
                onPress={() => {
                  if (f.id !== LOCAL_WORKSPACE_IDS.farm) setFarmId(f.id);
                  setPlaceOpen(false);
                }}
              >
                <Text style={styles.modalItemText}>
                  {f.name}
                  {f.id === farmId ? ' ✓' : ''}
                </Text>
              </Pressable>
            ))}
            {scopes.length > 0 ? <Text style={styles.modalSection}>{df.placeRooms}</Text> : null}
            {scopes.map((s) => (
              <Pressable
                key={s.id}
                style={styles.modalItem}
                onPress={() => {
                  if (s.id !== LOCAL_WORKSPACE_IDS.scope) setScopeId(s.id);
                  setPlaceOpen(false);
                }}
              >
                <Text style={styles.modalItemText}>
                  {s.display_name || s.scope_type}
                  {s.id === (scopeId ?? primaryScope.id) ? ' ✓' : ''}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

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
  );
}

function focusStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: c.screen },
    container: { padding: 16, paddingBottom: 36, gap: 12 },
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    contextRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 2,
    },
    placeBtn: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 4 },
    placeName: { fontSize: 15, fontWeight: '600', color: c.text, flexShrink: 1 },
    chevron: { fontSize: 12, color: c.textMuted },
    contextMeta: { fontSize: 13, color: c.textMuted, flexShrink: 0 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      paddingBottom: 28,
    },
    modalSection: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textMuted,
      textTransform: 'uppercase',
      marginTop: 8,
      marginBottom: 4,
    },
    modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.divider },
    modalItemText: { fontSize: 16, color: c.text },
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
