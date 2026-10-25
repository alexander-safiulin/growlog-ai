import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
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
  growerStageLabelRu,
  isNaNValue,
  occurredAtForFarmCalendarDay,
  mapGrowCycleRpcError,
  parseGrowerNumber,
  parseOptionalGrowerNumber,
  rescaleAutoDoses,
  stagesForStartMaterial,
  validatePhotoperiodHours,
  appendLocalJournalEntry,
  type DoseRowState,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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
  const { colors } = useTheme();
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
  const [airTemp, setAirTemp] = useState('');
  const [airRh, setAirRh] = useState('');
  const [recipeId, setRecipeId] = useState('');
  const [comment, setComment] = useState('');
  const [newStage, setNewStage] = useState('');
  const [changeLight, setChangeLight] = useState(false);
  const [lightOn, setLightOn] = useState(String(cycle?.light_hours_on ?? 18));
  const [lightOff, setLightOff] = useState(String(cycle?.light_hours_off ?? 6));
  const [lightsOnAt, setLightsOnAt] = useState(cycle?.lights_on_at?.slice(0, 5) ?? '06:00');
  const [doses, setDoses] = useState<DoseRowState[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const prevVolumeRef = useRef(0);
  const recipePrefilled = useRef(false);

  const recipesQuery = useQuery({
    queryKey: ['farm-recipes-lib', farmId],
    enabled: !!farmId && !isLocalWorkspace && !!userId,
    queryFn: () => fetchFarmNutrientRecipes(supabase, farmId!),
  });

  useEffect(() => {
    if (isLocalWorkspace || !cycle?.id || recipePrefilled.current) return;
    void fetchCycleStageRecipeForStage(supabase, cycle.id, cycle.stage).then((link) => {
      if (link?.recipe_id) {
        setRecipeId(link.recipe_id);
        recipePrefilled.current = true;
      }
    });
  }, [cycle?.id, cycle?.stage, supabase, isLocalWorkspace]);

  useEffect(() => {
    if (!recipeId) return;
    void (async () => {
      const recipeMeta = recipesQuery.data?.find((r) => r.id === recipeId);
      const rows = await fetchRecipeDoses(supabase, recipeId);
      const volParsed = parseGrowerNumber(volume, { allowEmpty: true });
      const vol = volParsed.ok && !isNaNValue(volParsed.value) ? volParsed.value : 1000;
      setDoses(dosesFromRecipeLines(rows, vol, recipeMeta?.volume_l ?? null));
      prevVolumeRef.current = vol;
    })();
  }, [recipeId, supabase]);

  useEffect(() => {
    const volParsed = parseGrowerNumber(volume, { allowEmpty: true });
    if (!volParsed.ok || isNaNValue(volParsed.value) || volParsed.value <= 0) return;
    const next = volParsed.value;
    const prev = prevVolumeRef.current;
    if (prev > 0 && prev !== next) setDoses((cur) => rescaleAutoDoses(cur, prev, next));
    prevVolumeRef.current = next;
  }, [volume]);

  if (!cycle || !farmId || !scopeId) {
    return <Text style={styles.muted}>{copy.noActive}</Text>;
  }

  const material = cycle.start_material === 'clone' ? 'clone' : 'seed';
  const stageOptions = stagesForStartMaterial(material);

  async function submit() {
    if (!cycle || !farmId || !scopeId) return;
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
      [airTemp, copy.logAirTemp],
      [airRh, copy.logAirRh],
    ] as const) {
      const p = parseOptionalGrowerNumber(raw);
      if (!p.ok) {
        setFieldError(growerNumberFieldErrorRu(p.error, label));
        return;
      }
    }
    if (changeLight) {
      const on = parseInt(lightOn, 10);
      const off = parseInt(lightOff, 10);
      if (!validatePhotoperiodHours(on, off)) {
        setFieldError(copy.invalidPhotoperiod);
        return;
      }
    }
    setPending(true);
    try {
      const phV = parseOptionalGrowerNumber(ph);
      const ecV = parseOptionalGrowerNumber(ec);
      const tV = parseOptionalGrowerNumber(airTemp);
      const rhV = parseOptionalGrowerNumber(airRh);
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
              air_temp_c: tV.ok && !isNaNValue(tV.value) ? tV.value : null,
              air_rh_pct: rhV.ok && !isNaNValue(rhV.value) ? rhV.value : null,
              recipe_name: recipeMeta?.name ?? null,
              doses: doses.map((d) => {
                const amt = parseGrowerNumber(d.amountMl);
                return {
                  product_label: d.productLabel,
                  amount_ml: amt.ok ? amt.value : 0,
                  fertilizer_product_id: d.fertilizerProductId ?? null,
                  farm_fertilizer_product_id: d.farmFertilizerProductId ?? null,
                };
              }),
            },
          }),
        );
        refetchAll();
        onSubmitted?.();
        return;
      }

      await createGrowCycleFeedingLog(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId,
        entryKind,
        volumeMl: vol.value,
        occurredAt,
        ph: phV.ok && !isNaNValue(phV.value) ? phV.value : null,
        ecMs: ecV.ok && !isNaNValue(ecV.value) ? ecV.value : null,
        airTempC: tV.ok && !isNaNValue(tV.value) ? tV.value : null,
        airRhPct: rhV.ok && !isNaNValue(rhV.value) ? rhV.value : null,
        recipeId: recipeId || null,
        comment: comment || null,
        doses: doses.map((d) => {
          const amt = parseGrowerNumber(d.amountMl);
          return {
            productLabel: d.productLabel,
            amountMl: amt.ok ? amt.value : 0,
            fertilizerProductId: d.fertilizerProductId,
            farmFertilizerProductId: d.farmFertilizerProductId,
          };
        }),
        newStage: newStage || null,
        lightHoursOn: changeLight ? parseInt(lightOn, 10) : null,
        lightHoursOff: changeLight ? parseInt(lightOff, 10) : null,
        lightsOnAt: changeLight ? lightsOnAt : null,
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
    <ScrollView contentContainerStyle={styles.container}>
      {prefillDate ? (
        <Text style={styles.hint}>
          {copy.logPrefillDate.replace('{date}', formatGrowerPrefillDate(prefillDate, locale))}
        </Text>
      ) : null}
      <Text style={styles.label}>{copy.logVolume}</Text>
      <TextInput
        style={styles.input}
        value={volume}
        onChangeText={setVolume}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Text style={styles.label}>{copy.logPh}</Text>
      <TextInput
        style={styles.input}
        value={ph}
        onChangeText={setPh}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Text style={styles.label}>{copy.logEc}</Text>
      <TextInput
        style={styles.input}
        value={ec}
        onChangeText={setEc}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Text style={styles.label}>{copy.logRecipe}</Text>
      <View style={styles.row}>
        <Button title={copy.logRecipeNone} onPress={() => setRecipeId('')} color={!recipeId ? colors.primary : undefined} />
        {(recipesQuery.data ?? []).map((r) => (
          <Button
            key={r.id}
            title={r.name ?? r.id}
            onPress={() => {
              recipePrefilled.current = true;
              setRecipeId(r.id);
            }}
            color={recipeId === r.id ? colors.primary : undefined}
          />
        ))}
      </View>
      {doses.map((d, i) => (
        <View key={i} style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={d.productLabel}
            onChangeText={(t) => {
              const next = [...doses];
              next[i] = { ...d, productLabel: t, autoScaled: false };
              setDoses(next);
            }}
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={colors.keyboardAppearance}
          />
          <TextInput
            style={[styles.input, { width: 90 }]}
            value={d.amountMl}
            onChangeText={(t) => {
              const next = [...doses];
              next[i] = { ...d, amountMl: t, autoScaled: false };
              setDoses(next);
            }}
            keyboardType="decimal-pad"
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={colors.keyboardAppearance}
          />
        </View>
      ))}
      <Button
        title={copy.addDoseRow}
        onPress={() => setDoses((d) => [...d, { productLabel: '', amountMl: '', autoScaled: false }])}
      />
      <Text style={styles.label}>{copy.logAirTemp}</Text>
      <TextInput
        style={styles.input}
        value={airTemp}
        onChangeText={setAirTemp}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Text style={styles.label}>{copy.logAirRh}</Text>
      <TextInput
        style={styles.input}
        value={airRh}
        onChangeText={setAirRh}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Text style={styles.label}>{copy.logComment}</Text>
      <TextInput
        style={styles.input}
        value={comment}
        onChangeText={setComment}
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Text style={styles.label}>{copy.logChangeStage}</Text>
      <View style={styles.row}>
        <Button title="—" onPress={() => setNewStage('')} />
        {stageOptions.map((s) => (
          <Button
            key={s}
            title={growerStageLabelRu(s)}
            onPress={() => setNewStage(s)}
            color={newStage === s ? colors.primary : undefined}
          />
        ))}
      </View>
      <Button
        title={copy.logChangeLight}
        onPress={() => setChangeLight((v) => !v)}
        color={changeLight ? colors.primary : undefined}
      />
      {changeLight ? (
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={lightOn}
            onChangeText={setLightOn}
            keyboardType="numeric"
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={colors.keyboardAppearance}
          />
          <TextInput
            style={styles.input}
            value={lightOff}
            onChangeText={setLightOff}
            keyboardType="numeric"
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={colors.keyboardAppearance}
          />
          <TextInput
            style={styles.input}
            value={lightsOnAt}
            onChangeText={setLightsOnAt}
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={colors.keyboardAppearance}
          />
        </View>
      ) : null}
      {fieldError ? <Text style={styles.error}>{fieldError}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={copy.logSubmit} onPress={submit} disabled={pending} />
    </ScrollView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    container: { padding: 16, gap: 8, backgroundColor: c.screen },
    label: { fontSize: 14, fontWeight: '600', color: c.text },
    hint: { fontSize: 13, color: c.sectionLabel },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    muted: { padding: 16, color: c.textMuted },
    error: { color: c.dangerText, fontSize: 13 },
  });
}
