import { AiFocusCard } from '@/components/daily-focus/AiFocusCard';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { fetchDailyFocusInsights, type DailyFocusInsightRow } from '@growlog/domain';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { router } from 'expo-router';
import { postJson } from '@growlog/api-client';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  supabase: SupabaseClient;
  farmId: string;
  cycleId: string;
  scopeId: string;
  enabled?: boolean;
  parentRefreshBusy?: boolean;
};

export function AiFocusSection({
  supabase,
  farmId,
  cycleId,
  scopeId,
  enabled = true,
  parentRefreshBusy = false,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const insightsQuery = useQuery({
    queryKey: ['ai-insights-daily-focus', farmId, cycleId],
    enabled: enabled && !!farmId && !!cycleId,
    queryFn: (): Promise<DailyFocusInsightRow[]> =>
      fetchDailyFocusInsights(supabase, { farmId, cycleId, limit: 8 }),
  });

  const insights = insightsQuery.isError ? [] : (insightsQuery.data ?? []);

  const requestRefresh = async () => {
    if (refreshing || parentRefreshBusy) return;
    setRefreshing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      await postJson('/api/focus/refresh', { farmId, cycleId, scopeId }, token);
      await queryClient.invalidateQueries({ queryKey: ['ai-insights-daily-focus', farmId, cycleId] });
      await insightsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>AI Focus</Text>
        <Pressable
          style={styles.refreshBtn}
          onPress={() => void requestRefresh()}
          disabled={refreshing || parentRefreshBusy}
        >
          <Text style={styles.refreshBtnText}>{refreshing ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>
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
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    refreshBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: c.chipBg,
    },
    refreshBtnText: { fontSize: 12, fontWeight: '600', color: c.chipText },
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
