'use client';

import {
  deleteNutrientRecipe,
  duplicateNutrientRecipe,
  renameNutrientRecipe,
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
    reloadFarmData,
    loadRecipeIntoWorkspace,
  } = useNutrientWorkspace();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const onRename = async (id: string) => {
    if (!farmId || !renameValue.trim()) return;
    await renameNutrientRecipe(supabase, farmId, id, renameValue.trim());
    setRenamingId(null);
    await reloadFarmData();
  };

  const onDelete = async (id: string) => {
    if (!farmId) return;
    await deleteNutrientRecipe(supabase, farmId, id);
    await reloadFarmData();
  };

  const onDuplicate = async (id: string, name: string) => {
    if (!farmId) return;
    await duplicateNutrientRecipe(supabase, {
      farmId,
      sourceRecipeId: id,
      newName: `${name} (copy)`,
      userId,
    });
    await reloadFarmData();
  };

  const onRepeatNewGrow = async (id: string, name: string) => {
    if (!farmId) return;
    await duplicateNutrientRecipe(supabase, {
      farmId,
      sourceRecipeId: id,
      newName: `${name} — ${t('nutrient.solutions.repeat')}`,
      cycleId: cycle?.id ?? null,
      scopeId: scopeId ?? null,
      userId,
      parentRecipeId: id,
    });
    await reloadFarmData();
  };

  const kindLabel = (k: NutrientSolutionKind) => {
    if (k === 'stock') return t('nutrient.solutionKind.stock');
    if (k === 'working') return t('nutrient.solutionKind.working');
    return t('nutrient.solutionKind.recipe');
  };

  return (
    <section className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('nutrient.solutions.hint')}</p>
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
                <Button type="button" size="sm" variant="destructive" onClick={() => onDelete(r.id)}>
                  {t('nutrient.solutions.delete')}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {r.cycle_id ? `cycle: ${r.cycle_id}` : t('common.optional')}
              {r.linked_event_id ? ` · event: ${r.linked_event_id}` : ''}
            </p>
            {farmId && (
              <Button type="button" size="sm" variant="ghost" onClick={() => onRepeatNewGrow(r.id, r.name)}>
                {t('nutrient.solutions.repeatNewGrow')}
              </Button>
            )}
          </li>
        ))}
        {!savedRecipes.length && <li className="text-muted-foreground">{t('nutrient.solutions.empty')}</li>}
      </ul>
    </section>
  );
}
