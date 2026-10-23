import { VpdWidget } from '@/components/sensors/VpdWidget';
import { useFarmContext } from '@/providers/FarmProvider';
import { vpdStageLabelRu } from '@growlog/domain';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function CycleScreen() {
  const { cycle } = useFarmContext();

  if (!cycle) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Нет активного цикла.</Text>
      </View>
    );
  }

  const stageLabel = vpdStageLabelRu(cycle.stage);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{cycle.name}</Text>
        <Text style={styles.muted}>
          {stageLabel} · с {cycle.start_date}
        </Text>
        {cycle.cultivar_name ? (
          <Text style={styles.muted}>Сорт: {cycle.cultivar_name}</Text>
        ) : null}
      </View>
      <VpdWidget cycleStage={cycle.stage} cycleId={cycle.id} zoneId={cycle.zone_id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  muted: { color: '#666', fontSize: 14 },
});
