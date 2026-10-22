'use client';

import { SOLVER_VERSION } from '@growlog/nutrient-calc';
import { logFeedingFromNutrientRecipe, saveNutrientRecipeWithMeta } from '@growlog/domain';
import { NutrientResultPanel } from '@/components/nutrient/NutrientResultPanel';
import { useNutrientWorkspace } from '@/components/nutrient/workspace/NutrientWorkspaceContext';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/providers/I18nProvider';
import { productDisplayName } from '@/lib/nutrient/product-display-names';
import { useEffect, useState } from 'react';

export function WandTab() {
  const { t } = useTranslation();
  const {
    catalog,
    locale,
    supabase,
    userId,
    farmId,
    cycle,
    scopeId,
    profileSlug,
    model,
    volumeL,
    setVolumeL,
    tankMode,
    setTankMode,
    stockFactor,
    setStockFactor,
    setModel,
    result,
    target,
    activeStep,
    activeWater,
    selectedIds,
    activeWaterProfileId,
    activeSystemId,
    activeStepId,
    activeFeedScheduleId,
    saveName,
    setSaveName,
    saveKind,
    setSaveKind,
    saveStatus,
    setSaveStatus,
    reloadFarmData,
    unifiedProducts,
  } = useNutrientWorkspace();

  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    setSavedRecipeId(null);
  }, [saveName, result, selectedIds, profileSlug, volumeL, tankMode, stockFactor, model]);

  const profile = catalog.target_profiles.find((p) => p.slug === profileSlug);

  const resolveName = (id: string, fallback: string) => {
    const p = unifiedProducts.find((u) => u.id === id);
    if (!p) return fallback;
    return productDisplayName(p.external_key, p.name, locale);
  };

  const onSave = async (): Promise<string | undefined> => {
    if (!userId || !farmId || !result || !saveName.trim()) {
      setSaveStatus(t('nutrient.save.needLogin'));
      return undefined;
    }
    setSaveStatus(t('common.saving'));
    try {
      const { id } = await saveNutrientRecipeWithMeta(supabase, {
        farmId,
        name: saveName.trim(),
        volumeL,
        solutionKind: saveKind,
        cycleId: cycle?.id ?? null,
        scopeId: scopeId ?? null,
        targetProfileId: profile?.id ?? null,
        farmFeedSystemId: activeSystemId || null,
        farmFeedSystemStepId: activeStepId || null,
        feedScheduleId: activeFeedScheduleId || null,
        inputs: {
          profileSlug,
          model,
          tankMode,
          selectedIds,
          waterProfileId: activeWaterProfileId,
          systemId: activeSystemId,
          systemStepId: activeStepId,
          feedScheduleId: activeFeedScheduleId,
        },
        result,
        solverVersion: SOLVER_VERSION,
        userId,
      });
      setSaveStatus(t('common.saved'));
      setSavedRecipeId(id);
      await reloadFarmData();
      return id;
    } catch {
      setSaveStatus(t('common.error'));
      return undefined;
    }
  };

  const onLogFeeding = async () => {
    if (!farmId || !cycle?.id || !scopeId || !saveName.trim()) return;
    if (!savedRecipeId) {
      setSaveStatus(t('nutrient.timeline.saveBeforeLog'));
      return;
    }
    await logFeedingFromNutrientRecipe(supabase, {
      farmId,
      cycleId: cycle.id,
      scopeId,
      recipeId: savedRecipeId,
      recipeName: saveName.trim(),
      volumeL,
      userId,
    });
    setSaveStatus(t('nutrient.timeline.logged'));
    await reloadFarmData();
  };

  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('nutrient.magic.hint')}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <label>{t('nutrient.volumeL')}
          <input type="number" className="w-full border rounded px-2 py-1" value={volumeL} onChange={(e) => setVolumeL(Number(e.target.value))} />
        </label>
        <label>{t('nutrient.tankMode')}
          <select className="w-full border rounded px-2 py-1" value={tankMode} onChange={(e) => setTankMode(e.target.value as 'single' | 'ab')}>
            <option value="single">{t('nutrient.tankSingle')}</option>
            <option value="ab">{t('nutrient.tankAb')}</option>
          </select>
        </label>
        <label>{t('nutrient.stockFactor')}
          <input type="number" className="w-full border rounded px-2 py-1" value={stockFactor} onChange={(e) => setStockFactor(Number(e.target.value))} />
        </label>
        <label>{t('nutrient.model')}
          <select className="w-full border rounded px-2 py-1" value={model} onChange={(e) => setModel(e.target.value as typeof model)}>
            <option value="canonical">{t('nutrient.modelCanonical')}</option>
            <option value="hydroodo_legacy">{t('nutrient.modelLegacy')}</option>
          </select>
        </label>
      </div>

      {result && (
        <NutrientResultPanel
          catalog={catalog}
          result={result}
          target={target}
          model={model}
          volumeL={volumeL}
          tankMode={tankMode}
          stepMeta={activeStep ? { ph_target: activeStep.ph_target, ec_target_ms_cm: activeStep.ec_target_ms_cm } : undefined}
          waterMeta={activeWater ? { ph: activeWater.ph ?? undefined, ecMsCm: activeWater.ec_ms_cm ?? undefined } : undefined}
          resolveProductName={resolveName}
        />
      )}

      {userId && farmId && result && (
        <div className="flex flex-wrap gap-2 items-end border-t pt-4">
          <input
            className="rounded-md border px-2 py-1 text-sm"
            placeholder={t('nutrient.recipeName')}
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
          />
          <select className="rounded-md border px-2 py-1 text-sm" value={saveKind} onChange={(e) => setSaveKind(e.target.value as typeof saveKind)}>
            <option value="recipe">{t('nutrient.solutionKind.recipe')}</option>
            <option value="stock">{t('nutrient.solutionKind.stock')}</option>
            <option value="working">{t('nutrient.solutionKind.working')}</option>
          </select>
          <Button type="button" onClick={() => onSave()}>{t('nutrient.saveRecipe')}</Button>
          {cycle?.id && scopeId && (
            <Button type="button" variant="secondary" onClick={() => onLogFeeding()}>
              {t('nutrient.timeline.logFeeding')}
            </Button>
          )}
          {saveStatus && <span className="text-sm text-muted-foreground">{saveStatus}</span>}
        </div>
      )}
    </section>
  );
}
