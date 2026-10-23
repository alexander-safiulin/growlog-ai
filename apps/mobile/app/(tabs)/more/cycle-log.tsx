import { useFarmContext } from '@/providers/FarmProvider';
import { createGrowCycleFeedingLog } from '@growlog/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, ScrollView, StyleSheet, TextInput, View } from 'react-native';

export default function CycleLogScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const entryKind = kind === 'feeding' ? 'feeding' : 'watering';
  const { supabase, farmId, cycle, scopeId, refetchAll } = useFarmContext();
  const router = useRouter();
  const [volume, setVolume] = useState('');
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!farmId || !cycle || !scopeId || !volume) return;
    setPending(true);
    try {
      await createGrowCycleFeedingLog(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId,
        entryKind,
        volumeMl: Number(volume),
      });
      refetchAll();
      router.back();
    } finally {
      setPending(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput
        style={styles.input}
        value={volume}
        onChangeText={setVolume}
        keyboardType="numeric"
        placeholder="Объём, мл"
      />
      <Button title="Сохранить" onPress={submit} disabled={pending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
});
