import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { anchorDateForTimezone, sopRunTitle } from '@/lib/sop-utils';
import {
  fetchOpenSopRuns,
  fetchSopDefinitions,
  SOP_RUNS_QUERY_KEY,
} from '@growlog/domain';
import { materializeSopRuns } from '@growlog/api-client';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
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
    queryFn: async () => {
      const anchorDate = anchorDateForTimezone(farm?.timezone ?? 'UTC');
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in');
      await materializeSopRuns(token, {
        farmId: farmId!,
        cycleId: cycle!.id,
        anchorDate,
      });
      return fetchOpenSopRuns(supabase, { farmId: farmId!, cycleId: cycle!.id });
    },
  });

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
      <Pressable style={styles.createBtn} onPress={() => router.push('/sop/new')}>
        <Text style={styles.createBtnText}>+ {strings.dailyFocus.createSop}</Text>
      </Pressable>

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
        {defsQuery.data?.map((d) => (
          <View key={d.id} style={styles.defRow}>
            <Text style={styles.defTitle}>{d.title}</Text>
            {d.description ? <Text style={styles.defDesc}>{d.description}</Text> : null}
          </View>
        ))}
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
    createBtn: {
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      marginBottom: 12,
    },
    createBtnText: { color: c.primaryText, fontWeight: '700', fontSize: 16 },
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
    defRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.divider },
    defTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    defDesc: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    muted: { fontSize: 14, color: c.textMuted },
    error: { fontSize: 14, color: c.dangerText, marginTop: 8 },
  });
}
