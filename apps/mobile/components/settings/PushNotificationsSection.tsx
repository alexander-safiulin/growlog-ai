import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import {
  getPushNotificationsEnabled,
  registerForPushNotifications,
  unregisterPushNotifications,
} from '@/lib/notifications';
import { useFarmContext } from '@/providers/FarmProvider';
import { SETTINGS_FIELD_METRICS as M } from '@/components/settings/settings-field-metrics';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';

function makeStyles(colors: MobileThemeColors) {
  return StyleSheet.create({
    section: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.sectionLabel,
      marginTop: 16,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      paddingHorizontal: M.paddingHorizontal,
      paddingVertical: M.paddingVertical,
      minHeight: M.minHeight,
      borderRadius: M.borderRadius,
      marginBottom: M.marginBottom,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: { flex: 1, fontSize: 16, lineHeight: 22, color: colors.text },
    hint: { color: colors.textMuted, fontSize: 12, marginTop: -4, marginBottom: 8 },
    error: { color: colors.dangerText, fontSize: 12, marginTop: -4, marginBottom: 8 },
    muted: { color: colors.textMuted, fontSize: 14, marginBottom: 8 },
  });
}

export function PushNotificationsSection() {
  const { strings } = useMobileLocale();
  const ss = strings.settingsScreen;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { supabase } = useFarmContext();
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const state = await getPushNotificationsEnabled(supabase);
      if (cancelled) return;
      setAvailable(state.available);
      setEnabled(state.enabled);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function onToggle(next: boolean) {
    if (busy || loading || !available) return;
    setBusy(true);
    setHint(null);
    setError(null);
    const previous = enabled;
    setEnabled(next);
    try {
      if (next) {
        const token = await registerForPushNotifications(supabase);
        if (token) {
          setEnabled(true);
          setHint(ss.pushEnabled);
        } else {
          setEnabled(false);
          setError(ss.pushDenied);
        }
      } else {
        await unregisterPushNotifications(supabase);
        setEnabled(false);
      }
    } catch {
      setEnabled(previous);
      setError(ss.pushDenied);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Text style={styles.section}>{ss.notifications}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>{ss.enablePush}</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch
            value={enabled}
            onValueChange={(value) => void onToggle(value)}
            disabled={busy || !available}
            trackColor={{ false: colors.inputBorder, true: colors.primary }}
            thumbColor={colors.card}
            ios_backgroundColor={colors.inputBorder}
          />
        )}
      </View>
      {!available ? <Text style={styles.muted}>{ss.pushUnavailable}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  );
}
