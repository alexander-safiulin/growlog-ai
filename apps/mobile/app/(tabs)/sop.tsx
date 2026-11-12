import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { sopRunTitle } from '@/lib/sop-utils';
import {
  fetchSopDefinitions,
  loadOpenSopRunsForCycleDay,
  SOP_OPEN_RUNS_STALE_MS,
  SOP_RUNS_QUERY_KEY,
} from '@growlog/domain';
import { SOP_IMPORT_APPLIES_SCOPE_UNCONFIRMED } from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { router, useNavigation } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CloudFeatureGate } from '@/components/auth/CloudFeatureGate';
import { useMobileLocale } from '@/context/LocaleContext';

export default function SopScreen() {
  const { strings } = useMobileLocale();
  const sop = strings.sopScreen;
  const navigation = useNavigation();
  const { supabase, farmId, cycle, farms, userId, isLocalWorkspace } = useFarmContext();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const farm = farms.find((f) => f.id === farmId);
  const cloudSop = Boolean(farmId && userId && !isLocalWorkspace);

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
      headerRight: () => (
        <Pressable
          onPress={() => router.push('/sop/new')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={createSopLabel}
          style={{ marginRight: 2, padding: 8, alignItems: 'center', justifyContent: 'center' }}
        >
          <SymbolView
            name={{ ios: 'plus', android: 'add', web: 'add' }}
            tintColor={colors.primary}
            size={22}
            weight="medium"
          />
        </Pressable>
      ),
    });
  }, [navigation, colors.primary, createSopLabel]);

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
      <Text style={styles.intro}>{sop.intro}</Text>

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
            ? new Date(r.due_at).toLocaleString(undefined, {
                dateStyle: 'short',
                timeStyle: 'short',
              })
            : null;
          return (
            <View key={r.id} style={styles.runRow}>
              <View style={styles.runInfo}>
                <Text style={styles.runTitle}>{title}</Text>
                <Text style={styles.runMeta}>
                  {r.status}
                  {dueLabel ? ` · due ${dueLabel}` : ''}
                </Text>
              </View>
              <Pressable
                style={styles.execBtn}
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
    intro: { fontSize: 14, color: c.textMuted, marginBottom: 16 },
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 16,
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
    execBtn: {
      backgroundColor: c.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
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
