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
  type MobileStrings,
  fetchReportsForFarm,
  formatGrowReportDateRange,
  shiftCalendarDate,
  validateGrowReportPeriod,
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

function audienceHint(audience: AudienceType, g: MobileStrings['growReport']): string {
  if (audience === 'internal_management') return g.audienceHintManager;
  if (audience === 'public_community') return g.audienceHintPublic;
  return g.audienceHintPersonal;
}

function reportStatusLabel(status: string, g: MobileStrings['growReport']): string {
  if (status === 'draft') return g.statusDraft;
  if (status === 'failed') return g.statusFailed;
  if (status === 'ready') return g.statusReady;
  return status;
}

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
  const periodLabel = useMemo(
    () => formatGrowReportDateRange(startDate, endDate, locale),
    [startDate, endDate, locale]
  );
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
    const period = validateGrowReportPeriod(startDate, endDate);
    if (!period.ok) {
      setError(g.invalidPeriod);
      return;
    }
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
      if (j.error) throw new Error(j.detail ?? j.error);
      await listQuery.refetch();
      if (j.reportId) router.push(`/(tabs)/more/grow-report/${j.reportId}`);
      else throw new Error(g.buildFailed);
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

  const cycleLine = cycle.name
    ? g.cycleContext
        .replace('{cycle}', cycle.name)
        .replace('{scope}', primaryScope?.display_name ?? cycle.name)
    : null;

  return (
    <CloudFeatureGate reason="reports">
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <Text style={styles.lead}>{g.subtitle}</Text>
        {cycleLine ? <Text style={styles.cycleCtx}>{cycleLine}</Text> : null}

        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>{g.periodSection}</Text>
          <Text style={styles.periodLabel}>{periodLabel}</Text>
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
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>{g.audience}</Text>
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
          {audience !== 'archive_personal' ? (
            <Text style={styles.hint}>{audienceHint(audience, g)}</Text>
          ) : null}

          <Pressable style={styles.btn} onPress={() => void onBuild(buildReport)} disabled={busy}>
            {busy ? (
              <View style={styles.btnBusy}>
                <ActivityIndicator color={colors.primaryText} />
                <Text style={styles.btnText}>{g.building}</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>{g.build}</Text>
            )}
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {(listQuery.data?.length ?? 0) > 0 || listQuery.isLoading ? (
          <>
            <Text style={styles.recentTitle}>{g.recent}</Text>
            {listQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
            {listQuery.data?.map((r) => (
              <Pressable
                key={r.id}
                style={styles.reportRow}
                onPress={() => router.push(`/(tabs)/more/grow-report/${r.id}`)}
              >
                <Text style={styles.reportTitle} numberOfLines={2}>
                  {r.title}
                </Text>
                <Text style={styles.reportMeta}>
                  {reportStatusLabel(r.status, g)}
                  {r.period_start && r.period_end
                    ? ` · ${formatGrowReportDateRange(r.period_start.slice(0, 10), r.period_end.slice(0, 10), locale)}`
                    : ''}
                </Text>
              </Pressable>
            ))}
          </>
        ) : (
          <Text style={styles.muted}>{g.empty}</Text>
        )}
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
    container: { padding: 20, paddingBottom: 48, gap: 16, backgroundColor: c.screen },
    lead: { fontSize: 16, lineHeight: 23, color: c.text, fontWeight: '500' },
    cycleCtx: { fontSize: 14, color: c.textMuted, marginTop: -8 },
    formCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 18,
      gap: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    fieldLabel: { fontSize: 13, color: c.sectionLabel, fontWeight: '600' },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginVertical: 4,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.screen,
    },
    chipActive: {
      borderColor: c.primary,
      backgroundColor: c.rowActiveBg,
    },
    chipText: { fontSize: 14, color: c.textMuted },
    chipTextActive: { color: c.text, fontWeight: '600' },
    hint: { fontSize: 13, lineHeight: 18, color: c.textMuted },
    periodLabel: { fontSize: 17, fontWeight: '600', color: c.text, marginBottom: 2 },
    dateRow: { gap: 10 },
    btnBusy: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    btn: {
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    btnText: { color: c.primaryText, fontWeight: '600', fontSize: 16 },
    recentTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: c.sectionLabel,
      marginTop: 8,
    },
    reportRow: {
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    reportTitle: { fontSize: 16, fontWeight: '500', color: c.text },
    reportMeta: { fontSize: 13, color: c.textMuted, marginTop: 4 },
    error: { color: c.dangerText, fontSize: 13, textAlign: 'center' },
    muted: { color: c.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8 },
  });
}
