'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import {
  forwardStagesFrom,
  growerStageLabelRu,
  mapGrowCycleRpcError,
  stagesForStartMaterial,
  transitionGrowCycleStage,
  type GrowCycleStage,
} from '@growlog/domain';
import { useState } from 'react';

export function CycleStageActions() {
  const { t } = useTranslation();
  const { supabase, farmId, cycle, scopeId, refetchAll } = useFarmContext();
  const [fixOpen, setFixOpen] = useState(false);
  const [fixStage, setFixStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!cycle || !farmId || !scopeId) return null;

  const material = cycle.start_material === 'clone' ? 'clone' : 'seed';
  const forward = forwardStagesFrom(cycle.stage as GrowCycleStage, material);

  function stageLabel(s: GrowCycleStage) {
    if (s === 'propagation') return t('cycle.stageAdvance.propagation');
    if (s === 'cloning') return t('cycle.stageAdvance.cloning');
    if (s === 'veg') return t('cycle.stageAdvance.veg');
    if (s === 'preflower') return t('cycle.stageAdvance.preflower');
    if (s === 'flower') return t('cycle.stageAdvance.flower');
    if (s === 'drying') return t('cycle.stageAdvance.drying');
    if (s === 'curing') return t('cycle.stageAdvance.curing');
    return t('cycle.stageAdvance.completed');
  }

  async function go(stage: GrowCycleStage, allowBackward = false) {
    setError(null);
    setPending(true);
    try {
      await transitionGrowCycleStage(supabase, {
        farmId: farmId!,
        cycleId: cycle!.id,
        scopeId: scopeId!,
        newStage: stage,
        allowBackward,
      });
      await refetchAll();
      setFixOpen(false);
    } catch (e: unknown) {
      setError(mapGrowCycleRpcError(e instanceof Error ? e.message : t('common.error')));
    } finally {
      setPending(false);
    }
  }

  const stageOptions = stagesForStartMaterial(material);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{t('cycle.stageActionsTitle')}</h3>
      <div className="flex flex-wrap gap-2">
        {forward.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => void go(s)}
          >
            {stageLabel(s)}
          </Button>
        ))}
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => setFixOpen((v) => !v)}>
        {t('cycle.fixStage')}
      </Button>
      {fixOpen ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={fixStage}
            onChange={(e) => setFixStage(e.target.value)}
          >
            <option value="">—</option>
            {stageOptions.map((s) => (
              <option key={s} value={s}>{growerStageLabelRu(s)}</option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={!fixStage || pending}
            onClick={() => void go(fixStage as GrowCycleStage, true)}
          >
            {t('cycle.fixStageApply')}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
