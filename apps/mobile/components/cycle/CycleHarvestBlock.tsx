import {
  CycleFormCard,
  CycleFormCaption,
  CycleFormDivider,
  CycleFormErrors,
  CycleFormFieldInput,
  CycleFormLabel,
  CycleFormPrimaryButton,
  CycleFormSecondaryButton,
  CycleFormTextButton,
} from '@/components/cycle/cycle-form-ui';
import { useMobileLocale } from '@/context/LocaleContext';
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
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

export function CycleHarvestBlock() {
  const { strings } = useMobileLocale();
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
  const [pending, setPending] = useState(false);
  const [stagePending, setStagePending] = useState(false);

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

  if (!cycle || !farmId || !scopeId) return null;

  if (isLocalWorkspace) {
    return (
      <CycleFormCard>
        <CycleFormLabel>{copy.harvestTitle}</CycleFormLabel>
        <CycleFormCaption>{copy.harvestNeedsAccount}</CycleFormCaption>
        <CycleFormTextButton label={strings.cloudGate.signIn} onPress={() => router.push('/(auth)/login')} />
      </CycleFormCard>
    );
  }

  if (!['flower', 'drying', 'curing', 'completed'].includes(cycle.stage)) return null;

  const busy = pending || stagePending;

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

    setPending(true);
    setError(null);
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
    } finally {
      setPending(false);
    }
  }

  async function advanceStage(newStage: 'curing' | 'completed') {
    if (!cycle || !farmId || !scopeId) return;
    setStagePending(true);
    setError(null);
    try {
      await transitionGrowCycleStage(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId,
        newStage,
      });
      await refetchAll();
    } catch (e: unknown) {
      setError(mapGrowCycleRpcError(e instanceof Error ? e.message : 'error'));
    } finally {
      setStagePending(false);
    }
  }

  const fieldError = fieldErrors.wet ?? fieldErrors.dry ?? null;

  return (
    <View style={{ gap: 12 }}>
      <CycleFormCard>
        <CycleFormLabel>{copy.harvestTitle}</CycleFormLabel>
        <CycleFormLabel>{copy.harvestWet}</CycleFormLabel>
        <CycleFormFieldInput
          value={wet}
          onChangeText={setWet}
          keyboardType="decimal-pad"
          editable={!busy}
        />
        <CycleFormDivider />
        <CycleFormLabel>{copy.harvestDry}</CycleFormLabel>
        <CycleFormFieldInput
          value={dry}
          onChangeText={setDry}
          keyboardType="decimal-pad"
          editable={!busy}
        />
        <CycleFormDivider />
        <CycleFormLabel>{copy.harvestDate}</CycleFormLabel>
        <CycleFormFieldInput
          value={harvestDate}
          onChangeText={setHarvestDate}
          placeholder="YYYY-MM-DD"
          editable={!busy}
        />
        <CycleFormErrors fieldError={fieldError} error={error} />
        <CycleFormPrimaryButton
          label={copy.harvestSave}
          onPress={() => void saveHarvest()}
          pending={pending}
          disabled={busy}
        />
      </CycleFormCard>

      {cycle.stage === 'drying' ? (
        <CycleFormSecondaryButton
          label={copy.endDrying}
          onPress={() => void advanceStage('curing')}
          disabled={busy}
        />
      ) : null}
      {cycle.stage === 'drying' || cycle.stage === 'curing' ? (
        <CycleFormSecondaryButton
          label={copy.completeCycle}
          onPress={() => void advanceStage('completed')}
          disabled={busy}
        />
      ) : null}
    </View>
  );
}
