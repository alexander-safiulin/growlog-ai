'use client';

import { SOLVER_VERSION } from '@growlog/nutrient-calc';
import { logFeedingFromNutrientRecipe, saveNutrientRecipeWithMeta } from '@growlog/domain';
import { NutrientResultPanel } from '@/components/nutrient/NutrientResultPanel';
import { useNutrientWorkspace } from '@/components/nutrient/workspace/NutrientWorkspaceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/components/providers/I18nProvider';
import { productDisplayName } from '@/lib/nutrient/product-display-names';
import {
  savedRecipeIdAfterFingerprintChange,
  solutionDoseFingerprint,
  wandWorkspaceFingerprint,
} from '@/lib/nutrient/workspace/wand-recipe-session';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

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
    wandComputing,
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
    isCloudSynced,
    saveGuestRecipe,
    showOptionalIons,
    setShowOptionalIons,
  } = useNutrientWorkspace();

  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const prevWorkspaceFingerprint = useRef<string | null>(null);

  const workspaceFingerprint = useMemo(
    () =>
      wandWorkspaceFingerprint({
        selectedIds,
        profileSlug,
        volumeL,
        tankMode,
        stockFactor,
        model,
        waterProfileId: activeWaterProfileId,
        systemStepId: activeStepId,
        doseFingerprint: solutionDoseFingerprint(result),
      }),
    [
      selectedIds,
      profileSlug,
      volumeL,
      tankMode,
      stockFactor,
      model,
      activeWaterProfileId,
      activeStepId,
      result,
    ],
  );

  useEffect(() => {
    setSavedRecipeId((current) =>
      savedRecipeIdAfterFingerprintChange(
        prevWorkspaceFingerprint.current,
        workspaceFingerprint,
        current,
      ),
    );
    prevWorkspaceFingerprint.current = workspaceFingerprint;
  }, [workspaceFingerprint]);

  const profile = catalog.target_profiles.find((p) => p.slug === profileSlug);

  const resolveName = (id: string, fallback: string) => {
    const p = unifiedProducts.find((u) => u.id === id);
    if (!p) return fallback;
    return productDisplayName(p.external_key, p.name, locale);
  };

  const solutionKindLabels = {
    recipe: t('nutrient.solutionKind.recipe'),
    stock: t('nutrient.solutionKind.stock'),
    working: t('nutrient.solutionKind.working'),
  } as const;
  const solutionKindLabel = solutionKindLabels[saveKind];

  const onSave = async (): Promise<string | undefined> => {
    if (!result || !saveName.trim()) return undefined;
    if (!isCloudSynced) {
      setSaveStatus(t('common.saving'));
      try {
        const id = await saveGuestRecipe({
          name: saveName.trim(),
          solutionKind: saveKind,
          volumeL,
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
          solverResult: result as unknown as Record<string, unknown>,
        });
        setSaveStatus(t('nutrient.save.savedLocally'));
        setSavedRecipeId(id);
        return id;
      } catch {
        setSaveStatus(t('common.error'));
        return undefined;
      }
    }
    if (!userId || !farmId) {
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
      body: t('nutrient.timeline.feedingEventBody', {
        name: saveName.trim(),
        volume: String(volumeL),
      }),
    });
    setSaveStatus(t('nutrient.timeline.logged'));
    await reloadFarmData();
  };

  const showStickyActions = Boolean(result);

  return (
    <section className="space-y-4">
      <Card className="border-grow-leaf/20 bg-gradient-to-br from-grow-sage/30 to-card shadow-sm dark:from-grow-sage/10">
        <CardContent className="flex gap-3 p-4">
          <Sparkles className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
          <p className="text-sm text-muted-foreground leading-relaxed">{t('nutrient.magic.hint')}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('nutrient.volumeL')}>
          <Input
            type="number"
            inputMode="decimal"
            className="h-11 rounded-xl"
            value={volumeL}
            onChange={(e) => setVolumeL(Number(e.target.value))}
          />
        </Field>
        <Field label={t('nutrient.tankMode')}>
          <NativeSelect value={tankMode} onChange={(e) => setTankMode(e.target.value as 'single' | 'ab')}>
            <option value="single">{t('nutrient.tankSingle')}</option>
            <option value="ab">{t('nutrient.tankAb')}</option>
          </NativeSelect>
        </Field>
      </div>

      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between rounded-xl border bg-muted/40 px-3 py-2 text-sm font-medium"
        onClick={() => setAdvancedOpen((o) => !o)}
        aria-expanded={advancedOpen}
      >
        {t('nutrient.advancedSettings')}
        <ChevronDown className={cn('h-4 w-4 transition-transform', advancedOpen && 'rotate-180')} />
      </button>

      {advancedOpen && (
        <div className="grid gap-3 sm:grid-cols-2 animate-in fade-in duration-200">
          <Field label={t('nutrient.stockFactor')}>
            <Input
              type="number"
              className="h-11 rounded-xl"
              value={stockFactor}
              onChange={(e) => setStockFactor(Number(e.target.value))}
            />
          </Field>
          <Field label={t('nutrient.model')}>
            <NativeSelect value={model} onChange={(e) => setModel(e.target.value as typeof model)}>
              <option value="canonical">{t('nutrient.modelCanonical')}</option>
              <option value="hydroodo_legacy">{t('nutrient.modelLegacy')}</option>
            </NativeSelect>
          </Field>
        </div>
      )}

      {wandComputing && !result && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}

      {!result && !wandComputing && selectedIds.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {t('nutrient.magic.emptyNoFertilizers')}
          </CardContent>
        </Card>
      )}

      {result && (
        <NutrientResultPanel
          catalog={catalog}
          result={result}
          target={target}
          model={model}
          volumeL={volumeL}
          tankMode={tankMode}
          computing={wandComputing}
          solutionKindLabel={solutionKindLabel}
          stepMeta={activeStep ? { ph_target: activeStep.ph_target, ec_target_ms_cm: activeStep.ec_target_ms_cm } : undefined}
          waterMeta={activeWater ? { ph: activeWater.ph ?? undefined, ecMsCm: activeWater.ec_ms_cm ?? undefined } : undefined}
          resolveProductName={resolveName}
          showOptionalIons={showOptionalIons}
          onShowOptionalIonsChange={setShowOptionalIons}
        />
      )}

      {showStickyActions && (
        <div className="rounded-2xl border border-grow-leaf/20 bg-card p-3 shadow-sm space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              className="h-11 rounded-xl"
              placeholder={t('nutrient.recipeName')}
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
            <NativeSelect
              className="sm:min-w-[8rem]"
              value={saveKind}
              onChange={(e) => setSaveKind(e.target.value as typeof saveKind)}
            >
              <option value="recipe">{t('nutrient.solutionKind.recipe')}</option>
              <option value="stock">{t('nutrient.solutionKind.stock')}</option>
              <option value="working">{t('nutrient.solutionKind.working')}</option>
            </NativeSelect>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-11 flex-1 rounded-xl" onClick={() => onSave()}>
              {isCloudSynced ? t('nutrient.saveRecipe') : t('nutrient.saveRecipeLocal')}
            </Button>
            {isCloudSynced && cycle?.id && scopeId && (
              <Button type="button" variant="secondary" className="min-h-11 flex-1 rounded-xl" onClick={() => onLogFeeding()}>
                {t('nutrient.timeline.logFeeding')}
              </Button>
            )}
          </div>
          {!isCloudSynced && (
            <p className="text-xs text-muted-foreground text-center">{t('nutrient.guest.localDeviceNote')}</p>
          )}
          {saveStatus && <p className="text-xs text-center text-muted-foreground">{saveStatus}</p>}
        </div>
      )}
    </section>
  );
}
