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
import { loadNutrientGuestStoreMobile } from '@/lib/nutrient-guest-storage';
import {
  appendLocalJournalEntry,
  buildGuestSolutionSnapshot,
  createGrowCycleFeedingLog,
  dosesFromGuestSolverInputs,
  dosesFromRecipeLines,
  fetchJournalRecipePrefillId,
  fetchNutrientPlanStepRecipeHint,
  guestWorkspaceStepRecipeHint,
  fetchNutrientRecipeRow,
  fetchRecipeDoses,
  resolveFeedLogCompositionTrusted,
  formatGrowerPrefillDate,
  growerNumberFieldErrorRu,
  guestSolverInputsToRecipeLines,
  isNaNValue,
  listFarmNutrientRecipes,
  mapGrowCycleRpcError,
  occurredAtForFarmCalendarDay,
  parseGrowerNumber,
  parseOptionalGrowerNumber,
  rescaleAutoDoses,
  type DoseRowState,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

type JournalRecipeOption = {
  id: string;
  name: string | null;
  volume_l: number | null;
  solution_kind?: string | null;
  inputs?: Record<string, unknown>;
  result?: Record<string, unknown>;
};

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
    queryKey: ['farm-recipes-journal', farmId, isLocalWorkspace],
    enabled: !!farmId && (isLocalWorkspace || !!userId),
    queryFn: async (): Promise<JournalRecipeOption[]> => {
      if (isLocalWorkspace) {
        const store = await loadNutrientGuestStoreMobile();
        return store.recipes.map((r) => ({
          id: r.id,
          name: r.name,
          volume_l: r.volume_l,
          solution_kind: r.solution_kind,
          inputs: r.inputs,
          result: (r.inputs._solverResult as Record<string, unknown> | undefined) ?? {},
        }));
      }
      const rows = await listFarmNutrientRecipes(supabase, farmId!);
      return rows.map((r) => ({
        id: r.id as string,
        name: (r.name as string | null) ?? null,
        volume_l: r.volume_l != null ? Number(r.volume_l) : null,
        solution_kind: (r.solution_kind as string | null) ?? null,
        inputs: (r.inputs as Record<string, unknown>) ?? {},
        result: (r.result as Record<string, unknown>) ?? {},
      }));
    },
  });

  const planRecipeHintQuery = useQuery({
    queryKey: ['cycle-plan-step-recipe', cycle?.id, isLocalWorkspace],
    enabled: !!cycle?.id && (isLocalWorkspace || !!userId),
    queryFn: async () => {
      if (isLocalWorkspace) {
        const store = await loadNutrientGuestStoreMobile();
        return guestWorkspaceStepRecipeHint(store);
      }
      return fetchNutrientPlanStepRecipeHint(supabase, cycle!.id);
    },
  });

  useEffect(() => {
    if (!cycle?.id || recipePrefilled.current || !recipesQuery.isSuccess) return;
    if (isLocalWorkspace && !planRecipeHintQuery.isSuccess) return;
    let cancelled = false;
    void (async () => {
      try {
        const id = isLocalWorkspace
          ? (planRecipeHintQuery.data?.recipeId ?? null)
          : await fetchJournalRecipePrefillId(supabase, {
              cycleId: cycle.id,
              stage: cycle.stage,
            });
        if (cancelled || !id) return;
        if (!recipesRef.current?.some((r) => r.id === id)) return;
        setRecipeId(id);
        recipePrefilled.current = true;
        if (entryKind === 'feeding') setRecipeOpen(true);
      } catch {
        // Prefill is optional. A failed lookup must not surface as an uncaught rejection.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    cycle?.id,
    cycle?.stage,
    entryKind,
    supabase,
    isLocalWorkspace,
    recipesQuery.isSuccess,
    planRecipeHintQuery.isSuccess,
    planRecipeHintQuery.data,
  ]);

  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const recipesRef = useRef(recipesQuery.data);
  recipesRef.current = recipesQuery.data;

  useEffect(() => {
    if (entryKind !== 'feeding' || !recipeId) return;
    if (isLocalWorkspace && !recipesQuery.isSuccess) return;
    let cancelled = false;
    void (async () => {
      const recipeMeta = recipesRef.current?.find((r) => r.id === recipeId);
      const volParsed = parseGrowerNumber(volumeRef.current, { allowEmpty: true });
      const vol = volParsed.ok && !isNaNValue(volParsed.value) ? volParsed.value : 1000;
      if (isLocalWorkspace) {
        if (!recipeMeta?.inputs) return;
        if (!cancelled) {
          setDoses(dosesFromGuestSolverInputs(recipeMeta.inputs, vol, recipeMeta.volume_l ?? null));
          prevVolumeRef.current = vol;
        }
        return;
      }
      const rows = await fetchRecipeDoses(supabase, recipeId);
      if (cancelled) return;
      setDoses(dosesFromRecipeLines(rows, vol, recipeMeta?.volume_l ?? null));
      prevVolumeRef.current = vol;
    })();
    return () => {
      cancelled = true;
    };
  }, [entryKind, recipeId, supabase, isLocalWorkspace, recipesQuery.isSuccess]);

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

  const planHint = planRecipeHintQuery.data;

  function recipeChipLabel(r: JournalRecipeOption): string {
    const base = r.name ?? r.id;
    if (planHint?.recipeId === r.id && planHint.weekLabel) {
      return copy.logRecipeWeekChip.replace('{name}', base).replace('{week}', planHint.weekLabel);
    }
    return base;
  }

  function renderSolutionChips() {
    return (
      <>
      <CycleFormChipRow>
        <CycleFormChip
          label={copy.logRecipeNone}
          selected={!recipeId}
          onPress={() => {
            setRecipeId('');
            if (entryKind === 'feeding') setDoses([]);
          }}
          disabled={formBusy}
        />
        {(recipesQuery.data ?? []).map((r) => (
          <CycleFormChip
            key={r.id}
            label={recipeChipLabel(r)}
            selected={recipeId === r.id}
            disabled={formBusy}
            onPress={() => {
              recipePrefilled.current = true;
              setRecipeId(r.id);
              if (entryKind === 'feeding') setRecipeOpen(true);
            }}
          />
        ))}
      </CycleFormChipRow>
      {recipesQuery.isSuccess && (recipesQuery.data?.length ?? 0) === 0 ? (
        <CycleFormCaption>{copy.logRecipeEmpty}</CycleFormCaption>
      ) : null}
    </>
  );
  }

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

      const recipeMeta = recipesQuery.data?.find((r) => r.id === recipeId);
      if (recipeId && recipesQuery.isSuccess) {
        const inList = !!recipeMeta;
        if (!inList && isLocalWorkspace) {
          setFieldError(copy.logRecipeMissing);
          return;
        }
        if (!inList && !isLocalWorkspace) {
          const row = await fetchNutrientRecipeRow(supabase, farmId, recipeId);
          if (!row) {
            setFieldError(copy.logRecipeMissing);
            return;
          }
        }
      }

      const guestLines =
        recipeMeta?.inputs && isLocalWorkspace
          ? guestSolverInputsToRecipeLines(recipeMeta.inputs)
          : undefined;
      const compositionTrusted = await resolveFeedLogCompositionTrusted(supabase, {
        entryKind,
        recipeId: recipeId || null,
        volumeMl: vol.value,
        recipeVolumeL: recipeMeta?.volume_l ?? null,
        doses: entryKind === 'feeding' ? doses : [],
        guestRecipeLines: guestLines,
      });
      const solutionSnapshot =
        isLocalWorkspace && recipeId && recipeMeta
          ? buildGuestSolutionSnapshot({
              recipeId,
              name: recipeMeta.name ?? recipeId,
              solutionKind: recipeMeta.solution_kind ?? 'working',
              inputs: recipeMeta.inputs ?? {},
              includeComposition: compositionTrusted,
            })
          : null;

      if (isLocalWorkspace) {
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
              recipe_id: recipeId || null,
              recipe_name: recipeMeta?.name ?? null,
              solution_snapshot: solutionSnapshot,
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
        recipeId: recipeId || null,
        recipeCompositionTrusted: compositionTrusted,
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

      {entryKind === 'watering' ? (
        <CycleFormCard>
          <CycleFormLabel>{copy.logRecipe}</CycleFormLabel>
          {renderSolutionChips()}
        </CycleFormCard>
      ) : null}

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
              {renderSolutionChips()}
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
