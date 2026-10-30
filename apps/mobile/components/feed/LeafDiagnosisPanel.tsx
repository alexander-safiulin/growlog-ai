import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { postJson } from '@growlog/api-client';
import type { LeafHypothesisCode, LeafSkillResult } from '@growlog/domain';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export function LeafDiagnosisPanel({
  mediaAssetId,
  result,
  onConfirmed,
}: {
  mediaAssetId: string;
  result: LeafSkillResult;
  onConfirmed?: () => void;
}) {
  const { strings } = useMobileLocale();
  const copy = strings.leafSkill;
  const styles = useThemedStyles(makeStyles);
  const { supabase, farmId, cycle, primaryScope } = useFarmContext();
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm(code: LeafHypothesisCode, label: string) {
    if (!farmId || !cycle?.id || !primaryScope?.id) return;
    setError(null);
    setPendingCode(code);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not signed in');
      await postJson<{ eventId: string | null }>(
        '/api/assistant/confirm-leaf-hypothesis',
        {
          farmId,
          cycleId: cycle.id,
          scopeId: primaryScope.id,
          mediaAssetId,
          hypothesisCode: code,
          note: label,
        },
        token,
      );
      setConfirmedCode(code);
      onConfirmed?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : copy.saveFailed);
    } finally {
      setPendingCode(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.disclaimer}>{copy.disclaimer}</Text>
      {result.hypotheses.length === 0 ? (
        <Text style={styles.muted}>{copy.noHypotheses}</Text>
      ) : (
        result.hypotheses.map((h) => {
          const done = confirmedCode === h.code;
          const loading = pendingCode === h.code;
          return (
            <View key={h.code} style={styles.row}>
              <Text style={styles.hypothesis}>{h.label}</Text>
              {done ? (
                <Text style={styles.confirmed}>{copy.confirmed}</Text>
              ) : (
                <Pressable
                  style={styles.btn}
                  disabled={loading || !!pendingCode}
                  onPress={() => void confirm(h.code, h.label)}
                  accessibilityRole="button"
                >
                  {loading ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Text style={styles.btnText}>{copy.confirmHypothesis}</Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        })
      )}
      {result.next_step.kind !== 'none' ? (
        <Text style={styles.next}>
          {copy.nextStep}: {result.next_step.prompt}
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      backgroundColor: c.surfaceMuted,
      gap: 8,
    },
    title: { fontSize: 15, fontWeight: '700', color: c.text },
    disclaimer: { fontSize: 13, color: c.textMuted, lineHeight: 18 },
    muted: { fontSize: 14, color: c.textMuted },
    row: { gap: 6 },
    hypothesis: { fontSize: 14, color: c.text, lineHeight: 20 },
    btn: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: c.primary,
    },
    btnText: { color: c.primaryText, fontSize: 14, fontWeight: '600' },
    confirmed: { fontSize: 13, color: c.primary, fontWeight: '600' },
    next: { fontSize: 13, color: c.text, lineHeight: 18 },
    error: { fontSize: 13, color: c.dangerText },
  });
}
