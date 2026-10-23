'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import {
  fetchCycleStageRecipes,
  fetchFarmNutrientRecipes,
  growerStageLabelRu,
  stagesForStartMaterial,
  upsertCycleStageRecipe,
  type GrowCycleStage,
} from '@growlog/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function CycleNutritionTab() {
  const { t } = useTranslation();
  const { supabase, farmId, cycle } = useFarmContext();
  const qc = useQueryClient();
  const [stage, setStage] = useState<GrowCycleStage>('veg');
  const [recipeId, setRecipeId] = useState('');
  const [saved, setSaved] = useState(false);

  const recipesQuery = useQuery({
    queryKey: ['farm-recipes-lib', farmId],
    enabled: !!farmId,
    queryFn: () => fetchFarmNutrientRecipes(supabase, farmId!),
  });

  const linksQuery = useQuery({
    queryKey: ['cycle-stage-recipes', cycle?.id],
    enabled: !!cycle?.id,
    queryFn: () => fetchCycleStageRecipes(supabase, cycle!.id),
  });

  if (!cycle || !farmId) return null;

  const material = cycle.start_material === 'clone' ? 'clone' : 'seed';
  const stages = stagesForStartMaterial(material);
  const linked = linksQuery.data?.find((l) => l.stage === stage);

  async function handleSave() {
    if (!recipeId || !cycle || !farmId) return;
    await upsertCycleStageRecipe(supabase, {
      farmId,
      cycleId: cycle.id,
      stage,
      recipeId,
    });
    setSaved(true);
    await qc.invalidateQueries({ queryKey: ['cycle-stage-recipes', cycle.id] });
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {stages.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStage(s);
              const link = linksQuery.data?.find((l) => l.stage === s);
              setRecipeId(link?.recipe_id ?? '');
            }}
            className={
              stage === s
                ? 'rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground'
                : 'rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground'
            }
          >
            {growerStageLabelRu(s)}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('cycle.nutritionStageRecipe')}</label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={recipeId || linked?.recipe_id || ''}
          onChange={(e) => setRecipeId(e.target.value)}
        >
          <option value="">{t('cycle.nutritionPickRecipe')}</option>
          {(recipesQuery.data ?? []).map((r) => (
            <option key={r.id} value={r.id}>{r.name ?? r.id}</option>
          ))}
        </select>
      </div>
      <Button type="button" onClick={handleSave} disabled={!recipeId}>
        {saved ? t('cycle.nutritionSaved') : t('common.save')}
      </Button>
    </div>
  );
}
