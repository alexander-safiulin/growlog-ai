'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createGrowCycleFeedingLog,
  dosesFromRecipeLines,
  fetchCycleStageRecipeForStage,
  fetchFarmNutrientRecipes,
  fetchRecipeDoses,
  growerNumberFieldErrorRu,
  growerStageLabelRu,
  isNaNValue,
  mapGrowCycleRpcError,
  occurredAtForFarmCalendarDay,
  parseGrowerNumber,
  parseOptionalGrowerNumber,
  rescaleAutoDoses,
  stagesForStartMaterial,
  validatePhotoperiodHours,
  type DoseRowState,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

export function WateringFeedingForm({ kind }: { kind: 'watering' | 'feeding' }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { supabase, farmId, cycle, scopeId, refetchAll, farms } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const prefillDate =
    typeof router.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(router.query.date)
      ? router.query.date
      : '';
  const [volume, setVolume] = useState('');
  const [ph, setPh] = useState('');
  const [ec, setEc] = useState('');
  const [airTemp, setAirTemp] = useState('');
  const [airRh, setAirRh] = useState('');
  const [recipeId, setRecipeId] = useState('');
  const [comment, setComment] = useState('');
  const [newStage, setNewStage] = useState('');
  const [changeLight, setChangeLight] = useState(false);
  const [lightOn, setLightOn] = useState(cycle?.light_hours_on ?? 18);
  const [lightOff, setLightOff] = useState(cycle?.light_hours_off ?? 6);
  const [lightsOnAt, setLightsOnAt] = useState(cycle?.lights_on_at?.slice(0, 5) ?? '06:00');
  const [doses, setDoses] = useState<DoseRowState[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const prevVolumeRef = useRef(0);
  const recipePrefilled = useRef(false);

  const recipesQuery = useQuery({
    queryKey: ['farm-recipes-lib', farmId],
    enabled: !!farmId,
    queryFn: () => fetchFarmNutrientRecipes(supabase, farmId!),
  });

  useEffect(() => {
    if (!cycle?.id || recipePrefilled.current) return;
    void fetchCycleStageRecipeForStage(supabase, cycle.id, cycle.stage).then((link) => {
      if (link?.recipe_id) {
        setRecipeId(link.recipe_id);
        recipePrefilled.current = true;
      }
    });
  }, [cycle?.id, cycle?.stage, supabase]);

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
    if (prev > 0 && prev !== next) {
      setDoses((cur) => rescaleAutoDoses(cur, prev, next));
    }
    prevVolumeRef.current = next;
  }, [volume]);

  if (!cycle || !farmId || !scopeId) {
    return <p className="text-sm text-muted-foreground">{t('common.needActiveCycle')}</p>;
  }

  const stageOptions = stagesForStartMaterial(cycle.start_material === 'clone' ? 'clone' : 'seed');

  function validateForm(): boolean {
    const errs: Record<string, string> = {};
    const vol = parseGrowerNumber(volume);
    if (!vol.ok) errs.volume = growerNumberFieldErrorRu(vol.error, t('cycle.logVolume'));

    for (const [key, raw, label] of [
      ['ph', ph, t('cycle.logPh')],
      ['ec', ec, t('cycle.logEc')],
      ['airTemp', airTemp, t('cycle.logAirTemp')],
      ['airRh', airRh, t('cycle.logAirRh')],
    ] as const) {
      const p = parseOptionalGrowerNumber(raw);
      if (!p.ok) errs[key] = growerNumberFieldErrorRu(p.error, label);
    }

    if (changeLight && !validatePhotoperiodHours(lightOn, lightOff)) {
      errs.light = t('cycle.invalidPhotoperiod');
    }

    doses.forEach((d, i) => {
      const p = parseGrowerNumber(d.amountMl);
      if (!p.ok) errs[`dose_${i}`] = growerNumberFieldErrorRu(p.error, t('cycle.logDoseMl'));
    });

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cycle || !farmId || !scopeId) return;
    if (!validateForm()) return;
    setError(null);
    setPending(true);
    try {
      const vol = parseGrowerNumber(volume);
      if (!vol.ok) return;
      const phV = parseOptionalGrowerNumber(ph);
      const ecV = parseOptionalGrowerNumber(ec);
      const tV = parseOptionalGrowerNumber(airTemp);
      const rhV = parseOptionalGrowerNumber(airRh);

      const occurredAt = prefillDate
        ? occurredAtForFarmCalendarDay(prefillDate, farmTz)
        : new Date().toISOString();

      await createGrowCycleFeedingLog(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId,
        entryKind: kind,
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
        lightHoursOn: changeLight ? lightOn : null,
        lightHoursOff: changeLight ? lightOff : null,
        lightsOnAt: changeLight ? lightsOnAt : null,
      });
      await refetchAll();
      await router.push('/cycle');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setError(mapGrowCycleRpcError(msg));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {prefillDate ? (
        <p className="text-sm text-muted-foreground">
          {t('cycle.logPrefillDate', { date: prefillDate })}
        </p>
      ) : null}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('cycle.logVolume')}</label>
        <Input value={volume} onChange={(e) => setVolume(e.target.value)} inputMode="decimal" />
        {fieldErrors.volume ? <p className="text-xs text-destructive">{fieldErrors.volume}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('cycle.logPh')}</label>
          <Input value={ph} onChange={(e) => setPh(e.target.value)} inputMode="decimal" />
          {fieldErrors.ph ? <p className="text-xs text-destructive">{fieldErrors.ph}</p> : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('cycle.logEc')}</label>
          <Input value={ec} onChange={(e) => setEc(e.target.value)} inputMode="decimal" />
          {fieldErrors.ec ? <p className="text-xs text-destructive">{fieldErrors.ec}</p> : null}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('cycle.logRecipe')}</label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={recipeId}
          onChange={(e) => {
            recipePrefilled.current = true;
            setRecipeId(e.target.value);
          }}
        >
          <option value="">{t('cycle.logRecipeNone')}</option>
          {(recipesQuery.data ?? []).map((r) => (
            <option key={r.id} value={r.id}>{r.name ?? r.id}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('cycle.logDoses')}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setDoses((d) => [
                ...d,
                { productLabel: '', amountMl: '', autoScaled: false },
              ])
            }
          >
            {t('cycle.addDoseRow')}
          </Button>
        </div>
        {doses.map((d, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={d.productLabel}
              className="flex-1"
              onChange={(e) => {
                const next = [...doses];
                next[i] = { ...d, productLabel: e.target.value, autoScaled: false };
                setDoses(next);
              }}
            />
            <Input
              className="w-28"
              value={d.amountMl}
              onChange={(e) => {
                const next = [...doses];
                next[i] = { ...d, amountMl: e.target.value, autoScaled: false };
                setDoses(next);
              }}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('cycle.logAirTemp')}</label>
          <Input value={airTemp} onChange={(e) => setAirTemp(e.target.value)} inputMode="decimal" />
          {fieldErrors.airTemp ? <p className="text-xs text-destructive">{fieldErrors.airTemp}</p> : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('cycle.logAirRh')}</label>
          <Input value={airRh} onChange={(e) => setAirRh(e.target.value)} inputMode="decimal" />
          {fieldErrors.airRh ? <p className="text-xs text-destructive">{fieldErrors.airRh}</p> : null}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('cycle.logComment')}</label>
        <Input value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('cycle.logChangeStage')}</label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={newStage}
          onChange={(e) => setNewStage(e.target.value)}
        >
          <option value="">—</option>
          {stageOptions.map((s) => (
            <option key={s} value={s}>{growerStageLabelRu(s)}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={changeLight} onChange={(e) => setChangeLight(e.target.checked)} />
        {t('cycle.logChangeLight')}
      </label>
      {changeLight ? (
        <div className="grid grid-cols-3 gap-2">
          <Input type="number" value={lightOn} onChange={(e) => setLightOn(Number(e.target.value))} />
          <Input type="number" value={lightOff} onChange={(e) => setLightOff(Number(e.target.value))} />
          <Input type="time" value={lightsOnAt} onChange={(e) => setLightsOnAt(e.target.value)} />
        </div>
      ) : null}
      {fieldErrors.light ? <p className="text-xs text-destructive">{fieldErrors.light}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t('common.saving') : t('cycle.logSubmit')}
      </Button>
    </form>
  );
}
