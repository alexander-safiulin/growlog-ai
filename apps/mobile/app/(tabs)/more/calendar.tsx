import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

type Stage = { stage: string; planned_start: string | null; planned_end: string | null };
type Run = { id: string; anchor_date: string | null; status: string };

export default function CalendarScreen() {
  const { strings } = useMobileLocale();
  const { supabase, farmId, cycle } = useFarmContext();
  const query = useQuery({
    queryKey: ['cycle-calendar', farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id,
    queryFn: async () => {
      const [{ data: stages }, { data: runs }] = await Promise.all([
        supabase
          .from('cycle_stage_plan')
          .select('stage, planned_start, planned_end')
          .eq('farm_id', farmId!)
          .eq('cycle_id', cycle!.id),
        supabase
          .from('sop_runs')
          .select('id, anchor_date, status')
          .eq('farm_id', farmId!)
          .eq('cycle_id', cycle!.id)
          .in('status', ['open', 'acknowledged', 'overdue'])
          .order('anchor_date', { ascending: true })
          .limit(40),
      ]);
      return {
        stages: (stages ?? []) as Stage[],
        runs: (runs ?? []) as Run[],
      };
    },
  });

  if (!cycle) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>An active cycle is required.</Text>
      </View>
    );
  }
  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2d6a4f" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{strings.more.calendar}</Text>
      {(query.data?.stages ?? []).map((s) => (
        <Text key={s.stage} style={styles.line}>
          {s.stage}: {s.planned_start ?? '—'} → {s.planned_end ?? '—'}
        </Text>
      ))}
      {(query.data?.runs ?? []).map((r) => (
        <Text key={r.id} style={styles.line}>
          {r.anchor_date ?? '—'} · {r.status}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  container: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#1b4332' },
  muted: { color: '#52796f' },
  line: { fontSize: 15, color: '#1b4332' },
});
