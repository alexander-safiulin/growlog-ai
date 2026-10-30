import {
  JournalVoiceFieldSection,
  useJournalVoiceField,
} from '@/components/voice/JournalVoiceField';
import {
  CycleFormCaption,
  CycleFormCard,
  CycleFormChip,
  CycleFormChipRow,
  CycleFormDivider,
  CycleFormErrors,
  CycleFormFieldInput,
  CycleFormFieldRow,
  CycleFormLabel,
  CycleFormMuted,
  CycleFormPrefillDate,
  CycleFormPrimaryButton,
  CycleFormScreen,
  CycleFormSectionTitle,
  CycleFormTextButton,
} from '@/components/cycle/cycle-form-ui';
import { attachPhotoToLogEvent, mapLogPhotoAttachError } from '@/lib/attach-log-event-photo';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  createGrowCycleFeedingLog,
  dosesFromRecipeLines,
  fetchCycleStageRecipeForStage,
  fetchFarmNutrientRecipes,
  fetchRecipeDoses,
  formatGrowerPrefillDate,
  growerNumberFieldErrorRu,
  isNaNValue,
  occurredAtForFarmCalendarDay,
  mapGrowCycleRpcError,
  parseGrowerNumber,
  parseOptionalGrowerNumber,
  rescaleAutoDoses,
  appendLocalJournalEntry,
  type DoseRowState,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

