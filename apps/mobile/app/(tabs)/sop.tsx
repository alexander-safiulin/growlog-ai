import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { formatSopDueWhen, sopRunTitle } from '@/lib/sop-utils';
import {
  fetchSopDefinitions,
  loadOpenSopRunsForCycleDay,
  SOP_IMPORT_APPLIES_SCOPE_UNCONFIRMED,
  SOP_OPEN_RUNS_STALE_MS,
  SOP_RUNS_QUERY_KEY,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { router, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CloudFeatureGate } from '@/components/auth/CloudFeatureGate';
import { useMobileLocale } from '@/context/LocaleContext';

export default function SopScreen() {
  const { strings, locale } = useMobileLocale();
  const sop = strings.sopScreen;
  const navigation = useNavigation();
  const { supabase, farmId, cycle, farms, userId, isLocalWorkspace, displayFarmTimezone } =
    useFarmContext();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const farm = farms.find((f) => f.id === farmId);
  const cloudSop = Boolean(farmId && userId && !isLocalWorkspace);
  const canCreate = Boolean(cycle && cloudSop);
  const timeZone = farm?.timezone ?? displayFarmTimezone;

  const defsQuery = useQuery({
    queryKey: ['sop-definitions', farmId],
    enabled: cloudSop,
    queryFn: () => fetchSopDefinitions(supabase, farmId!),
  });

  const runsQuery = useQuery({
    queryKey: [SOP_RUNS_QUERY_KEY, farmId, cycle?.id],
    enabled: cloudSop && !!cycle?.id && !!farm,
    staleTime: SOP_OPEN_RUNS_STALE_MS,
    queryFn: () =>
      loadOpenSopRunsForCycleDay(supabase, {
        farmId: farmId!,
        cycleId: cycle!.id,
        timezone: farm?.timezone ?? 'UTC',
      }),
  });

  const createSopLabel = strings.dailyFocus.createSop;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: canCreate
        ? () => (
            <Pressable
              onPress={() => router.push('/sop/new')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={createSopLabel}
              style={({ pressed }) => [{ opacity: pressed ? 0.45 : 1, marginRight: 2, padding: 8 }]}
            >
              <SymbolView
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                tintColor={colors.primary}
                size={22}
                weight="medium"
              />
            </Pressable>
          )
        : () => null,
    });
  }, [navigation, colors.primary, createSopLabel, canCreate]);

  if (!cycle) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{sop.needCycle}</Text>
      </View>
    );
  }

  return (
    <CloudFeatureGate reason="sop">
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{sop.activeRuns}</Text>
        {runsQuery.isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />}
        {runsQuery.error && (
          <Text style={styles.error}>{(runsQuery.error as Error).message}</Text>
        )}
        {runsQuery.data?.length === 0 && !runsQuery.isLoading && (
          <Text style={styles.muted}>{sop.noRuns}</Text>
        )}
        {runsQuery.data?.map((r) => {
          const title = sopRunTitle(r);
          const dueLabel = r.due_at
            ? formatSopDueWhen(r.due_at, locale, timeZone, strings.timelineScreen.today)
            : null;
          const overdueLabel = strings.dailyFocus.overdueBadge;
          const statusLabel =
            r.status === 'overdue'
              ? overdueLabel.charAt(0).toLocaleUpperCase(locale) + overdueLabel.slice(1)
              : r.status === 'acknowledged'
                ? (sop.statusAcknowledged ?? null)
                : null;
          const meta = [statusLabel, dueLabel].filter(Boolean).join(' · ');
          return (
            <View key={r.id} style={styles.runRow}>
              <View style={styles.runInfo}>
                <Text style={styles.runTitle}>{title}</Text>
                {meta ? (
                  <Text style={[styles.runMeta, r.status === 'overdue' && styles.runMetaOverdue]}>
                    {meta}
                  </Text>
                ) : null}
              </View>
              <Pressable
                style={({ pressed }) => [styles.execBtn, pressed && styles.execBtnPressed]}
                onPress={() => router.push(`/sop/run/${r.id}`)}
              >
                <Text style={styles.execBtnText}>{sop.execute}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{sop.definitions}</Text>
        {defsQuery.isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />}
        {defsQuery.data?.length === 0 && !defsQuery.isLoading && (
          <Text style={styles.muted}>{sop.noDefinitions}</Text>
        )}
        {defsQuery.data?.map((d) => {
          const notes = Array.isArray(d.schedule_unparsed)
            ? d.schedule_unparsed.filter(
                (note): note is string => typeof note === 'string' && note.trim().length > 0
              )
            : [];
          return (
            <View key={d.id} style={styles.defRow}>
              <View style={styles.defTitleRow}>
                <Text style={styles.defTitle}>{d.title}</Text>
                {d.applies_to_scope ? (
                  <View style={styles.scopeBadge}>
                    <Text style={styles.scopeBadgeText}>{d.applies_to_scope}</Text>
                  </View>
                ) : null}
              </View>
              {d.description ? <Text style={styles.defDesc}>{d.description}</Text> : null}
              {notes.length > 0 ? (
                <Text style={styles.unparsedNote}>
                  {sop.scheduleUnparsed ?? 'Schedule notes'}:{' '}
                  {notes
                    .map((note) =>
                      note === SOP_IMPORT_APPLIES_SCOPE_UNCONFIRMED
                        ? (sop.scopeUnconfirmed ?? note)
                        : note
                    )
                    .join('; ')}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
    </CloudFeatureGate>
  );
}

function makeStyles(c: MobileThemeColors) {
  const softCardShadow = Platform.select({
    ios: {
      shadowColor: '#1b4332',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
    },
    android: { elevation: 1 },
    default: {},
  });

  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: c.screen,
    },
    screen: { flex: 1, backgroundColor: c.screen },
    container: { padding: 16, paddingBottom: 120 },
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      ...softCardShadow,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.sectionLabel,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    runRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    runInfo: { flex: 1 },
    runTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    runMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    runMetaOverdue: { color: c.dangerText },
    execBtn: {
      backgroundColor: c.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    execBtnPressed: { opacity: 0.85 },
    execBtnText: { color: c.primaryText, fontWeight: '600', fontSize: 13 },
    defRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.divider },
    defTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
    defTitle: { fontSize: 15, fontWeight: '600', color: c.text, flexShrink: 1 },
    scopeBadge: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: c.inputBg,
    },
    scopeBadgeText: { fontSize: 11, color: c.textMuted, fontWeight: '600' },
    defDesc: { fontSize: 13, color: c.textMuted, marginTop: 4, lineHeight: 18 },
    unparsedNote: { fontSize: 12, color: c.dangerText, marginTop: 6, lineHeight: 17, opacity: 0.85 },
    muted: { fontSize: 14, color: c.textMuted },
    error: { fontSize: 14, color: c.dangerText, marginTop: 8 },
  });
}
