import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { postJson } from '@growlog/api-client';
import type { LeafHypothesisCode, LeafSkillResult } from '@growlog/domain';
import { useEffect, useState } from 'react';
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
  const [confirmedCodes, setConfirmedCodes] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const canConfirm = Boolean(farmId && cycle?.id && primaryScope?.id);

  useEffect(() => {
    if (!farmId || !mediaAssetId) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('events')
        .select('payload')
        .eq('farm_id', farmId)
        .eq('event_type', 'deficiency_suspected')
        .filter('payload->>media_asset_id', 'eq', mediaAssetId)
        .filter('payload->>confirmed', 'eq', 'true');
      if (cancelled) return;
      const codes = new Set<string>();
      for (const row of data ?? []) {
        const payload = row.payload as Record<string, unknown> | null;
        const code = payload?.leaf_hypothesis_code;
        if (typeof code === 'string') codes.add(code);
      }
      setConfirmedCodes(codes);
    })();
    return () => {
      cancelled = true;
    };
  }, [farmId, mediaAssetId, supabase]);

  async function confirm(code: LeafHypothesisCode, label: string) {
    if (!canConfirm) return;
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
          farmId: farmId!,
          cycleId: cycle!.id,
          scopeId: primaryScope!.id,
          mediaAssetId,
          hypothesisCode: code,
          note: label,
        },
        token,
      );
      setConfirmedCodes((prev) => new Set(prev).add(code));
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
      {!canConfirm && result.hypotheses.length > 0 ? (
        <Text style={styles.muted}>{copy.needScope}</Text>
      ) : null}
      {result.hypotheses.length === 0 ? (
        <Text style={styles.muted}>{copy.noHypotheses}</Text>
      ) : (
        result.hypotheses.map((h) => {
          const done = confirmedCodes.has(h.code);
          const loading = pendingCode === h.code;
          return (
            <View key={h.code} style={styles.row}>
              <Text style={styles.hypothesis}>{h.label}</Text>
              {done ? (
                <Text style={styles.confirmed}>{copy.confirmed}</Text>
              ) : (
                <Pressable
                  style={[styles.btn, !canConfirm && styles.btnDisabled]}
                  disabled={loading || !canConfirm}
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
    btnDisabled: { opacity: 0.45 },
    btnText: { color: c.primaryText, fontSize: 14, fontWeight: '600' },
    confirmed: { fontSize: 13, color: c.primary, fontWeight: '600' },
    next: { fontSize: 13, color: c.text, lineHeight: 18 },
    error: { fontSize: 13, color: c.dangerText },
  });
}
