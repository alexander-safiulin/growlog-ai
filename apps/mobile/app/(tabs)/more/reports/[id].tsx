import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { fetchReportById } from '@growlog/domain';
import type { ReportBlock, ReportJsonV1 } from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

function isReportJsonV1(x: unknown): x is ReportJsonV1 {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return o.pipeline_version === 'adr007-v1' && Array.isArray(o.blocks);
}

function BlockView({ block }: { block: ReportBlock }) {
  const styles = useThemedStyles(makeStyles);
  if (block.kind === 'header') {
    return (
      <View style={styles.block}>
        <Text style={styles.heading}>{block.title}</Text>
        <Text style={styles.muted}>
          {block.periodLabel} · {block.scopeLabel}
        </Text>
      </View>
    );
  }
  if (block.kind === 'executive_summary' || block.kind === 'narrative' || block.kind === 'appendix') {
    return (
      <View style={styles.block}>
        <Text style={styles.sectionTitle}>{block.title}</Text>
        <Text style={styles.paragraph}>{block.body}</Text>
      </View>
    );
  }
  if (block.kind === 'metric_strip') {
    return (
      <View style={styles.block}>
        <Text style={styles.sectionTitle}>{block.title}</Text>
        {block.items.map((item, i) => (
          <Text key={i} style={styles.paragraph}>
            {item.label}: {item.value}
          </Text>
        ))}
      </View>
    );
  }
  if (block.kind === 'timeline_highlights' || block.kind === 'anomalies' || block.kind === 'sop_compliance') {
    return (
      <View style={styles.block}>
        <Text style={styles.sectionTitle}>{block.title}</Text>
        {block.items.map((item, i) => (
          <Text key={i} style={styles.paragraph}>
            · {'summary' in item ? item.summary : 'title' in item ? item.title : ''}
          </Text>
        ))}
      </View>
    );
  }
  if (block.kind === 'photos') {
    return (
      <Text style={styles.muted}>
        {block.items.length} photo(s) — open web companion for full layout.
      </Text>
    );
  }
  if (block.kind === 'missing_data') {
    return (
      <View style={styles.block}>
        <Text style={styles.sectionTitle}>{block.title}</Text>
        {block.notes.map((n, i) => (
          <Text key={i} style={styles.paragraph}>
            · {n}
          </Text>
        ))}
      </View>
    );
  }
  return null;
}

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reportId = typeof id === 'string' ? id : '';
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { supabase, farmId } = useFarmContext();

  const q = useQuery({
    queryKey: ['report', farmId, reportId],
    enabled: !!farmId && !!reportId,
    queryFn: () => fetchReportById(supabase, farmId!, reportId),
  });

  const report = q.data;
  const rj = report?.report_json;
  const blocks: ReportBlock[] = isReportJsonV1(rj) && rj.blocks.length ? rj.blocks : [];

  if (q.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Report not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{report.title}</Text>
      <Text style={styles.meta}>
        {report.status} · {report.report_type}
        {report.period_start && report.period_end
          ? ` · ${report.period_start.slice(0, 10)} — ${report.period_end.slice(0, 10)}`
          : ''}
      </Text>

      {report.summary_text ? (
        <>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.paragraph}>{report.summary_text}</Text>
        </>
      ) : null}

      {report.narrative_text ? (
        <>
          <Text style={styles.sectionTitle}>Narrative</Text>
          <Text style={styles.paragraph}>{report.narrative_text}</Text>
        </>
      ) : null}

      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}

      {report.status === 'draft' && (
        <Text style={styles.draft}>Report is still generating…</Text>
      )}
    </ScrollView>
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
    title: { fontSize: 22, fontWeight: '700', color: c.text },
    meta: { fontSize: 13, color: c.textMuted, marginBottom: 16, marginTop: 4 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.sectionLabel,
      marginTop: 16,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    heading: { fontSize: 18, fontWeight: '700', marginTop: 16, color: c.text },
    block: { marginTop: 8 },
    paragraph: { fontSize: 15, lineHeight: 22, color: c.text, marginTop: 8 },
    muted: { fontSize: 13, color: c.textMuted, marginTop: 8, fontStyle: 'italic' },
    draft: {
      marginTop: 16,
      padding: 12,
      backgroundColor: c.warningSurface,
      borderWidth: 1,
      borderColor: c.warningBorder,
      borderRadius: 8,
      color: c.text,
    },
    error: { color: c.dangerText },
  });
}
