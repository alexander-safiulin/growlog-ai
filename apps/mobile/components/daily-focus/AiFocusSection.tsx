import { AiFocusCard } from '@/components/daily-focus/AiFocusCard';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { fetchDailyFocusInsights, type DailyFocusInsightRow } from '@growlog/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  supabase: SupabaseClient;
  farmId: string;
  cycleId: string;
  enabled?: boolean;
};

export function AiFocusSection({ supabase, farmId, cycleId, enabled = true }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insightsQuery = useQuery({
    queryKey: ['ai-insights-daily-focus', farmId, cycleId],
    enabled: enabled && !!farmId && !!cycleId,
    queryFn: (): Promise<DailyFocusInsightRow[]> =>
      fetchDailyFocusInsights(supabase, { farmId, cycleId, limit: 8 }),
  });

  const insights = insightsQuery.isError ? [] : (insightsQuery.data ?? []);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AI Focus</Text>
      <Text style={styles.sectionDesc}>
        Prioritized insights from your farm data — always verify before acting.
      </Text>

      {insightsQuery.isLoading && (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
      )}

      {insightsQuery.isError && (
        <Text style={styles.error}>Could not load insights. Pull to refresh later.</Text>
      )}

      {!insightsQuery.isLoading && !insightsQuery.isError && insights.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No AI insights yet for this cycle.</Text>
          <Text style={styles.emptyHint}>
            Log observations, run SOPs, or ask the Assistant to generate focus cards.
          </Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.push('/(tabs)/assistant')}>
            <Text style={styles.emptyBtnText}>Open Assistant</Text>
          </Pressable>
        </View>
      )}

      {insights.map((insight) => (
        <AiFocusCard
          key={insight.id}
          insight={insight}
          supabase={supabase}
          onOpenAssistant={() => router.push('/(tabs)/assistant')}
        />
      ))}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    section: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.sectionLabel,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    sectionDesc: { fontSize: 13, color: c.textMuted, marginBottom: 12, lineHeight: 18 },
    error: { fontSize: 14, color: c.dangerText, marginVertical: 8 },
    empty: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.inputBorder,
      borderRadius: 10,
      padding: 16,
      alignItems: 'center',
    },
    emptyText: { fontSize: 14, fontWeight: '600', color: c.text, textAlign: 'center' },
    emptyHint: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 6,
      textAlign: 'center',
      lineHeight: 18,
    },
    emptyBtn: {
      marginTop: 12,
      backgroundColor: c.primary,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    emptyBtnText: { color: c.primaryText, fontWeight: '600', fontSize: 14 },
  });
}
