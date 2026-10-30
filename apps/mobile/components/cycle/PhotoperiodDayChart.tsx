import { CycleFormCaption, CycleFormLabel } from '@/components/cycle/cycle-form-ui';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import {
  buildPhotoperiodDaySegments,
  formatFarmWallClockTime,
  type LightSchedule,
  type PhotoperiodDaySegment,
} from '@growlog/domain';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const DAY_MINUTES = 24 * 60;
const HOUR_TICKS = [0, 6, 12, 18];

function mergeKindRanges(segments: PhotoperiodDaySegment[], kind: PhotoperiodDaySegment['kind']) {
  const ranges: Array<{ start: number; end: number }> = [];
  for (const seg of segments) {
    if (seg.kind !== kind) continue;
    const prev = ranges[ranges.length - 1];
    if (prev && prev.end === seg.startMinutes) {
      prev.end = seg.endMinutes;
    } else {
      ranges.push({ start: seg.startMinutes, end: seg.endMinutes });
    }
  }
  return ranges;
}

function formatRange(start: number, end: number) {
  if (end <= start) {
    return `${formatFarmWallClockTime(start)}–${formatFarmWallClockTime(end)}`;
  }
  return `${formatFarmWallClockTime(start)}–${formatFarmWallClockTime(end)}`;
}

export function PhotoperiodDayChart({ schedule }: { schedule: LightSchedule }) {
  const { strings } = useMobileLocale();
  const copy = strings.cycle;
  const styles = useThemedStyles(makeStyles);

  const segments = useMemo(() => buildPhotoperiodDaySegments(schedule), [schedule]);

  const legend = useMemo(() => {
    if (!segments) return null;
    const light = mergeKindRanges(segments, 'light');
    const dark = mergeKindRanges(segments, 'dark');
    return {
      light: light.map((r) => formatRange(r.start, r.end)).join(', '),
      dark: dark.map((r) => formatRange(r.start, r.end)).join(', '),
    };
  }, [segments]);

  if (!segments || !legend) {
    return (
      <View style={styles.wrap}>
        <CycleFormLabel>{copy.formPhotoperiodChart}</CycleFormLabel>
        <CycleFormCaption>{copy.formPhotoperiodChartInvalid}</CycleFormCaption>
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel={copy.formPhotoperiodChartA11y}>
      <CycleFormLabel>{copy.formPhotoperiodChart}</CycleFormLabel>
      <View style={styles.bar}>
        {segments.map((seg, index) => {
          const widthPct = ((seg.endMinutes - seg.startMinutes) / DAY_MINUTES) * 100;
          return (
            <View
              key={`${seg.kind}-${seg.startMinutes}-${index}`}
              style={[
                styles.seg,
                seg.kind === 'light' ? styles.segLight : styles.segDark,
                { width: `${widthPct}%` },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.ticks}>
        {HOUR_TICKS.map((hour) => (
          <Text key={hour} style={styles.tick}>
            {String(hour).padStart(2, '0')}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.swatch, styles.segLight]} />
          <Text style={styles.legendText}>
            {copy.formPhotoperiodLight}: {legend.light}
          </Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.swatch, styles.segDark]} />
          <Text style={styles.legendText}>
            {copy.formPhotoperiodDark}: {legend.dark}
          </Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 8, marginTop: 4 },
    bar: {
      flexDirection: 'row',
      height: 28,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.inputBorder,
    },
    seg: { height: '100%' },
    segLight: { backgroundColor: c.primary },
    segDark: { backgroundColor: c.surfaceMuted },
    ticks: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    tick: { fontSize: 11, color: c.textMuted, fontVariant: ['tabular-nums'] },
    legend: { gap: 6 },
    legendRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    swatch: { width: 14, height: 14, borderRadius: 4, marginTop: 2 },
    legendText: { flex: 1, fontSize: 13, color: c.text, lineHeight: 18 },
  });
}
