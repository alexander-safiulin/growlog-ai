import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';
import { getJson } from '@growlog/api-client';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

type Pack = {
  activeBatches: Array<{ name: string; batch_code: string | null; stage: string }>;
  responsible: Array<{ display_name: string | null; role: string }>;
  workToday: Array<{ title: string; status: string }>;
  openDeviations: Array<{ title: string; severity: string }>;
  recentReadings: Array<{ metric_code: string; value: number }>;
  escalationContacts: Array<{ severity: string; role: string }>;
  autonomy: { score: number; shareWithoutManager: number | null; shiftsRecorded: number };
};

export default function HandoverScreen() {
  const { strings } = useMobileLocale();
  const { supabase, farmId, cycle } = useFarmContext();
  const query = useQuery({
    queryKey: ['handover', farmId, cycle?.id],
    enabled: !!farmId,
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || !farmId) throw new Error('Not signed in');
      const q = new URLSearchParams({ farmId });
      if (cycle?.id) q.set('cycleId', cycle.id);
      return getJson<Pack>(`/api/cms/handover?${q}`, token);
    },
  });

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2d6a4f" />
      </View>
    );
  }
  if (query.error) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{query.error instanceof Error ? query.error.message : 'Failed'}</Text>
      </View>
    );
  }
  const pack = query.data;
  if (!pack) return null;
  const lines = [
    ...pack.activeBatches.map((b) => `${b.name} · ${b.stage}`),
    ...pack.responsible.map((p) => `${p.display_name ?? p.role} · ${p.role}`),
    ...pack.workToday.map((w) => `Today: ${w.title} (${w.status})`),
    ...pack.openDeviations.map((d) => `[${d.severity}] ${d.title}`),
    ...pack.recentReadings.map((r) => `${r.metric_code}=${r.value}`),
    ...pack.escalationContacts.map((e) => `${e.severity} → ${e.role}`),
  ];
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{strings.handover.title}</Text>
      <Text style={styles.muted}>
        {strings.handover.autonomy}: {pack.autonomy.score}
        {pack.autonomy.shareWithoutManager != null
          ? ` · ${pack.autonomy.shareWithoutManager}% / ${pack.autonomy.shiftsRecorded}`
          : ''}
      </Text>
      {lines.map((line, i) => (
        <Text key={`${line}-${i}`} style={styles.line}>
          {line}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#1b4332' },
  muted: { color: '#52796f' },
  line: { fontSize: 15, color: '#1b4332' },
});
