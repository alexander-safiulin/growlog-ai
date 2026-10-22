'use client';

import { useMemo, useState } from 'react';
import {
  SOLVER_VERSION,
  computeDeviations,
  estimateEcWithMeta,
  mapDbProductsToFertilizerSpecs,
  mapDbProfileToTarget,
  solveForward,
  type DbCompositionLineRow,
  type DbFertilizerProductRow,
} from '@growlog/nutrient-calc';
import { SourceBadge } from '@/components/nutrient/SourceBadge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/providers/I18nProvider';
import { useFarmContext } from '@/components/providers/FarmProvider';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import { saveNutrientRecipe } from '@/lib/nutrient/save-farm-recipe';

const MACRO_KEYS = ['N_NO3', 'N_NH4', 'P', 'K', 'Ca', 'Mg', 'S'] as const;

export function NutrientCalculatorWorkspace({ catalog }: { catalog: CatalogBundle }) {
  const { t } = useTranslation();
  const { supabase, userId, farmId } = useFarmContext();
  const allProfiles = catalog.target_profiles;

  const [profileSlug, setProfileSlug] = useState(allProfiles[0]?.slug ?? '');
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    catalog.fertilizers.slice(0, 4).map((p) => p.id),
  );
  const [volumeL, setVolumeL] = useState(100);
  const [model, setModel] = useState<'canonical' | 'hydroodo_legacy'>('hydroodo_legacy');
  const [tankMode, setTankMode] = useState<'single' | 'ab'>('ab');
  const [maxEc, setMaxEc] = useState('');
  const [maxAmmoniumShare, setMaxAmmoniumShare] = useState('');
  const [stockFactor, setStockFactor] = useState(100);
  const [waterNa, setWaterNa] = useState(0);
  const [waterCl, setWaterCl] = useState(0);
  const [saveName, setSaveName] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const products = useMemo(
    () => catalog.fertilizers.filter((p) => selectedIds.includes(p.id)),
    [catalog.fertilizers, selectedIds],
  );

  const fertilizers = useMemo(() => {
    const rows: DbFertilizerProductRow[] = products.map((p) => ({
      id: p.id,
      external_key: p.external_key,
      brand: p.brand,
      name: p.name,
      physical_form: p.physical_form,
      dose_unit: p.dose_unit,
      metadata: p.metadata,
    }));
    const lines: DbCompositionLineRow[] = products.flatMap((p) =>
      p.lines.map((l) => ({
        product_id: p.id,
        form_key: l.form_key,
        value_pct: l.value_pct,
      })),
    );
    return mapDbProductsToFertilizerSpecs(rows, lines);
  }, [products]);

  const profile = allProfiles.find((p) => p.slug === profileSlug);
  const target = profile ? mapDbProfileToTarget(profile) : {};
  const overdose = profile?.overdose_pct ?? {};

  const result = useMemo(() => {
    if (!fertilizers.length || !profile) return null;
    try {
      return solveForward({
        target,
        sourceWater: {
          ppm: { Na: waterNa, Cl: waterCl },
          alkalinityPpmCaCO3: 0,
        },
        fertilizers,
        options: {
          model,
          overdosePctByGroup: overdose,
          volumeL,
          tankMode,
          stockTank: tankMode === 'ab' ? { concentrationFactor: stockFactor, twoTankMode: true } : undefined,
          maxEcMsCm: maxEc ? Number(maxEc) : undefined,
          maxAmmoniumShare: maxAmmoniumShare ? Number(maxAmmoniumShare) : undefined,
          fastSolver: false,
        },
      });
    } catch {
      return null;
    }
  }, [
    fertilizers,
    profile,
    target,
    overdose,
    waterNa,
    waterCl,
    model,
    volumeL,
    tankMode,
    stockFactor,
    maxEc,
    maxAmmoniumShare,
  ]);

  const ecMeta = useMemo(() => {
    if (!result) return null;
    return estimateEcWithMeta(result.best.achievedPpm as Record<string, number>, { ionPairing: true });
  }, [result]);

  const deviations = useMemo(() => {
    if (!result || !profile) return [];
    return computeDeviations(target, result.best.achievedPpm as Record<string, number>, overdose);
  }, [result, profile, target, overdose]);

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onSave = async () => {
    if (!userId || !farmId || !result || !saveName.trim()) {
      setSaveStatus(t('nutrient.save.needLogin'));
      return;
    }
    setSaveStatus(t('common.saving'));
    try {
      await saveNutrientRecipe(supabase, {
        farmId,
        name: saveName.trim(),
        volumeL,
        targetProfileId: null,
        inputs: { profileSlug, model, tankMode, waterNa, waterCl },
        result,
        solverVersion: SOLVER_VERSION,
      });
      setSaveStatus(t('common.saved'));
    } catch {
      setSaveStatus(t('common.error'));
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('nutrient.targetProfile')}</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={profileSlug}
            onChange={(e) => setProfileSlug(e.target.value)}
          >
            {allProfiles.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('nutrient.volumeL')}</label>
          <input
            type="number"
            min={0.1}
            step={1}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={volumeL}
            onChange={(e) => setVolumeL(Number(e.target.value))}
          />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3 text-sm">
        <label className="flex flex-col gap-1">
          {t('nutrient.model')}
          <select className="rounded-md border px-2 py-1" value={model} onChange={(e) => setModel(e.target.value as typeof model)}>
            <option value="hydroodo_legacy">{t('nutrient.modelLegacy')}</option>
            <option value="canonical">{t('nutrient.modelCanonical')}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {t('nutrient.tankMode')}
          <select className="rounded-md border px-2 py-1" value={tankMode} onChange={(e) => setTankMode(e.target.value as typeof tankMode)}>
            <option value="single">{t('nutrient.tankSingle')}</option>
            <option value="ab">{t('nutrient.tankAb')}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {t('nutrient.stockFactor')}
          <input type="number" className="rounded-md border px-2 py-1" value={stockFactor} onChange={(e) => setStockFactor(Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1">
          {t('nutrient.maxEc')}
          <input type="number" className="rounded-md border px-2 py-1" value={maxEc} onChange={(e) => setMaxEc(e.target.value)} placeholder="—" />
        </label>
        <label className="flex flex-col gap-1">
          {t('nutrient.maxAmmonium')}
          <input type="number" className="rounded-md border px-2 py-1" value={maxAmmoniumShare} onChange={(e) => setMaxAmmoniumShare(e.target.value)} placeholder="0–1" />
        </label>
        <label className="flex flex-col gap-1">
          {t('nutrient.waterNa')}
          <input type="number" className="rounded-md border px-2 py-1" value={waterNa} onChange={(e) => setWaterNa(Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1">
          {t('nutrient.waterCl')}
          <input type="number" className="rounded-md border px-2 py-1" value={waterCl} onChange={(e) => setWaterCl(Number(e.target.value))} />
        </label>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">{t('nutrient.fertilizers')}</h2>
        <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1 text-sm">
          {catalog.fertilizers.slice(0, 80).map((p) => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.includes(p.id)}
                onChange={() => toggleProduct(p.id)}
              />
              <span className="flex-1">{p.brand} — {p.name}</span>
              <SourceBadge metadata={p.metadata} compact />
            </label>
          ))}
        </div>
      </section>

      {result && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">{t('nutrient.results')}</h2>
          {ecMeta && (
            <p className="text-sm">
              {t('nutrient.ecEstimate')}: <strong>{ecMeta.ecMsCm.toFixed(2)}</strong> mS/cm
              {ecMeta.ecMsCmRange && (
                <span className="text-muted-foreground">
                  {' '}({ecMeta.ecMsCmRange.low.toFixed(2)}–{ecMeta.ecMsCmRange.high.toFixed(2)})
                </span>
              )}
            </p>
          )}
          {result.best.warnings.length > 0 && (
            <ul className="text-sm text-amber-700 dark:text-amber-400 list-disc pl-5">
              {result.best.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">{t('nutrient.dose')}</th>
                <th className="text-right py-1">{t('nutrient.perL')}</th>
                <th className="text-right py-1">{t('nutrient.perTank')}</th>
              </tr>
            </thead>
            <tbody>
              {result.best.doses.filter((d) => d.amountPerL > 0).map((d) => (
                <tr key={d.fertilizerId} className="border-b border-border/50">
                  <td className="py-1">{d.fertilizerName}</td>
                  <td className="text-right py-1">{d.amountPerL.toFixed(3)} {d.unit}</td>
                  <td className="text-right py-1">{(d.amountPerL * volumeL).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">{t('nutrient.element')}</th>
                <th className="text-right py-1">{t('nutrient.target')}</th>
                <th className="text-right py-1">{t('nutrient.achieved')}</th>
                <th className="text-right py-1">Δ%</th>
              </tr>
            </thead>
            <tbody>
              {deviations.filter((d) => MACRO_KEYS.includes(d.element as typeof MACRO_KEYS[number])).map((d) => (
                <tr key={d.element} className="border-b border-border/50">
                  <td className="py-1">{d.element}</td>
                  <td className="text-right py-1">{d.targetPpm.toFixed(1)}</td>
                  <td className="text-right py-1">{d.achievedPpm.toFixed(1)}</td>
                  <td className="text-right py-1">{d.deltaPct.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {userId && (
            <div className="flex flex-wrap gap-2 items-end border-t pt-4">
              <input
                className="rounded-md border px-2 py-1 text-sm"
                placeholder={t('nutrient.recipeName')}
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
              <Button type="button" onClick={onSave}>{t('nutrient.saveRecipe')}</Button>
              {saveStatus && <span className="text-sm text-muted-foreground">{saveStatus}</span>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
