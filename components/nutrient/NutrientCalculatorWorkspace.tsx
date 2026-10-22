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
  type ElementKey,
} from '@growlog/nutrient-calc';
import { SourceBadge } from '@/components/nutrient/SourceBadge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/providers/I18nProvider';
import { useFarmContext } from '@/components/providers/FarmProvider';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import { defaultHoaglandSaltProductIds } from '@/lib/nutrient/default-fertilizers';
import { formatDoseUnit, formatTankLabel } from '@/lib/nutrient/format-dose';
import { profileDisplayName } from '@/lib/nutrient/profile-label';
import { saveNutrientRecipe } from '@/lib/nutrient/save-farm-recipe';

const MACRO_KEYS: ElementKey[] = ['N_NO3', 'N_NH4', 'P', 'K', 'Ca', 'Mg', 'S'];

type StockDoseRow = {
  fertilizerId: string;
  fertilizerName: string;
  amountPerL: number;
  unit: 'g_per_L' | 'ml_per_L';
  tank: string;
  amountTotal?: number;
  stockAmountPerL?: number;
};

export function NutrientCalculatorWorkspace({ catalog }: { catalog: CatalogBundle }) {
  const { t } = useTranslation();
  const { supabase, userId, farmId } = useFarmContext();
  const allProfiles = catalog.target_profiles;

  const [profileSlug, setProfileSlug] = useState(
    () => allProfiles.find((p) => p.slug === 'hoagland-standard')?.slug ?? allProfiles[0]?.slug ?? '',
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() => defaultHoaglandSaltProductIds(catalog));
  const [search, setSearch] = useState('');
  const [volumeL, setVolumeL] = useState(100);
  const [model, setModel] = useState<'canonical' | 'hydroodo_legacy'>('hydroodo_legacy');
  const [tankMode, setTankMode] = useState<'single' | 'ab'>('ab');
  const [maxEc, setMaxEc] = useState('');
  const [maxAmmoniumShare, setMaxAmmoniumShare] = useState('');
  const [stockFactor, setStockFactor] = useState(100);
  const [waterNa, setWaterNa] = useState(0);
  const [waterCl, setWaterCl] = useState(0);
  const [waterAlkalinity, setWaterAlkalinity] = useState(0);
  const [alkAsCaco3, setAlkAsCaco3] = useState(true);
  const [saveName, setSaveName] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const filteredFertilizers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog.fertilizers;
    return catalog.fertilizers.filter(
      (p) =>
        p.brand.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.external_key.toLowerCase().includes(q),
    );
  }, [catalog.fertilizers, search]);

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
          alkalinityHco3Ppm: waterAlkalinity,
          alkalinityAsCaco3Equivalent: alkAsCaco3,
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
    waterAlkalinity,
    alkAsCaco3,
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
    return computeDeviations(MACRO_KEYS, target, result.best.achievedPpm as Record<string, number>);
  }, [result, profile, target]);

  const doseRows: StockDoseRow[] = useMemo(() => {
    if (!result) return [];
    return result.best.doses as StockDoseRow[];
  }, [result]);

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
        inputs: { profileSlug, model, tankMode, waterNa, waterCl, waterAlkalinity, alkAsCaco3 },
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
              <option key={p.slug} value={p.slug}>
                {profileDisplayName(p.slug, p.name, t)}
              </option>
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
        <label className="flex flex-col gap-1">
          {t('nutrient.waterAlkalinity')}
          <input type="number" className="rounded-md border px-2 py-1" value={waterAlkalinity} onChange={(e) => setWaterAlkalinity(Number(e.target.value))} />
        </label>
        <label className="flex flex-col gap-1 justify-end">
          <span className="flex items-center gap-2">
            <input type="checkbox" checked={alkAsCaco3} onChange={(e) => setAlkAsCaco3(e.target.checked)} />
            {t('nutrient.alkalinityAsCaco3')}
          </span>
        </label>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">{t('nutrient.fertilizers')}</h2>
        <input
          type="search"
          className="w-full mb-2 rounded-md border border-input px-3 py-2 text-sm"
          placeholder={t('nutrient.searchFertilizers')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-1 text-sm">
          {filteredFertilizers.map((p) => (
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
                {tankMode === 'ab' && <th className="text-right py-1">{t('nutrient.stockPerL')}</th>}
              </tr>
            </thead>
            <tbody>
              {doseRows.filter((d) => d.amountPerL > 0).map((d) => {
                const tankLabel = formatTankLabel(d.tank);
                const unit = formatDoseUnit(d.unit);
                const total = d.amountTotal ?? d.amountPerL * volumeL;
                return (
                  <tr key={`${d.fertilizerId}-${d.tank}`} className="border-b border-border/50">
                    <td className="py-1">
                      {d.fertilizerName}
                      {tankMode === 'ab' && tankLabel && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {t('nutrient.tank')} {tankLabel}
                        </span>
                      )}
                    </td>
                    <td className="text-right py-1">{d.amountPerL.toFixed(3)} {unit}</td>
                    <td className="text-right py-1">{total.toFixed(2)} {unit.replace('/L', '')}</td>
                    {tankMode === 'ab' && (
                      <td className="text-right py-1">
                        {d.stockAmountPerL != null
                          ? `${d.stockAmountPerL.toFixed(2)} g/L ${t('nutrient.stock')}`
                          : '—'}
                      </td>
                    )}
                  </tr>
                );
              })}
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
              {deviations.map((d) => (
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
