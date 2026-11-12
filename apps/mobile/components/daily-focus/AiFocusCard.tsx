import {
  fetchInsightGrounding,
  type DailyFocusInsightRow,
  type InsightGroundingRow,
} from '@growlog/domain';
import { useAiLocale } from '@/context/AiLocaleContext';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { speakText } from '@/lib/speak-text';
import { useThemedStyles } from '@/lib/use-themed-styles';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

function confidenceStyle(label: string | null, styles: ReturnType<typeof makeStyles>) {
  const l = (label ?? '').toLowerCase();
  if (l.includes('low') || l.includes('uncertain') || l.includes('низк')) {
    return { badge: styles.confLow, text: styles.confLowText };
  }
  if (l.includes('high') || l.includes('высок')) {
    return { badge: styles.confHigh, text: styles.confHighText };
  }
  return { badge: styles.confMed, text: styles.confMedText };
}

function localizedConfidenceLabel(
  label: string | null,
  df: {
    confidenceLow: string;
    confidenceMedium: string;
    confidenceHigh: string;
  }
): string | null {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes('low') || l.includes('низк')) return df.confidenceLow;
  if (l.includes('high') || l.includes('высок')) return df.confidenceHigh;
  if (l.includes('medium') || l.includes('средн')) return df.confidenceMedium;
  return label;
}

type Props = {
  insight: DailyFocusInsightRow;
  supabase: SupabaseClient;
  onOpenAssistant?: () => void;
};