export function CycleLogForm({
  entryKind,
  onSubmitted,
  prefillDate,
}: {
  entryKind: 'watering' | 'feeding';
  onSubmitted?: () => void;
  prefillDate?: string;
}) {
  const { strings, locale } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cycle;
  const {
    supabase,
    farmId,
    cycle,
    scopeId,
    refetchAll,
    farms,
    isLocalWorkspace,
    updateLocalWorkspace,
    displayFarmTimezone,
    userId,
  } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? displayFarmTimezone;
  const [volume, setVolume] = useState('');
  const [ph, setPh] = useState('');
  const [ec, setEc] = useState('');
  const [recipeId, setRecipeId] = useState('');
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [doses, setDoses] = useState<DoseRowState[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const prevVolumeRef = useRef(0);
  const recipePrefilled = useRef(false);
  const captureCopy = strings.cycle;
  const captureScreen = strings.captureScreen;

  const onCommentCaptureError = useCallback((message: string | null) => {
    setError(message);
  }, []);

  const commentCapture = useJournalVoiceField({
    onChangeText: setComment,
    onError: onCommentCaptureError,
    disabled: pending,
  });

  const recipesQuery = useQuery({
    queryKey: ['farm-recipes-lib', farmId],
    enabled: !!farmId && !isLocalWorkspace && !!userId,
    queryFn: () => fetchFarmNutrientRecipes(supabase, farmId!),
  });

  useEffect(() => {
    if (entryKind !== 'feeding' || isLocalWorkspace || !cycle?.id || recipePrefilled.current) return;
    void fetchCycleStageRecipeForStage(supabase, cycle.id, cycle.stage).then((link) => {
      if (link?.recipe_id) {
        setRecipeId(link.recipe_id);
        recipePrefilled.current = true;
        setRecipeOpen(true);
      }
    });
  }, [cycle?.id, cycle?.stage, entryKind, supabase, isLocalWorkspace]);

  useEffect(() => {
    if (entryKind !== 'feeding' || !recipeId) return;
    void (async () => {
      const recipeMeta = recipesQuery.data?.find((r) => r.id === recipeId);
      const rows = await fetchRecipeDoses(supabase, recipeId);
      const volParsed = parseGrowerNumber(volume, { allowEmpty: true });
      const vol = volParsed.ok && !isNaNValue(volParsed.value) ? volParsed.value : 1000;
      setDoses(dosesFromRecipeLines(rows, vol, recipeMeta?.volume_l ?? null));
      prevVolumeRef.current = vol;
    })();
  }, [entryKind, recipeId, supabase]);

  useEffect(() => {
    const volParsed = parseGrowerNumber(volume, { allowEmpty: true });
    if (!volParsed.ok || isNaNValue(volParsed.value) || volParsed.value <= 0) return;
    const next = volParsed.value;
    const prev = prevVolumeRef.current;
    if (prev > 0 && prev !== next) setDoses((cur) => rescaleAutoDoses(cur, prev, next));
    prevVolumeRef.current = next;
  }, [volume]);

  useEffect(() => {
    commentCapture.syncText(comment);
  }, [comment, commentCapture]);

  if (!cycle || !farmId || !scopeId) {
    return <CycleFormMuted>{copy.noActive}</CycleFormMuted>;
  }

  const formBusy = pending || commentCapture.formBusy;
  const logEventTitle = entryKind === 'feeding' ? copy.logTitleFeed : copy.logTitleWater;
  const selectedRecipeName = recipeId
    ? recipesQuery.data?.find((r) => r.id === recipeId)?.name ?? copy.logRecipe
    : copy.logRecipeNone;

  async function submit() {
    if (!cycle || !farmId || !scopeId || formBusy) return;
    setFieldError(null);
    setError(null);
    const vol = parseGrowerNumber(volume);
    if (!vol.ok) {
      setFieldError(growerNumberFieldErrorRu(vol.error, copy.logVolume));
      return;
    }
    for (const [raw, label] of [
      [ph, copy.logPh],
      [ec, copy.logEc],
    ] as const) {
      const p = parseOptionalGrowerNumber(raw);
      if (!p.ok) {
        setFieldError(growerNumberFieldErrorRu(p.error, label));
        return;
      }
    }
    setPending(true);
    try {
      const phV = parseOptionalGrowerNumber(ph);
      const ecV = parseOptionalGrowerNumber(ec);
      const airTempVal: number | null = null;
      const airRhVal: number | null = null;
      const occurredAt = prefillDate
        ? occurredAtForFarmCalendarDay(prefillDate, farmTz)
        : new Date().toISOString();

      if (isLocalWorkspace) {
        const recipeMeta = recipesQuery.data?.find((r) => r.id === recipeId);
        await updateLocalWorkspace((store) =>
          appendLocalJournalEntry(store, {
            event_type: entryKind,
            occurred_at: occurredAt,
            body: comment || null,
            source_type: 'user_form',
            payload: {
              volume_ml: vol.value,
              ph: phV.ok && !isNaNValue(phV.value) ? phV.value : null,
              ec_ms: ecV.ok && !isNaNValue(ecV.value) ? ecV.value : null,
              air_temp_c: airTempVal,
              air_rh_pct: airRhVal,
              recipe_name: entryKind === 'feeding' ? recipeMeta?.name ?? null : null,
              doses:
                entryKind === 'feeding'
                  ? doses.map((d) => {
                const amt = parseGrowerNumber(d.amountMl);
                return {
                  product_label: d.productLabel,
                  amount_ml: amt.ok ? amt.value : 0,
                  fertilizer_product_id: d.fertilizerProductId ?? null,
                  farm_fertilizer_product_id: d.farmFertilizerProductId ?? null,
                };
                    })
                  : [],
            },
          }),
        );
        refetchAll();
        onSubmitted?.();
        return;
      }

      const result = await createGrowCycleFeedingLog(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId,
        entryKind,
        volumeMl: vol.value,
        occurredAt,
        ph: phV.ok && !isNaNValue(phV.value) ? phV.value : null,
        ecMs: ecV.ok && !isNaNValue(ecV.value) ? ecV.value : null,
        airTempC: airTempVal,
        airRhPct: airRhVal,
        recipeId: entryKind === 'feeding' ? recipeId || null : null,
        comment: comment.trim() || null,
        doses: (entryKind === 'feeding' ? doses : []).map((d) => {
          const amt = parseGrowerNumber(d.amountMl);
          return {
            productLabel: d.productLabel,
            amountMl: amt.ok ? amt.value : 0,
            fertilizerProductId: d.fertilizerProductId,
            farmFertilizerProductId: d.farmFertilizerProductId,
          };
        }),
        newStage: null,
        lightHoursOn: null,
        lightHoursOff: null,
        lightsOnAt: null,
      });

      if (commentCapture.photoPick && commentCapture.cloudEnabled) {
        const parentEventId = result.event.id;
        if (typeof parentEventId !== 'string' || !parentEventId) {
          throw new Error(captureCopy.procedurePhotoAttachFailed);
        }
        const caption = comment.trim() || logEventTitle;
        await attachPhotoToLogEvent(supabase, {
          farmId,
          cycleId: cycle.id,
          scopeId,
          parentEventId,
          pick: commentCapture.photoPick,
          caption,
          capturedAt: occurredAt,
          userId,
        });
        commentCapture.clearPhoto();
      }

      refetchAll();
      onSubmitted?.();
    } catch (e: unknown) {
      const photoMsg = mapLogPhotoAttachError(e, captureCopy, strings.manualReading.saveFailed);
      setError(
        photoMsg !== strings.manualReading.saveFailed
          ? photoMsg
          : mapGrowCycleRpcError(e instanceof Error ? e.message : strings.manualReading.saveFailed),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
    <CycleFormScreen>
      <CycleFormCard>
        {prefillDate ? (
          <CycleFormPrefillDate
            label={copy.logPrefillDate.replace('{date}', formatGrowerPrefillDate(prefillDate, locale))}
          />
        ) : null}
        <CycleFormLabel>{copy.logVolume}</CycleFormLabel>
        <CycleFormFieldInput
          value={volume}
          onChangeText={setVolume}
          keyboardType="decimal-pad"
          editable={!formBusy}
        />
        <CycleFormDivider />
        <CycleFormFieldRow>
          <View style={styles.metricField}>
            <CycleFormSectionTitle>{copy.logPh}</CycleFormSectionTitle>
            <CycleFormFieldInput value={ph} onChangeText={setPh} keyboardType="decimal-pad" editable={!formBusy} />
          </View>
          <View style={styles.metricField}>
            <CycleFormSectionTitle>{copy.logEc}</CycleFormSectionTitle>
            <CycleFormFieldInput value={ec} onChangeText={setEc} keyboardType="decimal-pad" editable={!formBusy} />
          </View>
        </CycleFormFieldRow>
        {entryKind === 'watering' ? (
          <>
            <CycleFormDivider />
            <JournalVoiceFieldSection
              label={copy.logComment}
              placeholder={captureScreen.bodyPlaceholder}
              value={comment}
              onChangeText={setComment}
              onError={onCommentCaptureError}
              capture={commentCapture}
              compact
            />
          </>
        ) : null}
      </CycleFormCard>

      {entryKind === 'feeding' ? (
        <CycleFormCard>
          <View style={styles.recipeHeader}>
            <CycleFormLabel>{copy.logRecipe}</CycleFormLabel>
            <CycleFormTextButton
              label={recipeOpen ? copy.logRecipeHide : copy.logRecipeShow}
              onPress={() => setRecipeOpen((open) => !open)}
              disabled={formBusy}
            />
          </View>
          {recipeOpen ? (
            <>
              <CycleFormChipRow>
                <CycleFormChip
                  label={copy.logRecipeNone}
                  selected={!recipeId}
                  onPress={() => setRecipeId('')}
                  disabled={formBusy}
                />
                {(recipesQuery.data ?? []).map((r) => (
                  <CycleFormChip
                    key={r.id}
                    label={r.name ?? r.id}
                    selected={recipeId === r.id}
                    disabled={formBusy}
                    onPress={() => {
                      recipePrefilled.current = true;
                      setRecipeId(r.id);
                    }}
                  />
                ))}
              </CycleFormChipRow>
              {doses.length ? <CycleFormDivider /> : null}
              {doses.map((d, i) => (
                <CycleFormFieldRow key={i}>
                  <CycleFormFieldInput
                    style={styles.doseName}
                    value={d.productLabel}
                    onChangeText={(t) => {
                      const next = [...doses];
                      next[i] = { ...d, productLabel: t, autoScaled: false };
                      setDoses(next);
                    }}
                    editable={!formBusy}
                  />
                  <CycleFormFieldInput
                    style={styles.doseAmount}
                    value={d.amountMl}
                    onChangeText={(t) => {
                      const next = [...doses];
                      next[i] = { ...d, amountMl: t, autoScaled: false };
                      setDoses(next);
                    }}
                    keyboardType="decimal-pad"
                    editable={!formBusy}
                  />
                </CycleFormFieldRow>
              ))}
              <CycleFormTextButton
                label={copy.addDoseRow}
                onPress={() => {
                  setRecipeOpen(true);
                  setDoses((d) => [...d, { productLabel: '', amountMl: '', autoScaled: false }]);
                }}
                disabled={formBusy}
              />
            </>
          ) : (
            <CycleFormCaption>
              {selectedRecipeName}
              {doses.length > 0 ? ` · ${copy.logDoses}: ${doses.length}` : ''}
            </CycleFormCaption>
          )}
          <CycleFormDivider />
          <JournalVoiceFieldSection
            label={copy.logComment}
            placeholder={captureScreen.bodyPlaceholder}
            value={comment}
            onChangeText={setComment}
            onError={onCommentCaptureError}
            capture={commentCapture}
            compact
          />
        </CycleFormCard>
      ) : null}

      <CycleFormErrors fieldError={fieldError} error={error} />
      <CycleFormPrimaryButton
        label={copy.logSubmit}
        onPress={submit}
        pending={pending}
        disabled={formBusy}
      />
    </CycleFormScreen>
    </>
  );
}

function makeStyles(_c: MobileThemeColors) {
  return StyleSheet.create({
    metricField: { flex: 1, minWidth: 120, gap: 6 },
    recipeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    doseName: { flex: 1, minWidth: 140 },
    doseAmount: { width: 96 },
  });
}
