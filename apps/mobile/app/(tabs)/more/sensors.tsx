import { SmartLifeDevices } from '@/components/sensors/SmartLifeDevices';
import { VpdWidget } from '@/components/sensors/VpdWidget';
import { useMobileLocale } from '@/context/LocaleContext';
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
    <ScrollView contentContainerStyle={styles.container}>
      <VpdWidget
        cycleStage={cycle?.stage}
        cycleId={cycle?.id}
        zoneId={cycle?.zone_id}
      />
      <SmartLifeDevices />

      {!formReady ? <Text style={styles.muted}>{mr.cycleRequired}</Text> : null}
      {formReady && metricsQuery.isLoading ? <ActivityIndicator color="#2d6a4f" /> : null}

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

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8, color: '#374151' },
  metricRow: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  metricActive: { borderColor: '#2d6a4f', backgroundColor: '#f0fdf4' },
  metricName: { fontSize: 15, color: '#1f2937' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  btn: {
    marginTop: 16,
    backgroundColor: '#2d6a4f',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  ok: { color: '#166534', marginTop: 12 },
  error: { color: '#b91c1c', marginTop: 12 },
  muted: { color: '#6b7280' },
});
