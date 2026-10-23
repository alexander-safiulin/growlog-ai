'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';

type LightPreset = '18/6' | '12/12' | 'custom';

export function NewCycleForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const { supabase, farmId, farms, refetchAll } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const [name, setName] = useState('');
  const [strain, setStrain] = useState('');
  const [plantCount, setPlantCount] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [material, setMaterial] = useState<'seed' | 'clone'>('seed');
  const [startDate, setStartDate] = useState(() => farmCalendarDateString(farmTz));
  const [preset, setPreset] = useState<LightPreset>('18/6');
  const [lightOn, setLightOn] = useState(18);
  const [lightOff, setLightOff] = useState(6);
  const [lightsOnAt, setLightsOnAt] = useState('06:00');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
    return { on: lightOn, off: lightOff };
  }, [preset, lightOn, lightOff]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!farmId) return;
    const errs: Record<string, string> = {};
    if (plantCount.trim()) {
      const pc = parseGrowerNumber(plantCount, { integer: true });
      if (!pc.ok) errs.plantCount = growerNumberFieldErrorRu(pc.error, t('cycle.formPlantCount'));
    }
    if (!validatePhotoperiodHours(effectiveLight.on, effectiveLight.off)) {
      errs.light = t('cycle.invalidPhotoperiod');
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setError(null);
    setPending(true);
    try {
      const stage = initialStageForMaterial(material);
      const pc = plantCount.trim() ? parseGrowerNumber(plantCount, { integer: true }) : null;
      await createGrowCycleTracking(supabase, {
        farmId,
        name: name.trim() || t('onboarding.defaultCycleName'),
        cultivarName: strain.trim() || undefined,
        startDate,
        stage,
        zoneId: zoneId || null,
        plantCount: pc?.ok ? pc.value : null,
        startMaterial: material,
        lightHoursOn: effectiveLight.on,
        lightHoursOff: effectiveLight.off,
        lightsOnAt,
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
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('cycle.formName')}</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('cycle.formStrain')}</label>
        <Input value={strain} onChange={(e) => setStrain(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('cycle.formPlantCount')}</label>
        <Input value={plantCount} onChange={(e) => setPlantCount(e.target.value)} inputMode="numeric" />
        {fieldErrors.plantCount ? (
          <p className="text-xs text-destructive">{fieldErrors.plantCount}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('cycle.formZone')}</label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
        >
          <option value="">{t('cycle.formZoneNone')}</option>
          {(zonesQuery.data ?? []).map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">{t('cycle.formStartMaterial')}</span>
        <div className="flex gap-2">
          {(['seed', 'clone'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMaterial(m)}
              className={
                material === m
                  ? 'rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground'
                  : 'rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground'
              }
            >
              {m === 'seed' ? t('cycle.materialSeed') : t('cycle.materialClone')}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('cycle.formStartDate')}</label>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div className="space-y-2">
        <span className="text-sm font-medium">{t('cycle.formLightPreset')}</span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['18/6', t('cycle.preset186')],
              ['12/12', t('cycle.preset1212')],
              ['custom', t('cycle.presetCustom')],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPreset(id)}
              className={
                preset === id
                  ? 'rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground'
                  : 'rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground'
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {preset === 'custom' ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('cycle.formLightOn')}</label>
            <Input
              type="number"
              min={0}
              max={24}
              value={lightOn}
              onChange={(e) => setLightOn(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('cycle.formLightOff')}</label>
            <Input
              type="number"
              min={0}
              max={24}
              value={lightOff}
              onChange={(e) => setLightOff(Number(e.target.value))}
            />
          </div>
        </div>
      ) : null}
      {fieldErrors.light ? <p className="text-xs text-destructive">{fieldErrors.light}</p> : null}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('cycle.formLightsOnAt')}</label>
        <Input type="time" value={lightsOnAt} onChange={(e) => setLightsOnAt(e.target.value)} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t('common.creating') : t('cycle.formSubmit')}
      </Button>
    </form>
  );
}
