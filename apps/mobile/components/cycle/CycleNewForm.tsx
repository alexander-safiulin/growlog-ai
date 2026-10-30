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
  CycleFormTextButton,
} from '@/components/cycle/cycle-form-ui';
import {
  CycleNewVarietyCard,
  type CycleNewVarietyCardHandle,
} from '@/components/cycle/CycleNewVarietyCard';
import { PhotoperiodDayChart } from '@/components/cycle/PhotoperiodDayChart';
import { uploadPhotoCapture } from '@/lib/photo-upload';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  alignGrowCycleVarietiesForRpc,
  createGrowCycleTracking,
  farmCalendarDateString,
  fetchFarmZones,
  linkMediaToEvent,
  mapGrowCycleRpcError,
  occurredAtOnFarmCalendarDay,
  summarizeGrowCycleVarieties,
  validatePhotoperiodHours,
  type GrowCycleVarietyInput,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

type LightPreset = '18/6' | '12/12' | 'custom';

function newVarietyKey() {
  return `variety-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CycleNewForm({ onSubmitted }: { onSubmitted?: (cycleId: string) => void }) {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cycle;
  const { supabase, farmId, farms, refetchAll, userId, isLocalWorkspace } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const [name, setName] = useState('');
  const [varietyKeys, setVarietyKeys] = useState(() => [newVarietyKey()]);
  const varietyRefs = useRef(new Map<string, CycleNewVarietyCardHandle | null>());
  const [zoneId, setZoneId] = useState('');
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

  function collectVarieties(): {
    inputs: GrowCycleVarietyInput[];
    photos: Array<ReturnType<CycleNewVarietyCardHandle['photoPick']>>;
    fieldErrors: string[];
  } {
    const inputs: GrowCycleVarietyInput[] = [];
    const photos: Array<ReturnType<CycleNewVarietyCardHandle['photoPick']>> = [];
    const fieldErrors: string[] = [];
    for (const key of varietyKeys) {
      const handle = varietyRefs.current.get(key);
      if (!handle) continue;
      const fe = handle.fieldError();
      if (fe) fieldErrors.push(fe);
      const row = handle.buildInput();
      if (row) {
        inputs.push(row);
        photos.push(handle.photoPick());
      }
    }
    return { inputs, photos, fieldErrors };
  }

  async function attachVarietyPhotos(params: {
    cycleId: string;
    scopeId: string;
    occurredAt: string;
    created: Array<{ noteEventId: string | null; cultivarName: string | null }>;
    varieties: GrowCycleVarietyInput[];
    photos: Array<ReturnType<CycleNewVarietyCardHandle['photoPick']>>;
  }) {
    if (isLocalWorkspace || !userId) return;
    const aligned = alignGrowCycleVarietiesForRpc(params.varieties, params.photos);
    for (let i = 0; i < aligned.length; i += 1) {
      const pick = aligned[i].extra;
      if (!pick) continue;
      const variety = aligned[i].variety;
      const created = params.created[i];
      const caption =
        variety.comment?.trim() || variety.cultivarName.trim() || created?.cultivarName || copy.formStrain;
      const photoOutcome = await uploadPhotoCapture(supabase, {
        farmId: farmId!,
        cycleId: params.cycleId,
        scopeId: params.scopeId,
        pick,
        caption,
        capturedAt: params.occurredAt,
        userId,
        offlineOk: false,
      });
      if (photoOutcome.status !== 'uploaded') continue;
      if (created?.noteEventId) {
        await linkMediaToEvent(supabase, {
          farmId: farmId!,
          parentEventId: created.noteEventId,
          mediaAssetId: photoOutcome.mediaAssetId,
          photoEventId: photoOutcome.eventId,
        });
      }
    }
  }

  async function submit() {
    if (!farmId) return;
    setFieldError(null);
    setError(null);

    const { inputs: varieties, photos, fieldErrors } = collectVarieties();
    if (fieldErrors.length) {
      setFieldError(fieldErrors[0] ?? null);
      return;
    }

    const incomplete = varieties.find(
      (v, i) =>
        !v.cultivarName.trim() &&
        (v.plantCount != null || (v.comment && v.comment.length > 0) || photos[i]),
    );
    if (incomplete) {
      setFieldError(copy.formVarietyNameRequired);
      return;
    }

    if (!validatePhotoperiodHours(effectiveLight.on, effectiveLight.off)) {
      setFieldError(copy.invalidPhotoperiod);
      return;
    }

    const summary = varieties.length ? summarizeGrowCycleVarieties(varieties) : null;

    setPending(true);
    try {
      const occurredAt = occurredAtOnFarmCalendarDay(startDate, farmTz);
      const result = await createGrowCycleTracking(supabase, {
        farmId,
        name: name.trim() || copy.formTitleNew,
        cultivarName: summary?.cultivarName ?? undefined,
        startDate,
        stage: summary?.stage ?? 'propagation',
        zoneId: zoneId || null,
        plantCount: summary?.plantCount ?? null,
        startMaterial: summary?.startMaterial ?? 'seed',
        lightHoursOn: effectiveLight.on,
        lightHoursOff: effectiveLight.off,
        lightsOnAt,
        varieties: varieties.length ? varieties : undefined,
      });

      const scopeId = typeof result.scope.id === 'string' ? result.scope.id : null;
      const cycleId = typeof result.cycle.id === 'string' ? result.cycle.id : null;
      if (cycleId && scopeId && varieties.length) {
        try {
          await attachVarietyPhotos({
            cycleId,
            scopeId,
            occurredAt,
            created: result.varieties,
            varieties,
            photos,
          });
        } catch {
          setError(copy.procedurePhotoAttachFailed);
          refetchAll();
          return;
        }
      }

      refetchAll();
      const createdCycleId = typeof result.cycle.id === 'string' ? result.cycle.id : '';
      onSubmitted?.(createdCycleId);
    } catch (e: unknown) {
      setError(mapGrowCycleRpcError(e instanceof Error ? e.message : strings.manualReading.saveFailed));
    } finally {
      setPending(false);
    }
  }

  function addVariety() {
    setVarietyKeys((keys) => [...keys, newVarietyKey()]);
  }

  function removeVariety(key: string) {
    setVarietyKeys((keys) => (keys.length <= 1 ? keys : keys.filter((k) => k !== key)));
    varietyRefs.current.delete(key);
  }

  return (
    <CycleFormScreen>
      <CycleFormCard>
        <CycleFormLabel>{copy.formName}</CycleFormLabel>
        <CycleFormFieldInput value={name} onChangeText={setName} editable={!pending} />
      </CycleFormCard>

      {varietyKeys.map((key, index) => (
        <CycleNewVarietyCard
          key={key}
          ref={(node) => {
            varietyRefs.current.set(key, node);
          }}
          index={index}
          canRemove={varietyKeys.length > 1}
          disabled={pending}
          onRemove={() => removeVariety(key)}
          voiceActive={varietyKeys.length === 1}
          onFieldError={(message) => {
            if (message) setError(message);
          }}
        />
      ))}

      <View style={styles.addVarietyWrap}>
        <CycleFormTextButton label={copy.formVarietyAdd} onPress={addVariety} disabled={pending} />
      </View>

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
        <PhotoperiodDayChart
          schedule={{
            lightHoursOn: effectiveLight.on,
            lightHoursOff: effectiveLight.off,
            lightsOnAt,
          }}
        />
      </CycleFormCard>

      <CycleFormErrors fieldError={fieldError} error={error} />
      <CycleFormPrimaryButton label={copy.formSubmit} onPress={submit} pending={pending} disabled={pending} />
    </CycleFormScreen>
  );
}

function makeStyles(_c: MobileThemeColors) {
  return StyleSheet.create({
    half: { flex: 1, minWidth: 120 },
    addVarietyWrap: { marginTop: -4, marginBottom: 4 },
  });
}
