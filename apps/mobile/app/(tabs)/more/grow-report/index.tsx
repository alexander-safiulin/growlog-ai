import { CloudFeatureGate } from '@/components/auth/CloudFeatureGate';
import { GrowerCalendarDateField } from '@/components/forms/GrowerCalendarDateField';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { anchorDateForTimezone } from '@/lib/sop-utils';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useSingleFlight } from '@/lib/use-single-flight';
import { useFarmContext } from '@/providers/FarmProvider';
import { generateReport } from '@growlog/api-client';
import {
  type AudienceType,
  fetchReportsForFarm,
  shiftCalendarDate,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const GROW_AUDIENCES: AudienceType[] = [
  'archive_personal',
  'internal_management',
  'public_community',
];

type PeriodPreset = '7d' | '30d' | 'cycle' | 'custom';

export default function GrowReportSetupScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { strings, locale } = useMobileLocale();
  const g = strings.growReport;
  const { supabase, farmId, cycle, primaryScope, farms } = useFarmContext();
  const farm = farms.find((f) => f.id === farmId);
  const today = useMemo(
    () => anchorDateForTimezone(farm?.timezone ?? 'UTC'),
    [farm?.timezone]
  );

  const cycleStart = cycle?.start_date?.slice(0, 10) ?? today;
  const [preset, setPreset] = useState<PeriodPreset>('7d');
  const [startDate, setStartDate] = useState(() => shiftCalendarDate(today, -6));
  const [endDate, setEndDate] = useState(today);
  const [audience, setAudience] = useState<AudienceType>('archive_personal');
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['grow-reports', farmId],
    enabled: !!farmId,
    queryFn: async () => {
      const rows = await fetchReportsForFarm(supabase, farmId!, 60);
      return rows.filter((r) => r.report_type === 'cycle');
    },
  });

  function applyPreset(p: PeriodPreset) {
    setPreset(p);
    if (p === '7d') {
      setStartDate(shiftCalendarDate(today, -6));
      setEndDate(today);
    } else if (p === '30d') {
      setStartDate(shiftCalendarDate(today, -29));
      setEndDate(today);
    } else if (p === 'cycle') {
      setStartDate(cycleStart);
      setEndDate(today);
    }
  }

  const { run: onBuild, busy } = useSingleFlight();

  async function buildReport() {
    if (!farmId || !cycle) return;
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error(strings.dailyFocus.notSignedIn);
      const j = await generateReport(token, {
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope?.id ?? null,
        reportType: 'cycle',
        audienceType: audience,
        outputFormat: 'pdf',
        startDate,
        endDate,
      });
      await listQuery.refetch();
      if (j.reportId) router.push(`/(tabs)/more/grow-report/${j.reportId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  if (!cycle) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{g.needCycle}</Text>
      </View>
    );
  }

  return (
    <CloudFeatureGate reason="reports">
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <Text style={styles.lead}>{g.subtitle}</Text>

        <Text style={styles.section}>{g.audience}</Text>
        <View style={styles.chips}>
          {GROW_AUDIENCES.map((a) => (
            <Pressable
              key={a}
              style={[styles.chip, audience === a && styles.chipActive]}
              onPress={() => setAudience(a)}
            >
              <Text style={[styles.chipText, audience === a && styles.chipTextActive]}>
                {a === 'archive_personal'
                  ? g.audiencePersonal
                  : a === 'internal_management'
                    ? g.audienceManager
                    : g.audiencePublic}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>{strings.timelineScreen.charts.periodLegend}</Text>
        <View style={styles.chips}>
          {(
            [
              ['7d', g.period7d],
              ['30d', g.period30d],
              ['cycle', g.periodCycle],
              ['custom', g.periodCustom],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              style={[styles.chip, preset === key && styles.chipActive]}
              onPress={() => applyPreset(key)}
            >
              <Text style={[styles.chipText, preset === key && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {preset === 'custom' ? (
          <View style={styles.dateRow}>
            <GrowerCalendarDateField
              isoValue={startDate}
              onIsoChange={setStartDate}
              maxIso={endDate}
              locale={locale}
              appearance="cycle"
            />
            <GrowerCalendarDateField
              isoValue={endDate}
              onIsoChange={setEndDate}
              maxIso={today}
              locale={locale}
              appearance="cycle"
            />
          </View>
        ) : (
          <Text style={styles.muted}>
            {startDate} — {endDate}
          </Text>
        )}

        <Pressable style={styles.btn} onPress={() => void onBuild(buildReport)} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.btnText}>{g.build}</Text>
          )}
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.section}>{g.recent}</Text>
        {listQuery.isLoading && <ActivityIndicator color={colors.primary} />}
        {listQuery.data?.length === 0 && !listQuery.isLoading && (
          <Text style={styles.muted}>{g.empty}</Text>
        )}
        {listQuery.data?.map((r) => (
          <Pressable
            key={r.id}
            style={styles.reportRow}
            onPress={() => router.push(`/(tabs)/more/grow-report/${r.id}`)}
          >
            <Text style={styles.reportTitle}>{r.title}</Text>
            <Text style={styles.reportMeta}>
              {r.status}
              {r.period_start && r.period_end
                ? ` · ${r.period_start.slice(0, 10)} — ${r.period_end.slice(0, 10)}`
                : ''}
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
    container: { padding: 16, paddingBottom: 48, gap: 8, backgroundColor: c.screen },
    lead: { fontSize: 15, lineHeight: 21, color: c.textMuted, marginBottom: 8 },
    section: {
      fontSize: 13,
      fontWeight: '700',
      color: c.sectionLabel,
      marginTop: 12,
      textTransform: 'uppercase',
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
    chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: c.surfaceMuted },
    chipActive: { backgroundColor: c.primary },
    chipText: { fontSize: 12, color: c.text },
    chipTextActive: { color: c.primaryText },
    dateRow: { gap: 10, marginVertical: 8 },
    btn: {
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      marginTop: 12,
    },
    btnText: { color: c.primaryText, fontWeight: '600' },
    reportRow: {
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 14,
      marginTop: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    reportTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    reportMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    error: { color: c.dangerText },
    muted: { color: c.textMuted, fontSize: 13 },
  });
}
