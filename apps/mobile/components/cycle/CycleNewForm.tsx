import {
  CycleFormCard,
  CycleFormCaption,
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
import {
  JournalVoiceFieldSection,
  useJournalVoiceField,
} from '@/components/voice/JournalVoiceField';
import { useMobileLocale } from '@/context/LocaleContext';
import { attachPhotoToLogEvent } from '@/lib/attach-log-event-photo';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { uploadPhotoCapture } from '@/lib/photo-upload';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  appendLocalJournalEntry,
  applyLocalNewCycle,
  createGrowCycleTracking,
  createLogEntry,
  LOCAL_WORKSPACE_IDS,
  farmCalendarDateString,
  fetchFarmZones,
  mapGrowCycleRpcError,
  occurredAtOnFarmCalendarDay,
  summarizeGrowCycleVarieties,
  validatePhotoperiodHours,
  type GrowCycle,
  type GrowCycleVarietyInput,
  type Scope,
} from '@growlog/domain';
import NetInfo from '@react-native-community/netinfo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

type LightPreset = '18/6' | '12/12' | 'custom';

function newVarietyKey() {
  return `variety-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function startDateFromRouteParam(param: string | string[] | undefined, farmTz: string): string | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

export function CycleNewForm({ onSubmitted }: { onSubmitted?: (cycleId: string) => void }) {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cycle;
  const queryClient = useQueryClient();
  const { startDate: startDateParam } = useLocalSearchParams<{ startDate?: string }>();
  const { supabase, farmId, farms, refetchAll, userId, isLocalWorkspace, localWorkspace, updateLocalWorkspace } =
    useFarmContext();
  const farmTz =
    farms.find((f) => f.id === farmId)?.timezone ?? localWorkspace?.cycle.timezone ?? 'UTC';
  /** Guest journal is device-only; never call Supabase RPC without a signed-in user. */
  const persistOnDevice = !userId || isLocalWorkspace;
  const [name, setName] = useState('');
  const [varietyKeys, setVarietyKeys] = useState(() => [newVarietyKey()]);
  const varietyRefs = useRef(new Map<string, CycleNewVarietyCardHandle | null>());
  const [zoneId, setZoneId] = useState('');
  const [startDate, setStartDate] = useState(() => {
    return startDateFromRouteParam(startDateParam, farmTz) ?? farmCalendarDateString(farmTz);
  });
  const [preset, setPreset] = useState<LightPreset>('18/6');
  const [lightOn, setLightOn] = useState('18');
  const [lightOff, setLightOff] = useState('6');
  const [lightsOnAt, setLightsOnAt] = useState('06:00');
  const [comment, setComment] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const fromRoute = startDateFromRouteParam(startDateParam, farmTz);
    if (fromRoute) setStartDate(fromRoute);
  }, [startDateParam, farmTz]);

  const onCommentCaptureError = useCallback((message: string | null) => {
    if (message) setError(message);
  }, []);

  const commentCapture = useJournalVoiceField({
    onChangeText: (next) => {
      setComment(next);
      setError(null);
    },
    onError: onCommentCaptureError,
    disabled: pending,
  });

  const zonesQuery = useQuery({
    queryKey: ['farm-zones', farmId],
    enabled: !!farmId && !isLocalWorkspace,
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
    fieldErrors: string[];
  } {
    const inputs: GrowCycleVarietyInput[] = [];
    const fieldErrors: string[] = [];
    for (const key of varietyKeys) {
      const handle = varietyRefs.current.get(key);
      if (!handle) continue;
      const fe = handle.fieldError();
      if (fe) fieldErrors.push(fe);
      const row = handle.buildInput();
      if (row) inputs.push(row);
    }
    return { inputs, fieldErrors };
  }

  async function attachCycleComment(params: { cycleId: string; scopeId: string; occurredAt: string }) {
    if (isLocalWorkspace || !userId) return;
    const trimmed = comment.trim();
    const pick = commentCapture.photoPick;
    if (!trimmed && !pick) return;

    let parentEventId: string | null = null;
    if (trimmed) {
      const logResult = await createLogEntry(supabase, {
        farmId: farmId!,
        cycleId: params.cycleId,
        scopeId: params.scopeId,
        eventType: 'note',
        body: trimmed,
        occurredAt: params.occurredAt,
        sourceType: commentCapture.voiceUsedRef.current ? 'user_voice' : 'user_form',
        createdBy: userId,
        payload: { cycle_setup: true },
      });
      parentEventId = typeof logResult.event.id === 'string' ? logResult.event.id : null;
    }

    if (!pick || !commentCapture.cloudEnabled) return;
    const caption = trimmed || copy.formVarietyComment;
    if (parentEventId) {
      await attachPhotoToLogEvent(supabase, {
        farmId: farmId!,
        cycleId: params.cycleId,
        scopeId: params.scopeId,
        parentEventId,
        pick,
        caption,
        capturedAt: params.occurredAt,
        userId,
      });
      commentCapture.clearPhoto();
      return;
    }

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
    if (photoOutcome.status === 'uploaded') commentCapture.clearPhoto();
  }

  async function submit() {
    if (!farmId) {
      setError(strings.commonMobile.error);
      return;
    }
    setFieldError(null);
    setError(null);

    const { inputs: varieties, fieldErrors } = collectVarieties();
    if (fieldErrors.length) {
      setFieldError(fieldErrors[0] ?? null);
      return;
    }

    const incomplete = varieties.find((v) => !v.cultivarName.trim() && v.plantCount != null);
    if (incomplete) {
      setFieldError(copy.formVarietyNameRequired);
      return;
    }

    if (!validatePhotoperiodHours(effectiveLight.on, effectiveLight.off)) {
      setFieldError(copy.invalidPhotoperiod);
      return;
    }

    const summary = varieties.length ? summarizeGrowCycleVarieties(varieties) : null;

    const run = async () => {
    setPending(true);
    try {
      const occurredAt = occurredAtOnFarmCalendarDay(startDate, farmTz);
      const stage = summary?.stage ?? 'propagation';
      const startMaterial = summary?.startMaterial ?? 'seed';
      const net = await NetInfo.fetch();
      const offline = net.isConnected === false || net.isInternetReachable === false;

      if (persistOnDevice) {
        const trimmedComment = comment.trim();
        await updateLocalWorkspace((store) => {
          const next = applyLocalNewCycle(store, {
            cycleName: name.trim() || copy.formTitleNew,
            cultivarName: summary?.cultivarName ?? null,
            startDate,
            stage,
            startMaterial,
            plantCount: summary?.plantCount ?? null,
            lightHoursOn: effectiveLight.on,
            lightHoursOff: effectiveLight.off,
            lightsOnAt,
            timezone: farmTz,
          });
          if (!trimmedComment) return next;
          return appendLocalJournalEntry(next, {
            event_type: 'note',
            occurred_at: occurredAt,
            body: trimmedComment,
            source_type: commentCapture.voiceUsedRef.current ? 'user_voice' : 'user_form',
            payload: { cycle_setup: true },
          });
        });
        refetchAll();
        onSubmitted?.(LOCAL_WORKSPACE_IDS.cycle);
        return;
      }

      if (offline) {
        setError(strings.login.notices.offline);
        return;
      }

      const result = await createGrowCycleTracking(supabase, {
        farmId,
        name: name.trim() || copy.formTitleNew,
        cultivarName: summary?.cultivarName ?? undefined,
        startDate,
        stage,
        zoneId: zoneId || null,
        plantCount: summary?.plantCount ?? null,
        startMaterial,
        lightHoursOn: effectiveLight.on,
        lightHoursOff: effectiveLight.off,
        lightsOnAt,
        varieties: varieties.length ? varieties : undefined,
      });

      const scopeId = typeof result.scope.id === 'string' ? result.scope.id : null;
      const cycleId = typeof result.cycle.id === 'string' ? result.cycle.id : null;
      if (cycleId && scopeId && (comment.trim() || commentCapture.photoPick)) {
        try {
          await attachCycleComment({ cycleId, scopeId, occurredAt });
        } catch (e: unknown) {
          setError(
            commentCapture.photoPick
              ? copy.procedurePhotoAttachFailed
              : mapGrowCycleRpcError(e instanceof Error ? e.message : strings.manualReading.saveFailed),
          );
          refetchAll();
          return;
        }
      }

      const createdCycleId = typeof result.cycle.id === 'string' ? result.cycle.id : '';
      if (createdCycleId && scopeId) {
        queryClient.setQueryData(['active-cycle', farmId], result.cycle as GrowCycle);
        queryClient.setQueryData(['scopes', createdCycleId], [result.scope as Scope]);
      }
      refetchAll();
      onSubmitted?.(createdCycleId);
    } catch (e: unknown) {
      setError(mapGrowCycleRpcError(e instanceof Error ? e.message : strings.manualReading.saveFailed));
    } finally {
      setPending(false);
    }
    };

    if (persistOnDevice && (localWorkspace?.journal.length ?? 0) > 0) {
      Alert.alert(copy.formTitleNew, copy.localNewCycleWarning, [
        { text: strings.commonMobile.cancel, style: 'cancel' },
        { text: copy.formSubmit, onPress: () => void run() },
      ]);
      return;
    }
    await run();
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
        {startDateFromRouteParam(startDateParam, farmTz) ? (
          <CycleFormCaption>
            {copy.formStartDateFromCalendar.replace('{date}', startDateFromRouteParam(startDateParam, farmTz)!)}
          </CycleFormCaption>
        ) : null}
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

      <CycleFormCard>
        <JournalVoiceFieldSection
          label={copy.formVarietyComment}
          placeholder={copy.procedurePlaceholder}
          value={comment}
          onChangeText={setComment}
          onError={onCommentCaptureError}
          capture={commentCapture}
          compact
          multilineLines={4}
        />
      </CycleFormCard>

      <CycleFormErrors fieldError={fieldError} error={error} />
      <CycleFormPrimaryButton
        label={copy.formSubmit}
        onPress={submit}
        pending={pending}
        disabled={pending || commentCapture.formBusy}
      />
    </CycleFormScreen>
  );
}

function makeStyles(_c: MobileThemeColors) {
  return StyleSheet.create({
    half: { flex: 1, minWidth: 120 },
    addVarietyWrap: { marginTop: -4, marginBottom: 4 },
  });
}
