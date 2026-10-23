import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';
import { createGrowCycleTracking, initialStageForMaterial } from '@growlog/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function CycleNewScreen() {
  const { strings } = useMobileLocale();
  const copy = strings.cycle;
  const { supabase, farmId, refetchAll } = useFarmContext();
  const router = useRouter();
  const [name, setName] = useState('');
  const [strain, setStrain] = useState('');
  const [material, setMaterial] = useState<'seed' | 'clone'>('seed');
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!farmId) return;
    setPending(true);
    try {
      await createGrowCycleTracking(supabase, {
        farmId,
        name: name.trim() || 'Цикл',
        cultivarName: strain.trim() || undefined,
        startDate: new Date().toISOString().slice(0, 10),
        stage: initialStageForMaterial(material),
        startMaterial: material,
      });
      refetchAll();
      router.back();
    } finally {
      setPending(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>{copy.formTitleNew}</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={copy.formTitleNew} />
      <TextInput style={styles.input} value={strain} onChangeText={setStrain} placeholder="Сорт" />
      <View style={styles.row}>
        {(['seed', 'clone'] as const).map((m) => (
          <Button
            key={m}
            title={m === 'seed' ? 'Семечка' : 'Клон'}
            onPress={() => setMaterial(m)}
            color={material === m ? '#2d6a4f' : '#999'}
          />
        ))}
      </View>
      <Button title={copy.formSubmit} onPress={submit} disabled={pending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  label: { fontSize: 16, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: 8 },
});
