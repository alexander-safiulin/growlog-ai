'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import {
  growerStageLabelRu,
  growerStageRank,
  immediateNextStage,
  mapGrowCycleRpcError,
  stageAdvanceLabel,
  stagesForStartMaterial,
  transitionGrowCycleStage,
  type GrowCycleStage,
} from '@growlog/domain';
import { useMemo, useState } from 'react';

export function CycleStageActions() {
  const { t } = useTranslation();
  const { supabase, farmId, cycle, scopeId, refetchAll } = useFarmContext();
  const [pickStage, setPickStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!cycle || !farmId || !scopeId) return null;

  const material = cycle.start_material === 'clone' ? 'clone' : 'seed';
  const currentStage = cycle.stage as GrowCycleStage;
  const nextStage = immediateNextStage(currentStage, material);
  const stageOptions = stagesForStartMaterial(material);

  const otherStages = useMemo(
    () =>
      stageOptions
        .filter((s) => s !== currentStage && s !== nextStage)
        .sort((a, b) => growerStageRank(a) - growerStageRank(b)),
    [stageOptions, currentStage, nextStage],
  );

  function stageLabel(s: GrowCycleStage) {
    return stageAdvanceLabel(currentStage, s, {
      stageAdvance: {
        propagation: t('cycle.stageAdvance.propagation'),
        cloning: t('cycle.stageAdvance.cloning'),
        veg: t('cycle.stageAdvance.veg'),
        preflower: t('cycle.stageAdvance.preflower'),
        flower: t('cycle.stageAdvance.flower'),
        harvest: t('cycle.stageAdvance.harvest'),
        drying: t('cycle.stageAdvance.drying'),
        trimming: t('cycle.stageAdvance.trimming'),
        curing: t('cycle.stageAdvance.curing'),
        completed: t('cycle.stageAdvance.completed'),
      },
    });
  }

  async function go(stage: GrowCycleStage) {
    setError(null);
    setPending(true);
    try {
      await transitionGrowCycleStage(supabase, {
        farmId: farmId!,
        cycleId: cycle!.id,
        scopeId: scopeId!,
        newStage: stage,
        allowBackward: true,
      });
      await refetchAll();
      setPickStage('');
    } catch (e: unknown) {
      setError(mapGrowCycleRpcError(e instanceof Error ? e.message : t('common.error')));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{t('cycle.stageActionsTitle')}</h3>
      <p className="text-sm text-muted-foreground">{growerStageLabelRu(currentStage)}</p>
      {nextStage ? (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => void go(nextStage)}
        >
          {stageLabel(nextStage)}
        </Button>
      ) : null}
      {otherStages.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('cycle.stageOtherPick')}</span>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={pickStage}
            onChange={(e) => setPickStage(e.target.value)}
          >
            <option value="">—</option>
            {otherStages.map((s) => (
              <option key={s} value={s}>
                {growerStageLabelRu(s)}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!pickStage || pending}
            onClick={() => void go(pickStage as GrowCycleStage)}
          >
            {t('cycle.stageOtherApply')}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
