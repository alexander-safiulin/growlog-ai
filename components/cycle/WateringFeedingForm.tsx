'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createGrowCycleFeedingLog,
  fetchFarmNutrientRecipes,
  fetchRecipeDoses,
  growerStageLabelRu,
  stagesForStartMaterial,
  type GrowCycleStage,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type DoseRow = { productLabel: string; amountMl: string };

export function WateringFeedingForm({ kind }: { kind: 'watering' | 'feeding' }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { supabase, farmId, cycle, scopeId, refetchAll } = useFarmContext();
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
  const [doses, setDoses] = useState<DoseRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const recipesQuery = useQuery({
    queryKey: ['farm-recipes-lib', farmId],
    enabled: !!farmId,
    queryFn: () => fetchFarmNutrientRecipes(supabase, farmId!),
  });

  useEffect(() => {
    if (!recipeId) return;
    void fetchRecipeDoses(supabase, recipeId).then((rows) => {
      const vol = Number(volume) || 1000;
      setDoses(
        rows.map((r) => ({
          productLabel: r.fertilizer_label,
          amountMl: String(Math.round(r.dose_per_l * (vol / 1000) * 100) / 100),
        })),
      );
    });
  }, [recipeId, supabase, volume]);

  if (!cycle || !farmId || !scopeId) {
    return <p className="text-sm text-muted-foreground">{t('common.needActiveCycle')}</p>;
  }

  const stageOptions = stagesForStartMaterial(cycle.start_material === 'clone' ? 'clone' : 'seed');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cycle || !farmId || !scopeId) return;
    setError(null);
    setPending(true);
    try {
      await createGrowCycleFeedingLog(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId,
        entryKind: kind,
        volumeMl: Number(volume),
        ph: ph ? Number(ph) : null,
        ecMs: ec ? Number(ec) : null,
        airTempC: airTemp ? Number(airTemp) : null,
        airRhPct: airRh ? Number(airRh) : null,
        recipeId: recipeId || null,
        comment: comment || null,
        doses: doses.map((d) => ({
          productLabel: d.productLabel,
          amountMl: Number(d.amountMl) || 0,
        })),
        newStage: newStage || null,
        lightHoursOn: changeLight ? lightOn : null,
        lightHoursOff: changeLight ? lightOff : null,
        lightsOnAt: changeLight ? lightsOnAt : null,
      });
      await refetchAll();
      await router.push('/cycle');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('cycle.logVolume')}</label>
        <Input
          type="number"
          min={1}
          required
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('cycle.logPh')}</label>
          <Input value={ph} onChange={(e) => setPh(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('cycle.logEc')}</label>
          <Input value={ec} onChange={(e) => setEc(e.target.value)} inputMode="decimal" />
        </div>
      </div>
      {kind === 'feeding' ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('cycle.logRecipe')}</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={recipeId}
            onChange={(e) => setRecipeId(e.target.value)}
          >
            <option value="">{t('cycle.logRecipeNone')}</option>
            {(recipesQuery.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>{r.name ?? r.id}</option>
            ))}
          </select>
        </div>
      ) : null}
      {doses.length > 0 ? (
        <div className="space-y-2">
          <span className="text-sm font-medium">{t('cycle.logDoses')}</span>
          {doses.map((d, i) => (
            <div key={i} className="flex gap-2">
              <Input value={d.productLabel} readOnly className="flex-1" />
              <Input
                className="w-28"
                value={d.amountMl}
                onChange={(e) => {
                  const next = [...doses];
                  next[i] = { ...d, amountMl: e.target.value };
                  setDoses(next);
                }}
              />
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('cycle.logAirTemp')}</label>
          <Input value={airTemp} onChange={(e) => setAirTemp(e.target.value)} inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('cycle.logAirRh')}</label>
          <Input value={airRh} onChange={(e) => setAirRh(e.target.value)} inputMode="decimal" />
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
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t('common.saving') : t('cycle.logSubmit')}
      </Button>
    </form>
  );
}
