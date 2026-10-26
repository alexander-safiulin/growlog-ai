import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  fetchCycleHarvestRecord,
  growerNumberFieldErrorRu,
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
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cycle;
  const { supabase, farmId, cycle, scopeId, farms, refetchAll, isLocalWorkspace } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const harvestQuery = useQuery({
    queryKey: ['m-harvest', cycle?.id],
    enabled: !!cycle?.id && !isLocalWorkspace,
    queryFn: () => fetchCycleHarvestRecord(supabase, cycle!.id),
  });
  const [wet, setWet] = useState('');
  const [dry, setDry] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const row = harvestQuery.data;
    if (!row) return;
    if (row.wet_weight_kg != null) setWet(String(row.wet_weight_kg).replace('.', ','));
    if (row.dry_weight_kg != null) setDry(String(row.dry_weight_kg).replace('.', ','));
    if (row.harvested_at) {
      setHarvestDate(
        new Intl.DateTimeFormat('en-CA', { timeZone: farmTz }).format(new Date(row.harvested_at)),
      );
    }
  }, [harvestQuery.data, farmTz]);

  if (!cycle || !farmId || !scopeId || isLocalWorkspace) return null;
  if (!['drying', 'curing', 'completed'].includes(cycle.stage)) return null;

  async function saveHarvest() {
    if (!cycle || !farmId || !scopeId) return;
    const errs: Record<string, string> = {};
    const wetP = parseOptionalGrowerNumber(wet);
    const dryP = parseOptionalGrowerNumber(dry);
    if (!wetP.ok) errs.wet = growerNumberFieldErrorRu(wetP.error, copy.harvestWet);
    if (!dryP.ok) errs.dry = growerNumberFieldErrorRu(dryP.error, copy.harvestDry);
    if (wetP.ok && !isNaNValue(wetP.value) && wetP.value < 0) errs.wet = strings.manualReading.invalidNumber;
    if (dryP.ok && !isNaNValue(dryP.value) && dryP.value < 0) errs.dry = strings.manualReading.invalidNumber;
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      const hasExisting = Boolean(harvestQuery.data?.id);
      const wetVal = wetP.ok && !isNaNValue(wetP.value) ? wetP.value : null;
      const dryVal = dryP.ok && !isNaNValue(dryP.value) ? dryP.value : null;
      await upsertGrowCycleHarvest(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId,
        harvestedAt: harvestDate ? instantForFarmCalendarDate(harvestDate, farmTz) : undefined,
        ...(hasExisting
          ? {
              weightPatch: {
                wet_weight_kg: wet.trim() === '' ? null : wetVal,
                dry_weight_kg: dry.trim() === '' ? null : dryVal,
              },
            }
          : { wetWeightKg: wetVal, dryWeightKg: dryVal }),
      });
      await refetchAll();
    } catch (e: unknown) {
      setError(mapGrowCycleRpcError(e instanceof Error ? e.message : 'error'));
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{copy.harvestTitle}</Text>
      <Text style={styles.label}>{copy.harvestWet}</Text>
      <TextInput
        style={styles.input}
        value={wet}
        onChangeText={setWet}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      {fieldErrors.wet ? <Text style={styles.error}>{fieldErrors.wet}</Text> : null}
      <Text style={styles.label}>{copy.harvestDry}</Text>
      <TextInput
        style={styles.input}
        value={dry}
        onChangeText={setDry}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      {fieldErrors.dry ? <Text style={styles.error}>{fieldErrors.dry}</Text> : null}
      <Text style={styles.label}>{copy.harvestDate}</Text>
      <TextInput
        style={styles.input}
        value={harvestDate}
        onChangeText={setHarvestDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
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

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    box: { gap: 8, padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 10 },
    title: { fontWeight: '600', fontSize: 15, color: c.text },
    label: { fontSize: 13, fontWeight: '500', color: c.text },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 8,
      padding: 8,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    error: { color: c.dangerText, fontSize: 12 },
  });
}
