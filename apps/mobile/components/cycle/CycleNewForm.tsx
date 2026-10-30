import {
  CycleFormCard,
  CycleFormChip,
  CycleFormChipRow,
  CycleFormDivider,
  CycleFormErrors,
  CycleFormFieldInput,
  CycleFormFieldRow,
  CycleFormLabel,
  CycleFormPrimaryButton,
  CycleFormScreen,
} from '@/components/cycle/cycle-form-ui';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  createGrowCycleTracking,
  farmCalendarDateString,
  fetchFarmZones,
  growerNumberFieldErrorRu,
  initialStageForMaterial,
  mapGrowCycleRpcError,
  parseGrowerNumber,
  validatePhotoperiodHours,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

type LightPreset = '18/6' | '12/12' | 'custom';

export function CycleNewForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cycle;
  const { supabase, farmId, farms, refetchAll } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const [name, setName] = useState('');
  const [strain, setStrain] = useState('');
  const [plantCount, setPlantCount] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [material, setMaterial] = useState<'seed' | 'clone'>('seed');
  const [startDate, setStartDate] = useState(() => farmCalendarDateString(farmTz));
  const [preset, setPreset] = useState<LightPreset>('18/6');
  const [lightOn, setLightOn] = useState('18');
  const [lightOff, setLightOff] = useState('6');
  const [lightsOnAt, setLightsOnAt] = useState('06:00');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const zonesQuery = useQuery({
    queryKey: ['farm-zones', farmId],
    enabled: !!farmId,
    queryFn: () => fetchFarmZones(supabase, farmId!),
  });

  const effectiveLight = useMemo(() => {
    if (preset === '18/6') return { on: 18, off: 6 };
    if (preset === '12/12') return { on: 12, off: 12 };
    const on = parseInt(lightOn, 10);
    const off = parseInt(lightOff, 10);
    return { on: Number.isFinite(on) ? on : 18, off: Number.isFinite(off) ? off : 6 };
  }, [preset, lightOn, lightOff]);

  async function submit() {
    if (!farmId) return;
    setFieldError(null);
    setError(null);
    if (plantCount.trim()) {
      const pc = parseGrowerNumber(plantCount, { integer: true });
      if (!pc.ok) {
        setFieldError(growerNumberFieldErrorRu(pc.error, copy.formPlantCount));
        return;
      }
    }
    if (!validatePhotoperiodHours(effectiveLight.on, effectiveLight.off)) {
      setFieldError(copy.invalidPhotoperiod);
      return;
    }
    setPending(true);
    try {
      const pc = plantCount.trim() ? parseGrowerNumber(plantCount, { integer: true }) : null;
      await createGrowCycleTracking(supabase, {
        farmId,
        name: name.trim() || copy.formTitleNew,
        cultivarName: strain.trim() || undefined,
        startDate,
        stage: initialStageForMaterial(material),
        zoneId: zoneId || null,
        plantCount: pc?.ok ? pc.value : null,
        startMaterial: material,
        lightHoursOn: effectiveLight.on,
        lightHoursOff: effectiveLight.off,
        lightsOnAt,
      });
      refetchAll();
      onSubmitted?.();
    } catch (e: unknown) {
      setError(mapGrowCycleRpcError(e instanceof Error ? e.message : strings.manualReading.saveFailed));
    } finally {
      setPending(false);
    }
  }

  return (
    <CycleFormScreen>
      <CycleFormCard>
        <CycleFormLabel>{copy.formName}</CycleFormLabel>
        <CycleFormFieldInput value={name} onChangeText={setName} editable={!pending} />
        <CycleFormDivider />
        <CycleFormLabel>{copy.formStrain}</CycleFormLabel>
        <CycleFormFieldInput value={strain} onChangeText={setStrain} editable={!pending} />
        <CycleFormDivider />
        <CycleFormLabel>{copy.formPlantCount}</CycleFormLabel>
        <CycleFormFieldInput
          value={plantCount}
          onChangeText={setPlantCount}
          keyboardType="numeric"
          editable={!pending}
        />
      </CycleFormCard>

      <CycleFormCard>
        <CycleFormLabel>{copy.formZone}</CycleFormLabel>
        <CycleFormChipRow>
          <CycleFormChip label={copy.formZoneNone} selected={!zoneId} onPress={() => setZoneId('')} disabled={pending} />
          {(zonesQuery.data ?? []).map((z) => (
            <CycleFormChip
              key={z.id}
              label={z.name}
              selected={zoneId === z.id}
              onPress={() => setZoneId(z.id)}
              disabled={pending}
            />
          ))}
        </CycleFormChipRow>
        <CycleFormDivider />
        <CycleFormLabel>{copy.formStartMaterial}</CycleFormLabel>
        <CycleFormChipRow>
          {(['seed', 'clone'] as const).map((m) => (
            <CycleFormChip
              key={m}
              label={m === 'seed' ? copy.materialSeed : copy.materialClone}
              selected={material === m}
              onPress={() => setMaterial(m)}
              disabled={pending}
            />
          ))}
        </CycleFormChipRow>
        <CycleFormDivider />
        <CycleFormLabel>{copy.formStartDate}</CycleFormLabel>
        <CycleFormFieldInput
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          editable={!pending}
        />
      </CycleFormCard>

      <CycleFormCard>
        <CycleFormLabel>{copy.formLightPreset}</CycleFormLabel>
        <CycleFormChipRow>
          <CycleFormChip
            label={copy.preset186}
            selected={preset === '18/6'}
            onPress={() => setPreset('18/6')}
            disabled={pending}
          />
          <CycleFormChip
            label={copy.preset1212}
            selected={preset === '12/12'}
            onPress={() => setPreset('12/12')}
            disabled={pending}
          />
          <CycleFormChip
            label={copy.presetCustom}
            selected={preset === 'custom'}
            onPress={() => setPreset('custom')}
            disabled={pending}
          />
        </CycleFormChipRow>
        {preset === 'custom' ? (
          <CycleFormFieldRow>
            <CycleFormFieldInput
              style={styles.half}
              value={lightOn}
              onChangeText={setLightOn}
              keyboardType="numeric"
              placeholder={copy.formLightOn}
              editable={!pending}
            />
            <CycleFormFieldInput
              style={styles.half}
              value={lightOff}
              onChangeText={setLightOff}
              keyboardType="numeric"
              placeholder={copy.formLightOff}
              editable={!pending}
            />
          </CycleFormFieldRow>
        ) : null}
        <CycleFormDivider />
        <CycleFormLabel>{copy.formLightsOnAt}</CycleFormLabel>
        <CycleFormFieldInput value={lightsOnAt} onChangeText={setLightsOnAt} placeholder="06:00" editable={!pending} />
      </CycleFormCard>

      <CycleFormErrors fieldError={fieldError} error={error} />
      <CycleFormPrimaryButton label={copy.formSubmit} onPress={submit} pending={pending} disabled={pending} />
    </CycleFormScreen>
  );
}

function makeStyles(_c: MobileThemeColors) {
  return StyleSheet.create({
    half: { flex: 1, minWidth: 120 },
  });
}
