import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  fetchCycleHarvestRecord,
  instantForFarmCalendarDate,
  isNaNValue,
  mapGrowCycleRpcError,
  parseOptionalGrowerNumber,
  transitionGrowCycleStage,
  upsertGrowCycleHarvest,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

export function CycleHarvestBlock() {
  const { strings } = useMobileLocale();
  const copy = strings.cycle;
  const { supabase, farmId, cycle, scopeId, farms, refetchAll } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const harvestQuery = useQuery({
    queryKey: ['m-harvest', cycle?.id],
    enabled: !!cycle?.id,
    queryFn: () => fetchCycleHarvestRecord(supabase, cycle!.id),
  });
  const [wet, setWet] = useState('');
  const [dry, setDry] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const row = harvestQuery.data;
    if (!row) return;
    if (row.wet_weight_kg != null) setWet(String(row.wet_weight_kg));
    if (row.dry_weight_kg != null) setDry(String(row.dry_weight_kg));
    if (row.harvested_at) {
      setHarvestDate(new Intl.DateTimeFormat('en-CA', { timeZone: farmTz }).format(new Date(row.harvested_at)));
    }
  }, [harvestQuery.data, farmTz]);

  if (!cycle || !farmId || !scopeId) return null;
  if (!['drying', 'curing', 'completed'].includes(cycle.stage)) return null;

  async function saveHarvest() {
    if (!cycle || !farmId || !scopeId) return;
    const wetP = parseOptionalGrowerNumber(wet);
    const dryP = parseOptionalGrowerNumber(dry);
    if (!wetP.ok || !dryP.ok) {
      setError(strings.manualReading.invalidNumber);
      return;
    }
    try {
      await upsertGrowCycleHarvest(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId,
        wetWeightKg: wetP.ok && !isNaNValue(wetP.value) ? wetP.value : null,
        dryWeightKg: dryP.ok && !isNaNValue(dryP.value) ? dryP.value : null,
        harvestedAt: harvestDate ? instantForFarmCalendarDate(harvestDate, farmTz) : undefined,
      });
      await refetchAll();
    } catch (e: unknown) {
      setError(mapGrowCycleRpcError(e instanceof Error ? e.message : 'error'));
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{copy.harvestTitle}</Text>
      <TextInput style={styles.input} placeholder={copy.harvestWet} value={wet} onChangeText={setWet} />
      <TextInput style={styles.input} placeholder={copy.harvestDry} value={dry} onChangeText={setDry} />
      <TextInput style={styles.input} placeholder={copy.harvestDate} value={harvestDate} onChangeText={setHarvestDate} />
      <Button title={copy.harvestSave} onPress={() => void saveHarvest()} />
      {cycle.stage === 'drying' ? (
        <Button
          title={copy.endDrying}
          onPress={() =>
            void transitionGrowCycleStage(supabase, {
              farmId,
              cycleId: cycle.id,
              scopeId,
              newStage: 'curing',
            }).then(() => refetchAll())
          }
        />
      ) : null}
      {cycle.stage === 'drying' || cycle.stage === 'curing' ? (
        <Button
          title={copy.completeCycle}
          onPress={() =>
            void transitionGrowCycleStage(supabase, {
              farmId,
              cycleId: cycle.id,
              scopeId,
              newStage: 'completed',
            }).then(() => refetchAll())
          }
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8, padding: 12, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10 },
  title: { fontWeight: '600', fontSize: 15 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8 },
  error: { color: '#b00020' },
});