export function AiFocusCard({ insight, supabase, onOpenAssistant }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { strings } = useMobileLocale();
  const { aiLocale } = useAiLocale();
  const df = strings.dailyFocus;
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [grounding, setGrounding] = useState<InsightGroundingRow[] | null>(null);
  const [groundingLoading, setGroundingLoading] = useState(false);
  const [groundingError, setGroundingError] = useState<string | null>(null);
  const [speakPending, setSpeakPending] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const groundingRequestRef = useRef(0);

  const conf = confidenceStyle(insight.confidence_label, styles);
  const confidenceLabel = localizedConfidenceLabel(insight.confidence_label, df);
  const confidencePct =
    insight.confidence != null ? Math.round(Number(insight.confidence) * 100) : null;

  const typeLabel =
    insight.insight_type === 'daily_focus'
      ? df.insightTypeDailyFocus
      : insight.insight_type.replace(/_/g, ' ');

  async function toggleEvidence() {
    if (evidenceOpen) {
      groundingRequestRef.current += 1;
      setEvidenceOpen(false);
      return;
    }
    if (groundingLoading) return;
    setEvidenceOpen(true);
    if (grounding !== null) return;
    const requestId = ++groundingRequestRef.current;
    setGroundingLoading(true);
    setGroundingError(null);
    try {
      const rows = await fetchInsightGrounding(supabase, insight.id);
      if (requestId !== groundingRequestRef.current) return;
      setGrounding(rows);
    } catch (err: unknown) {
      if (requestId !== groundingRequestRef.current) return;
      setGroundingError(err instanceof Error ? err.message : df.groundingLoadError);
    } finally {
      if (requestId === groundingRequestRef.current) setGroundingLoading(false);
    }
  }

  async function onSpeak() {
    setSpeakPending(true);
    setSpeakError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error(df.notSignedIn);
      const text = [insight.title, insight.body].filter(Boolean).join('. ');
      await speakText(token, text, { language: aiLocale });
    } catch (err: unknown) {
      setSpeakError(err instanceof Error ? err.message : df.speakError);
    } finally {
      setSpeakPending(false);
    }
  }

  const showConfidence = insight.confidence_label != null || confidencePct != null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{insight.title ?? df.insightTitleFallback}</Text>
        <View style={styles.typeChip}>
          <Text style={styles.typeChipText}>{typeLabel}</Text>
        </View>
      </View>

      <Text style={styles.body} numberOfLines={bodyExpanded ? undefined : 4}>
        {insight.body}
      </Text>
      {insight.body.length > 160 && (
        <Pressable onPress={() => setBodyExpanded((v) => !v)}>
          <Text style={styles.link}>{bodyExpanded ? df.showLess : df.readMore}</Text>
        </Pressable>
      )}

      {showConfidence ? (
        <View style={styles.trustRow}>
          <Text style={styles.trustLabel}>{df.confidence}</Text>
          {confidenceLabel ? (
            <View style={[styles.confBadge, conf.badge]}>
              <Text style={[styles.confBadgeText, conf.text]}>
                {confidenceLabel}
                {confidencePct != null ? ` (${confidencePct}%)` : ''}
              </Text>
            </View>
          ) : (
            <Text style={styles.trustUnknown}>{df.confidenceUnknown}</Text>
          )}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={() => void toggleEvidence()}>
          <Text style={styles.link}>{evidenceOpen ? df.hideEvidence : df.showEvidence}</Text>
        </Pressable>
        <Pressable onPress={() => void onSpeak()} disabled={speakPending}>
          {speakPending ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.link}>{df.listen}</Text>
          )}
        </Pressable>
        {onOpenAssistant ? (
          <Pressable onPress={onOpenAssistant}>
            <Text style={styles.link}>{df.openAssistant}</Text>
          </Pressable>
        ) : null}
      </View>

      {speakError ? <Text style={styles.speakError}>{speakError}</Text> : null}

      {evidenceOpen && (
        <View style={styles.evidenceBox}>
          {groundingLoading && <ActivityIndicator color={colors.primary} />}
          {groundingError ? <Text style={styles.evidenceError}>{groundingError}</Text> : null}
          {!groundingLoading && grounding?.length === 0 && (
            <Text style={styles.evidenceEmpty}>{df.noGrounding}</Text>
          )}
          {grounding && grounding.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {grounding.map((g, i) => (
                <View key={`${g.source_type}-${g.source_id ?? i}`} style={styles.groundChip}>
                  <Text style={styles.groundType}>{g.source_type}</Text>
                  {g.excerpt ? (
                    <Text style={styles.groundExcerpt} numberOfLines={3}>
                      {g.excerpt}
                    </Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surfaceMuted,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 10,
    },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
    title: { flex: 1, fontSize: 15, fontWeight: '700', color: c.text, lineHeight: 20 },
    typeChip: {
      backgroundColor: c.chipBg,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    typeChipText: { fontSize: 10, fontWeight: '600', color: c.chipText, textTransform: 'capitalize' },
    body: { fontSize: 14, color: c.text, lineHeight: 21 },
    trustRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    trustLabel: { fontSize: 12, fontWeight: '600', color: c.sectionLabel },
    confBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    confBadgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
    confHigh: { backgroundColor: '#dcfce7' },
    confHighText: { color: '#166534' },
    confMed: { backgroundColor: '#fef9c3' },
    confMedText: { color: '#854d0e' },
    confLow: { backgroundColor: '#ffedd5' },
    confLowText: { color: '#9a3412' },
    trustUnknown: { fontSize: 12, color: c.textMuted },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10, flexWrap: 'wrap' },
    link: { fontSize: 13, fontWeight: '600', color: c.primary },
    speakError: { fontSize: 12, color: c.dangerText, marginTop: 6 },
    evidenceBox: { marginTop: 12, minHeight: 32 },
    evidenceEmpty: { fontSize: 13, color: c.textMuted },
    evidenceError: { fontSize: 13, color: c.dangerText },
    groundChip: {
      backgroundColor: c.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      padding: 10,
      marginRight: 8,
      maxWidth: 220,
    },
    groundType: { fontSize: 11, fontWeight: '700', color: c.text },
    groundExcerpt: { fontSize: 12, color: c.textMuted, marginTop: 4, lineHeight: 17 },
  });
}
