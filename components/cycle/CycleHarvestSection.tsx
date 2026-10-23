'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export function CycleHarvestSection() {
  const { t } = useTranslation();
  const { supabase, farmId, cycle, scopeId, farms, refetchAll } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';

  const harvestQuery = useQuery({
    queryKey: ['cycle-harvest', cycle?.id],
    enabled: !!cycle?.id,
    queryFn: () => fetchCycleHarvestRecord(supabase, cycle!.id),
  });

  const [wet, setWet] = useState('');
  const [dry, setDry] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const row = harvestQuery.data;
    if (!row) return;
    if (row.wet_weight_kg != null) setWet(String(row.wet_weight_kg).replace('.', ','));
    if (row.dry_weight_kg != null) setDry(String(row.dry_weight_kg).replace('.', ','));
    if (row.harvested_at) {
      const d = new Date(row.harvested_at);
      const local = new Intl.DateTimeFormat('en-CA', { timeZone: farmTz }).format(d);
      setHarvestDate(local);
    }
  }, [harvestQuery.data, farmTz]);

  if (!cycle || !farmId || !scopeId) return null;

  const showLifecycle =
    cycle.stage === 'drying' || cycle.stage === 'curing' || cycle.stage === 'completed';

  if (!showLifecycle) return null;

  async function saveHarvest() {
    if (!cycle || !farmId || !scopeId) return;
    setError(null);
    const errs: Record<string, string> = {};
    const wetP = parseOptionalGrowerNumber(wet);
    const dryP = parseOptionalGrowerNumber(dry);
    if (!wetP.ok) errs.wet = growerNumberFieldErrorRu(wetP.error, t('cycle.harvestWet'));
    if (!dryP.ok) errs.dry = growerNumberFieldErrorRu(dryP.error, t('cycle.harvestDry'));
    if (wetP.ok && !isNaNValue(wetP.value) && wetP.value < 0) {
      errs.wet = t('cycle.harvestNegative');
    }
    if (dryP.ok && !isNaNValue(dryP.value) && dryP.value < 0) {
      errs.dry = t('cycle.harvestNegative');
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setPending(true);
    try {
      const at = harvestDate
        ? instantForFarmCalendarDate(harvestDate, farmTz)
        : new Date().toISOString();
      const hasExisting = Boolean(harvestQuery.data?.id);
      const wetVal = wetP.ok && !isNaNValue(wetP.value) ? wetP.value : null;
      const dryVal = dryP.ok && !isNaNValue(dryP.value) ? dryP.value : null;

      await upsertGrowCycleHarvest(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId,
        harvestedAt: at,
        ...(hasExisting
          ? {
              weightPatch: {
                wet_weight_kg: wet.trim() === '' ? null : wetVal,
                dry_weight_kg: dry.trim() === '' ? null : dryVal,
              },
            }
          : {
              wetWeightKg: wetVal,
              dryWeightKg: dryVal,
            }),
      });
      await harvestQuery.refetch();
      await refetchAll();
    } catch (e: unknown) {
      setError(mapGrowCycleRpcError(e instanceof Error ? e.message : t('common.error')));
    } finally {
      setPending(false);
    }
  }

  async function endDrying() {
    if (!cycle || !farmId || !scopeId) return;
    setPending(true);
    setError(null);
    try {
      await transitionGrowCycleStage(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId,
        newStage: 'curing',
      });
      await refetchAll();
    } catch (e: unknown) {
      setError(mapGrowCycleRpcError(e instanceof Error ? e.message : t('common.error')));
    } finally {
      setPending(false);
    }
  }

  async function completeCycle() {
    if (!cycle || !farmId || !scopeId) return;
    setPending(true);
    setError(null);
    try {
      await transitionGrowCycleStage(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId,
        newStage: 'completed',
      });
      await refetchAll();
    } catch (e: unknown) {
      setError(mapGrowCycleRpcError(e instanceof Error ? e.message : t('common.error')));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-card p-3">
      <h3 className="text-sm font-semibold">{t('cycle.harvestTitle')}</h3>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('cycle.harvestWet')}</label>
          <Input value={wet} onChange={(e) => setWet(e.target.value)} inputMode="decimal" />
          {fieldErrors.wet ? <p className="text-xs text-destructive">{fieldErrors.wet}</p> : null}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('cycle.harvestDry')}</label>
          <Input value={dry} onChange={(e) => setDry(e.target.value)} inputMode="decimal" />
          {fieldErrors.dry ? <p className="text-xs text-destructive">{fieldErrors.dry}</p> : null}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">{t('cycle.harvestDate')}</label>
          <Input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
        </div>
      </div>
      <Button type="button" size="sm" disabled={pending} onClick={() => void saveHarvest()}>
        {pending ? t('common.saving') : t('cycle.harvestSave')}
      </Button>

      <div className="flex flex-wrap gap-2">
        {cycle.stage === 'drying' ? (
          <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => void endDrying()}>
            {t('cycle.endDrying')}
          </Button>
        ) : null}
        {cycle.stage === 'drying' || cycle.stage === 'curing' ? (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => void completeCycle()}>
            {t('cycle.completeCycle')}
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
