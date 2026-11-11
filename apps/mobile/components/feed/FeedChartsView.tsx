import { ChartCard } from '@/components/charts/ChartCard';
import { DayHeatmap } from '@/components/charts/DayHeatmap';
import { LineChart } from '@/components/charts/LineChart';
import { ScatterChart, type ScatterPoint } from '@/components/charts/ScatterChart';
import { StageStrip } from '@/components/charts/StageStrip';
import { useFeedCharts } from '@/components/feed/useFeedCharts';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { ACTIVITY_HEATMAP_CAP, formatRuDecimal, seriesMinMax, vpdBandForStage, type FeedChartPeriod } from '@growlog/domain';
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View, type RefreshControlProps } from 'react-native';

const CHART_H = 168;

export function FeedChartsView({
  period,
  refreshControl,
}: {
  period: FeedChartPeriod;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const { strings } = useMobileLocale();
  const cc = strings.timelineScreen.charts;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { width: screenW } = useWindowDimensions();
  const chartW = Math.max(160, screenW - 56);
  const { cycle } = useFarmContext();
  const {
    scopeReady,
    climateError,
    missingPrevious,
    feedingError,
    activityError,
    climateLoading,
    feedingLoading,
    activityLoading,
    climate,
    phEc,
    activityCells,
    activityTruncated,
    stageSpans,
    cycleStart,
  } = useFeedCharts(period);

  const vpdBand = vpdBandForStage(cycle?.stage);
  const needsScope = period !== 'previous' && period !== 'all';

  const phPoints: ScatterPoint[] = [];
  const ecPoints: ScatterPoint[] = [];
  phEc.forEach((row) => {
    const x = new Date(row.occurredAt).getTime();
    if (!Number.isFinite(x)) return;
    const tint = row.entryKind === 'feeding' ? colors.primary : colors.textMuted;
    if (row.ph != null) phPoints.push({ x, y: row.ph, color: tint });
    if (row.ecMs != null) ecPoints.push({ x, y: row.ecMs, color: tint, radius: 4 });
  });

  const climateFooter = [
    seriesFooter(cc.climateFooter, cc.climateTemp, '°C', climate?.tempLine ?? [], climate?.tempBands ?? []),
    seriesFooter(cc.climateFooter, cc.climateRh, '%', climate?.rhLine ?? [], climate?.rhBands ?? []),
  ]
    .filter((part): part is string => !!part)
    .join(' · ');

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} refreshControl={refreshControl}>
      <ChartCard
        title={cc.climateTitle}
        loading={climateLoading}
        caption={climate?.fromDailyAvg ? cc.fromDailyAvg : undefined}
        empty={
          missingPrevious
            ? cc.noPreviousCycle
            : climateError
              ? strings.commonMobile.error
              : needsScope && !scopeReady
                ? cc.noScope
                : !climate?.hasClimate
                  ? cc.climateEmpty
                  : undefined
        }
        footer={climate?.hasClimate && climateFooter ? climateFooter : undefined}
      >
        {climate?.hasClimate ? (
          <View style={styles.dual}>
            {climate.tempLine.length ? (
              <View>
                <Text style={styles.seriesLabel}>{cc.climateTemp}</Text>
                <LineChart
                  width={chartW}
                  height={CHART_H}
                  series={[{ points: climate.tempLine, color: '#d97706', strokeWidth: 2 }]}
                  bands={climate.tempBands.map((b) => ({ ...b, color: '#fdba74' }))}
                />
              </View>
            ) : null}
            {climate.rhLine.length ? (
              <View>
                <Text style={styles.seriesLabel}>{cc.climateRh}</Text>
                <LineChart
                  width={chartW}
                  height={CHART_H}
                  series={[{ points: climate.rhLine, color: '#0284c7', strokeWidth: 2 }]}
                  bands={climate.rhBands.map((b) => ({ ...b, color: '#7dd3fc' }))}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ChartCard>

      <ChartCard
        title={cc.vpdTitle}
        loading={climateLoading}
        caption={climate?.fromDailyAvg ? cc.fromDailyAvg : undefined}
        empty={
          missingPrevious
            ? cc.noPreviousCycle
            : climateError
              ? strings.commonMobile.error
              : needsScope && !scopeReady
                ? cc.noScope
                : !climate?.vpdPoints.length
                  ? cc.vpdEmpty
                  : undefined
        }
      >
        {climate?.vpdPoints.length ? (
          <LineChart
            width={chartW}
            height={CHART_H}
            series={[{ points: climate.vpdPoints, color: colors.vpdInRange, strokeWidth: 2 }]}
            horizontalBand={
              vpdBand
                ? { min: vpdBand.minKpa, max: vpdBand.maxKpa, fill: `${colors.rangeBand}99` }
                : null
            }
            yDecimals={2}
          />
        ) : null}
      </ChartCard>

      <ChartCard
        title={cc.phecTitle}
        loading={feedingLoading}
        caption={cc.phecLegend}
        empty={
          missingPrevious
            ? cc.noPreviousCycle
            : feedingError
              ? strings.commonMobile.error
              : !phPoints.length && !ecPoints.length
                ? cc.phecEmpty
                : undefined
        }
      >
        {phPoints.length || ecPoints.length ? (
          <View style={styles.dual}>
            {phPoints.length ? (
              <View>
                <Text style={styles.seriesLabel}>pH</Text>
                <ScatterChart width={chartW} height={120} points={phPoints} yDecimals={1} />
              </View>
            ) : null}
            {ecPoints.length ? (
              <View>
                <Text style={styles.seriesLabel}>EC</Text>
                <ScatterChart width={chartW} height={120} points={ecPoints} yDecimals={2} />
              </View>
            ) : null}
          </View>
        ) : null}
      </ChartCard>

      <ChartCard
        title={cc.activityTitle}
        loading={activityLoading}
        caption={
          activityTruncated
            ? cc.activityTruncated.replace('{days}', String(ACTIVITY_HEATMAP_CAP))
            : undefined
        }
        empty={
          missingPrevious
            ? cc.noPreviousCycle
            : activityError
              ? strings.commonMobile.error
              : !activityCells.length
                ? cc.activityEmpty
                : undefined
        }
      >
        {activityCells.length ? (
          <View>
            {stageSpans.length ? (
              <StageStrip
                spans={stageSpans}
                cycleStart={activityCells[0]?.date ?? cycleStart}
                today={activityCells[activityCells.length - 1]!.date}
              />
            ) : null}
            <DayHeatmap cells={activityCells} />
          </View>
        ) : null}
      </ChartCard>
    </ScrollView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
    dual: { gap: 12 },
    seriesLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted, marginBottom: 4 },
  });
}

function seriesFooter(
  template: string,
  label: string,
  unit: string,
  line: Array<{ y: number }>,
  bands: Array<{ min: number; max: number }>,
): string | null {
  if (!line.length) return null;
  const extremes = bands.length ? bands.flatMap((b) => [b.min, b.max]) : line.map((p) => p.y);
  const stats = seriesMinMax(extremes);
  if (!stats) return null;
  const last = line[line.length - 1]!.y;
  return template
    .replace('{label}', label)
    .replace('{last}', `${formatRuDecimal(last, 1)}${unit}`)
    .replace('{min}', formatRuDecimal(stats.min, 1))
    .replace('{max}', formatRuDecimal(stats.max, 1));
}
