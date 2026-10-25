import { CloudFeatureGate } from '@/components/auth/CloudFeatureGate';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { anchorDateForTimezone } from '@/lib/sop-utils';
import { generateReport } from '@growlog/api-client';
import { fetchReportsForFarm, REPORT_TYPES } from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function ReportsListScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { supabase, farmId, cycle, primaryScope, farms } = useFarmContext();
  const farm = farms.find((f) => f.id === farmId);
  const today = useMemo(
    () => anchorDateForTimezone(farm?.timezone ?? 'UTC'),
    [farm?.timezone]
  );

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reportType, setReportType] = useState('daily');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['reports', farmId],
    enabled: !!farmId,
    queryFn: () => fetchReportsForFarm(supabase, farmId!),
  });

  async function onGenerate() {
    if (!farmId || !cycle) return;
    setError(null);
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in');
      const j = await generateReport(token, {
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope?.id ?? null,
        reportType,
        audienceType: 'internal_operational',
        outputFormat: 'html',
        startDate,
        endDate,
      });
      await listQuery.refetch();
      if (j.reportId) router.push(`/(tabs)/more/reports/${j.reportId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generate failed');
    } finally {
      setBusy(false);
    }
  }

  if (!cycle) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>An active cycle is required.</Text>
      </View>
    );
  }

  return (
    <CloudFeatureGate reason="reports">
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.section}>New report</Text>
      <Text style={styles.label}>Type</Text>
      <View style={styles.chips}>
        {REPORT_TYPES.slice(0, 4).map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, reportType === t && styles.chipActive]}
            onPress={() => setReportType(t)}
          >
            <Text style={[styles.chipText, reportType === t && styles.chipTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Start date (yyyy-mm-dd)</Text>
      <TextInput
        style={styles.input}
        value={startDate}
        onChangeText={setStartDate}
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Text style={styles.label}>End date</Text>
      <TextInput
        style={styles.input}
        value={endDate}
        onChangeText={setEndDate}
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Pressable style={styles.btn} onPress={() => void onGenerate()} disabled={busy}>
        {busy ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={styles.btnText}>Generate report</Text>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.section}>Recent</Text>
      {listQuery.isLoading && <ActivityIndicator color={colors.primary} />}
      {listQuery.data?.length === 0 && !listQuery.isLoading && (
        <Text style={styles.muted}>No reports yet.</Text>
      )}
      {listQuery.data?.map((r) => (
        <Pressable
          key={r.id}
          style={styles.reportRow}
          onPress={() => router.push(`/(tabs)/more/reports/${r.id}`)}
        >
          <Text style={styles.reportTitle}>{r.title}</Text>
          <Text style={styles.reportMeta}>
            {r.status} · {r.report_type}
          </Text>
        </Pressable>
      ))}
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
    screen: { backgroundColor: c.screen },
    container: { padding: 16, paddingBottom: 40, backgroundColor: c.screen },
    section: {
      fontSize: 13,
      fontWeight: '700',
      color: c.sectionLabel,
      marginTop: 16,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: c.text },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      backgroundColor: c.inputBg,
      color: c.text,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: c.surfaceMuted },
    chipActive: { backgroundColor: c.primary },
    chipText: { fontSize: 12, color: c.text },
    chipTextActive: { color: c.primaryText },
    btn: {
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      marginBottom: 8,
    },
    btnText: { color: c.primaryText, fontWeight: '600' },
    reportRow: {
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    reportTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    reportMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    error: { color: c.dangerText },
    muted: { color: c.textMuted },
  });
}
