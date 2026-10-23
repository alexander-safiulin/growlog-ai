'use client';

import { createGuestId } from '@growlog/domain';
import {
  createCycleWithDefaultScope,
  deleteNutrientRecipe,
  duplicateNutrientRecipe,
  renameNutrientRecipe,
  copyGrowCycleNutrientPlan,
  markGrowCycleHarvested,
  repeatNutrientRecipeInCycle,
  type NutrientSolutionKind,
} from '@growlog/domain';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/providers/I18nProvider';
import { useNutrientWorkspace } from '@/components/nutrient/workspace/NutrientWorkspaceContext';

export function SolutionsTab() {
  const { t } = useTranslation();
  const {
    supabase,
    farmId,
    userId,
    cycle,
    scopeId,
    savedRecipes,
    growCycles,
    cycleLabelById,
    eventLabelById,
    authorLabelById,
    reloadFarmData,
    loadRecipeIntoWorkspace,
    isCloudSynced,
    renameGuestRecipe,
    deleteGuestRecipe,
    updateGuestStore,
  } = useNutrientWorkspace();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [repeatRecipeId, setRepeatRecipeId] = useState<string | null>(null);
  const [repeatCycleId, setRepeatCycleId] = useState('');

  const onRename = async (id: string) => {
    if (!renameValue.trim()) return;
    if (!isCloudSynced) {
      await renameGuestRecipe(id, renameValue.trim());
      setRenamingId(null);
      await reloadFarmData();
      return;
    }
    if (!farmId) return;
    await renameNutrientRecipe(supabase, farmId, id, renameValue.trim());
    setRenamingId(null);
    await reloadFarmData();
  };

  const onDelete = async (r: { id: string; linked_event_id?: string | null }) => {
    if (!isCloudSynced) {
      await deleteGuestRecipe(r.id);
      await reloadFarmData();
      return;
    }
    if (!farmId) return;
    if (r.linked_event_id) {
      const ok = window.confirm(t('nutrient.solutions.deleteLinkedWarning'));
      if (!ok) return;
      await deleteNutrientRecipe(supabase, farmId, r.id, { allowLinkedEvent: true });
    } else {
      await deleteNutrientRecipe(supabase, farmId, r.id);
    }
    await reloadFarmData();
  };

  const onDuplicate = async (id: string, name: string) => {
    if (!isCloudSynced) {
      const source = savedRecipes.find((r) => r.id === id);
      if (!source) return;
      updateGuestStore((store) => ({
        ...store,
        recipes: [
          ...store.recipes,
          {
            id: createGuestId(),
            name: `${name} (copy)`,
            solution_kind: source.solution_kind,
            volume_l: source.volume_l,
            inputs: { ...source.inputs },
          },
        ],
      }));
      await reloadFarmData();
      return;
    }
    if (!farmId) return;
    await duplicateNutrientRecipe(supabase, {
      farmId,
      sourceRecipeId: id,
      newName: `${name} (copy)`,
      userId,
    });
    await reloadFarmData();
  };

  const onRepeatInCycle = async (
    sourceId: string,
    sourceName: string,
    sourceCycleId?: string | null,
  ) => {
    if (!farmId || !repeatCycleId) return;
    const targetScope = await supabase
      .from('scopes')
      .select('id')
      .eq('cycle_id', repeatCycleId)
      .eq('farm_id', farmId)
      .limit(1)
      .maybeSingle();
    const scope = targetScope.data?.id as string | undefined;
    if (!scope) return;
    await repeatNutrientRecipeInCycle(supabase, {
      farmId,
      sourceRecipeId: sourceId,
      targetCycleId: repeatCycleId,
      targetScopeId: scope,
      newName: `${sourceName} — ${t('nutrient.solutions.repeat')}`,
      userId,
    });
    if (sourceCycleId) {
      await copyGrowCycleNutrientPlan(supabase, {
        farmId,
        sourceCycleId,
        targetCycleId: repeatCycleId,
        userId,
      });
    }
    setRepeatRecipeId(null);
    setRepeatCycleId('');
    await reloadFarmData();
  };

  const onCreateNewGrowAndRepeat = async (
    sourceId: string,
    sourceName: string,
    sourceCycleId?: string | null,
  ) => {
    if (!farmId || !userId) return;
    const sourceCycle = sourceCycleId
      ? growCycles.find((c) => c.id === sourceCycleId)
      : undefined;
    let markSourceHarvested = false;
    if (sourceCycle?.status === 'active') {
      if (!window.confirm(t('nutrient.solutions.markHarvestedConfirm'))) return;
      markSourceHarvested = true;
    }
    const today = new Date().toISOString().slice(0, 10);
    const { cycle: newCycle, scope } = await createCycleWithDefaultScope(supabase, {
      farmId,
      name: `${t('nutrient.solutions.newGrow')} ${today}`,
      startDate: today,
      stage: 'veg',
      createdBy: userId,
    });
    const cycleId = String((newCycle as { id: string }).id);
    const scopeIdNew = String((scope as { id: string }).id);
    await repeatNutrientRecipeInCycle(supabase, {
      farmId,
      sourceRecipeId: sourceId,
      targetCycleId: cycleId,
      targetScopeId: scopeIdNew,
      newName: `${sourceName} — ${t('nutrient.solutions.repeat')}`,
      userId,
    });
    if (sourceCycleId) {
      await copyGrowCycleNutrientPlan(supabase, {
        farmId,
        sourceCycleId,
        targetCycleId: cycleId,
        userId,
      });
      if (markSourceHarvested) {
        await markGrowCycleHarvested(supabase, farmId, sourceCycleId);
      }
    }
    setRepeatRecipeId(null);
    await reloadFarmData();
  };

  const kindLabel = (k: NutrientSolutionKind) => {
    if (k === 'stock') return t('nutrient.solutionKind.stock');
    if (k === 'working') return t('nutrient.solutionKind.working');
    return t('nutrient.solutionKind.recipe');
  };

  return (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {isCloudSynced ? t('nutrient.solutions.hint') : t('nutrient.solutions.hintGuest')}
      </p>
      <ul className="text-sm space-y-2">
        {savedRecipes.map((r) => (
          <li key={r.id} className="border rounded-md p-3 space-y-2">
            <div className="flex flex-wrap justify-between gap-2 items-start">
              <div>
                {renamingId === r.id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      className="rounded border px-2 py-1 text-sm"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                    />
                    <Button type="button" size="sm" onClick={() => onRename(r.id)}>{t('common.save')}</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setRenamingId(null)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                ) : (
                  <strong>{r.name}</strong>
                )}
                <span className="text-muted-foreground ml-2">{kindLabel(r.solution_kind)}</span>
                {r.parent_recipe_id ? (
                  <span className="text-xs text-muted-foreground block">{t('nutrient.solutions.repeat')}</span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1">
                <Button type="button" size="sm" variant="secondary" onClick={() => loadRecipeIntoWorkspace(r)}>
                  {t('nutrient.solutions.load')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRenamingId(r.id);
                    setRenameValue(r.name);
                  }}
                >
                  {t('nutrient.solutions.rename')}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onDuplicate(r.id, r.name)}>
                  {t('nutrient.solutions.duplicate')}
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(r)}>
                  {t('nutrient.solutions.delete')}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {r.cycle_id
                ? `${t('nutrient.solutions.cycle')}: ${cycleLabelById[r.cycle_id] ?? r.cycle_id}`
                : t('nutrient.solutions.noCycle')}
              {r.linked_event_id
                ? ` · ${t('nutrient.solutions.feedingEvent')}: ${eventLabelById[r.linked_event_id] ?? r.linked_event_id}`
                : ''}
              {r.created_by
                ? ` · ${t('nutrient.solutions.createdBy')}: ${authorLabelById[r.created_by]?.trim() || t('nutrient.solutions.farmMember')}`
                : ''}
            </p>
            {farmId && (
              <div className="flex flex-wrap gap-2 items-center">
                {repeatRecipeId === r.id ? (
                  <>
                    <select
                      className="rounded border px-2 py-1 text-sm"
                      value={repeatCycleId}
                      onChange={(e) => setRepeatCycleId(e.target.value)}
                    >
                      <option value="">{t('nutrient.solutions.pickCycle')}</option>
                      {growCycles.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.status})
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!repeatCycleId}
                      onClick={() => onRepeatInCycle(r.id, r.name, r.cycle_id)}
                    >
                      {t('nutrient.solutions.repeatNewGrow')}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setRepeatRecipeId(null)}>
                      {t('common.cancel')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setRepeatRecipeId(r.id)}>
                      {t('nutrient.solutions.repeatNewGrow')}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => onCreateNewGrowAndRepeat(r.id, r.name, r.cycle_id)}>
                      {t('nutrient.solutions.createGrowAndRepeat')}
                    </Button>
                  </>
                )}
                {cycle?.id && scopeId && !repeatRecipeId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      repeatNutrientRecipeInCycle(supabase, {
                        farmId,
                        sourceRecipeId: r.id,
                        targetCycleId: cycle.id,
                        targetScopeId: scopeId,
                        newName: `${r.name} — ${t('nutrient.solutions.repeat')}`,
                        userId,
                      }).then(() => reloadFarmData())
                    }
                  >
                    {t('nutrient.solutions.repeatOpenGrow')}
                  </Button>
                )}
              </div>
            )}
          </li>
        ))}
        {!savedRecipes.length && <li className="text-muted-foreground">{t('nutrient.solutions.empty')}</li>}
      </ul>
    </section>
  );
}
