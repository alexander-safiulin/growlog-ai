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
import { formatRuDecimal, seriesMinMax, vpdBandForStage, type FeedChartPeriod } from '@growlog/domain';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

const CHART_H = 168;

export function FeedChartsView({ period }: { period: FeedChartPeriod }) {
  const { strings } = useMobileLocale();
  const cc = strings.timelineScreen.charts;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { width: screenW } = useWindowDimensions();
  const chartW = screenW - 56;
  const { cycle } = useFarmContext();
  const { loading, scopeReady, climate, phEc, activityCells, stageSpans, cycleStart } = useFeedCharts(period);

  const vpdBand = vpdBandForStage(cycle?.stage);

  const phPoints: ScatterPoint[] = [];
  const ecPoints: ScatterPoint[] = [];
  phEc.forEach((row) => {
    const x = new Date(row.occurredAt).getTime();
    const tint = row.entryKind === 'feeding' ? colors.primary : colors.textMuted;
    if (row.ph != null) phPoints.push({ x, y: row.ph, color: tint });
    if (row.ecMs != null) ecPoints.push({ x, y: row.ecMs, color: tint, radius: 4 });
  });

  const tempStats = climate?.tempLine.length ? seriesMinMax(climate.tempLine.map((p) => p.y)) : null;
  const climateFooter =
    tempStats && climate?.tempLine.length
      ? cc.climateFooter
          .replace('{last}', formatRuDecimal(climate.tempLine[climate.tempLine.length - 1]!.y, 1))
          .replace('{min}', formatRuDecimal(tempStats.min, 1))
          .replace('{max}', formatRuDecimal(tempStats.max, 1))
      : undefined;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <ChartCard
        title={cc.climateTitle}
        caption={climate?.fromDailyAvg ? cc.fromDailyAvg : undefined}
        empty={!scopeReady ? cc.noScope : !climate?.hasClimate ? cc.climateEmpty : undefined}
        footer={climate?.hasClimate ? climateFooter : undefined}
      >
        {climate?.hasClimate ? (
          <LineChart
            width={chartW}
            height={CHART_H}
            series={[
              { points: climate.tempLine, color: '#d97706', strokeWidth: 2 },
              { points: climate.rhLine, color: '#0284c7', strokeWidth: 2 },
            ]}
            bands={[
              ...climate.tempBands.map((b) => ({
                x: b.x,
                min: b.min,
                max: b.max,
                color: '#fdba74',
              })),
            ]}
          />
        ) : null}
      </ChartCard>

      <ChartCard
        title={cc.vpdTitle}
        caption={climate?.fromDailyAvg ? cc.fromDailyAvg : undefined}
        empty={!scopeReady ? cc.noScope : !climate?.vpdPoints.length ? cc.vpdEmpty : undefined}
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
        caption={cc.phecLegend}
        empty={!phPoints.length && !ecPoints.length ? cc.phecEmpty : undefined}
      >
        {phPoints.length || ecPoints.length ? (
          <View style={styles.dual}>
            {phPoints.length ? (
              <ScatterChart width={chartW} height={120} points={phPoints} yDecimals={1} />
            ) : null}
            {ecPoints.length ? (
              <ScatterChart width={chartW} height={120} points={ecPoints} yDecimals={2} />
            ) : null}
          </View>
        ) : null}
      </ChartCard>

      <ChartCard title={cc.activityTitle} empty={!activityCells.length ? cc.activityEmpty : undefined}>
        {activityCells.length ? (
          <View>
            {stageSpans.length ? (
              <StageStrip spans={stageSpans} cycleStart={cycleStart} today={activityCells[activityCells.length - 1]!.date} />
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
    content: { paddingHorizontal: 16, paddingBottom: 32 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    dual: { gap: 12 },
  });
}
