import { SmartLifeDevices } from '@/components/sensors/SmartLifeDevices';
import { VpdWidget } from '@/components/sensors/VpdWidget';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { createManualSensorReading, fetchGlobalSensorMetrics } from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { router, useSegments } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

export default function SensorsScreen() {
  const { strings } = useMobileLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const mr = strings.manualReading;
  const segments = useSegments();
  const fromCapture = segments[0] === 'capture';
  const { supabase, farmId, cycle, primaryScope, refetchAll, userId } = useFarmContext();
  const metricsQuery = useQuery({
    queryKey: ['sensor-metrics-global'],
    queryFn: () => fetchGlobalSensorMetrics(supabase),
  });

  const [metricId, setMetricId] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!farmId || !cycle || !primaryScope || !metricId) return;
    const m = metricsQuery.data?.find((x) => x.id === metricId);
    setError(null);
    setMsg(null);
    setPending(true);
    try {
      const num = parseFloat(value.replace(',', '.'));
      if (Number.isNaN(num)) throw new Error(mr.invalidNumber);
      await createManualSensorReading(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope.id,
        metricId,
        value: num,
        capturedAt: new Date().toISOString(),
        unit: m?.unit ?? null,
        userId,
      });
      setValue('');
      await refetchAll();
      setMsg(mr.saved);
      if (fromCapture) {
        setTimeout(() => {
          router.back();
          router.back();
        }, 600);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : mr.saveFailed);
    } finally {
      setPending(false);
    }
  }

  const metrics = metricsQuery.data ?? [];
  const formReady = Boolean(cycle && primaryScope);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {fromCapture ? null : (
        <VpdWidget
          cycleStage={cycle?.stage}
          cycleId={cycle?.id}
          zoneId={cycle?.zone_id}
        />
      )}
      <SmartLifeDevices />

      {!formReady ? <Text style={styles.muted}>{mr.cycleRequired}</Text> : null}
      {formReady && metricsQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : null}

      {formReady && !metricsQuery.isLoading ? (
        <>
          <Text style={styles.label}>{mr.metric}</Text>
          {metrics.map((m) => (
            <Pressable
              key={m.id}
              style={[styles.metricRow, metricId === m.id && styles.metricActive]}
              onPress={() => setMetricId(m.id)}
            >
              <Text style={styles.metricName}>
                {m.name} ({m.metric_code}){m.unit ? `, ${m.unit}` : ''}
              </Text>
            </Pressable>
          ))}

          <Text style={styles.label}>{mr.value}</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
            placeholder={mr.valuePlaceholder}
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={colors.keyboardAppearance}
          />

          <Pressable
            style={[styles.btn, (pending || !metricId) && styles.btnDisabled]}
            onPress={() => void submit()}
            disabled={pending || !metricId}
          >
            <Text style={styles.btnText}>{pending ? mr.saving : mr.save}</Text>
          </Pressable>

          {msg ? <Text style={styles.ok}>{msg}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    screen: { backgroundColor: c.screen },
    container: { padding: 16, paddingBottom: 40, backgroundColor: c.screen },
    label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8, color: c.text },
    metricRow: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 8,
      backgroundColor: c.card,
    },
    metricActive: { borderColor: c.rowActiveBorder, backgroundColor: c.rowActiveBg },
    metricName: { fontSize: 15, color: c.text },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      backgroundColor: c.inputBg,
      color: c.text,
    },
    btn: {
      marginTop: 16,
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
    },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: c.primaryText, fontWeight: '600', fontSize: 16 },
    ok: { color: c.okText, marginTop: 12 },
    error: { color: c.dangerText, marginTop: 12 },
    muted: { color: c.textMuted },
  });
}
