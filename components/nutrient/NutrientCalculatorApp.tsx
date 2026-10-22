'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SOLVER_VERSION,
  mapDbProductsToFertilizerSpecs,
  mapDbProfileToTarget,
  solveForward,
  type DbCompositionLineRow,
  type DbFertilizerProductRow,
  type SolveForwardResult,
} from '@growlog/nutrient-calc';
import {
  listFarmNutrientRecipes,
  listFarmWaterProfiles,
  listNutrientFavorites,
  logFeedingFromNutrientRecipe,
  saveNutrientRecipeWithMeta,
  toggleNutrientFavorite,
  type NutrientSolutionKind,
} from '@growlog/domain';
import { NutrientResultPanel } from '@/components/nutrient/NutrientResultPanel';
import { SourceBadge } from '@/components/nutrient/SourceBadge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/providers/I18nProvider';
import { useFarmContext } from '@/components/providers/FarmProvider';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import { defaultHoaglandSaltProductIds } from '@/lib/nutrient/default-fertilizers';
import { profileDisplayName } from '@/lib/nutrient/profile-label';

export type NutrientTabId = 'solutions' | 'fertilizers' | 'systems' | 'water' | 'elements' | 'wand';

const TAB_ORDER: NutrientTabId[] = ['solutions', 'fertilizers', 'systems', 'water', 'elements', 'wand'];

export function NutrientCalculatorApp({ catalog }: { catalog: CatalogBundle }) {
  const { t } = useTranslation();
  const { supabase, userId, farmId, cycle, scopeId } = useFarmContext();
  const [tab, setTab] = useState<NutrientTabId>('wand');

  const allProfiles = catalog.target_profiles;
  const [profileSlug, setProfileSlug] = useState(
    () => allProfiles.find((p) => p.slug === 'hoagland-standard')?.slug ?? allProfiles[0]?.slug ?? '',
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() => defaultHoaglandSaltProductIds(catalog));
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [volumeL, setVolumeL] = useState(100);
  const [model, setModel] = useState<'canonical' | 'hydroodo_legacy'>('canonical');
  const [tankMode, setTankMode] = useState<'single' | 'ab'>('ab');
  const [stockFactor, setStockFactor] = useState(100);
  const [waterProfileId, setWaterProfileId] = useState<string>('');
  const [waterProfiles, setWaterProfiles] = useState<
    Array<{ id: string; name: string; water_ppm: Record<string, number>; alkalinity_hco3_ppm: number | null }>
  >([]);
  const [savedRecipes, setSavedRecipes] = useState<Array<Record<string, unknown>>>([]);
  const [saveName, setSaveName] = useState('');
  const [saveKind, setSaveKind] = useState<NutrientSolutionKind>('recipe');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const [waterNa, setWaterNa] = useState(0);
  const [waterCl, setWaterCl] = useState(0);
  const [waterAlkalinity, setWaterAlkalinity] = useState(0);
  const [alkAsCaco3, setAlkAsCaco3] = useState(true);

  const reloadFarmData = useCallback(async () => {
    if (!farmId || !userId) return;
    const [waters, recipes, favs] = await Promise.all([
      listFarmWaterProfiles(supabase, farmId),
      listFarmNutrientRecipes(supabase, farmId),
      listNutrientFavorites(supabase, farmId, userId),
    ]);
    setWaterProfiles(waters);
    setSavedRecipes(recipes);
    const favSet = new Set<string>();
    for (const f of favs) {
      if (f.catalog_product_id) favSet.add(f.catalog_product_id);
      if (f.farm_product_id) favSet.add(`farm:${f.farm_product_id}`);
    }
    setFavoriteIds(favSet);
  }, [farmId, userId, supabase]);

  useEffect(() => {
    reloadFarmData().catch(() => undefined);
  }, [reloadFarmData]);

  useEffect(() => {
    const wp = waterProfiles.find((w) => w.id === waterProfileId);
    if (!wp) return;
    setWaterNa(Number(wp.water_ppm.Na ?? 0));
    setWaterCl(Number(wp.water_ppm.Cl ?? 0));
    setWaterAlkalinity(Number(wp.alkalinity_hco3_ppm ?? 0));
  }, [waterProfileId, waterProfiles]);

  const filteredFertilizers = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = catalog.fertilizers;
    if (q) {
      list = list.filter(
        (p) =>
          p.brand.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.external_key.toLowerCase().includes(q),
      );
    }
    if (favoritesOnly) {
      list = list.filter((p) => favoriteIds.has(p.id));
    }
    return list;
  }, [catalog.fertilizers, search, favoritesOnly, favoriteIds]);

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

  const result: SolveForwardResult | null = useMemo(() => {
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
          maxAlternatives: 5,
          fastSolver: false,
        },
      });
    } catch {
      return null;
    }
  }, [fertilizers, profile, target, overdose, waterNa, waterCl, waterAlkalinity, alkAsCaco3, model, volumeL, tankMode, stockFactor]);

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onToggleFavorite = async (productId: string) => {
    if (!farmId || !userId) return;
    const favorited = !favoriteIds.has(productId);
    await toggleNutrientFavorite(supabase, {
      farmId,
      userId,
      productScope: 'catalog',
      catalogProductId: productId,
      favorited,
    });
    await reloadFarmData();
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
        inputs: { profileSlug, model, tankMode, selectedIds, waterProfileId },
        result,
        solverVersion: SOLVER_VERSION,
      });
      setSaveStatus(t('common.saved'));
      await reloadFarmData();
      return id;
    } catch {
      setSaveStatus(t('common.error'));
      return undefined;
    }
  };

  const onLogFeeding = async () => {
    if (!farmId || !cycle?.id || !scopeId || !saveName.trim()) return;
    const recipeId = await onSave();
    if (!recipeId) return;
    await logFeedingFromNutrientRecipe(supabase, {
      farmId,
      cycleId: cycle.id,
      scopeId,
      recipeId,
      recipeName: saveName.trim(),
      volumeL,
      userId,
    });
    setSaveStatus(t('nutrient.timeline.logged'));
    await reloadFarmData();
  };

  const tabLabels: Record<NutrientTabId, string> = {
    solutions: t('nutrient.tabs.solutions'),
    fertilizers: t('nutrient.tabs.fertilizers'),
    systems: t('nutrient.tabs.systems'),
    water: t('nutrient.tabs.water'),
    elements: t('nutrient.tabs.elements'),
    wand: t('nutrient.tabs.wand'),
  };

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 border-b border-border">
        {TAB_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 px-3 py-2 text-sm font-medium rounded-t-md ${
              tab === id ? 'bg-muted border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            {tabLabels[id]}
          </button>
        ))}
      </nav>

      {tab === 'solutions' && (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('nutrient.solutions.hint')}</p>
          <ul className="text-sm space-y-2">
            {savedRecipes.map((r) => (
              <li key={String(r.id)} className="border rounded-md p-3 flex justify-between gap-2">
                <span>
                  <strong>{String(r.name ?? r.id)}</strong>
                  <span className="text-muted-foreground ml-2">{String(r.solution_kind ?? 'recipe')}</span>
                </span>
                {r.parent_recipe_id != null && r.parent_recipe_id !== '' ? (
                  <span className="text-xs text-muted-foreground">{t('nutrient.solutions.repeat')}</span>
                ) : null}
              </li>
            ))}
            {!savedRecipes.length && <li className="text-muted-foreground">{t('nutrient.solutions.empty')}</li>}
          </ul>
        </section>
      )}

      {tab === 'fertilizers' && (
        <section>
          <div className="flex flex-wrap gap-2 mb-2">
            <input
              type="search"
              className="flex-1 min-w-[12rem] rounded-md border px-3 py-2 text-sm"
              placeholder={t('nutrient.searchFertilizers')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
              {t('nutrient.favorites.only')}
            </label>
          </div>
          <div className="max-h-80 overflow-y-auto border rounded-md p-2 space-y-1 text-sm">
            {filteredFertilizers.map((p) => (
              <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                <button
                  type="button"
                  className={`text-lg leading-none ${favoriteIds.has(p.id) ? 'text-amber-500' : 'text-muted-foreground'}`}
                  onClick={() => onToggleFavorite(p.id)}
                  aria-label={t('nutrient.favorites.toggle')}
                >
                  ★
                </button>
                <span className="flex-1">{p.brand} — {p.name}</span>
                <SourceBadge metadata={p.metadata} compact />
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{t('nutrient.picker.selected', { n: String(selectedIds.length) })}</p>
        </section>
      )}

      {tab === 'systems' && (
        <section className="space-y-3">
          <label className="text-sm font-medium block">{t('nutrient.targetProfile')}</label>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={profileSlug}
            onChange={(e) => setProfileSlug(e.target.value)}
          >
            {allProfiles.map((p) => (
              <option key={p.slug} value={p.slug}>
                {profileDisplayName(p.slug, p.name, t)}
              </option>
            ))}
          </select>
          {catalog.feed_schedules && catalog.feed_schedules.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-1">{t('nutrient.systems.schedules')}</h3>
              <ul className="text-sm max-h-48 overflow-y-auto border rounded-md divide-y">
                {catalog.feed_schedules.map((s) => (
                  <li key={s.slug} className="px-3 py-2">{s.manufacturer ? `${s.manufacturer} — ` : ''}{s.name}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {tab === 'water' && (
        <section className="space-y-3 text-sm">
          <label className="font-medium">{t('nutrient.water.profile')}</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={waterProfileId}
            onChange={(e) => setWaterProfileId(e.target.value)}
          >
            <option value="">{t('nutrient.water.manual')}</option>
            {waterProfiles.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <div className="grid gap-2 sm:grid-cols-3">
            <label>{t('nutrient.waterNa')}
              <input type="number" className="w-full border rounded px-2 py-1" value={waterNa} onChange={(e) => setWaterNa(Number(e.target.value))} />
            </label>
            <label>{t('nutrient.waterCl')}
              <input type="number" className="w-full border rounded px-2 py-1" value={waterCl} onChange={(e) => setWaterCl(Number(e.target.value))} />
            </label>
            <label>{t('nutrient.waterAlkalinity')}
              <input type="number" className="w-full border rounded px-2 py-1" value={waterAlkalinity} onChange={(e) => setWaterAlkalinity(Number(e.target.value))} />
            </label>
            <label className="flex items-center gap-2 sm:col-span-3">
              <input type="checkbox" checked={alkAsCaco3} onChange={(e) => setAlkAsCaco3(e.target.checked)} />
              {t('nutrient.alkalinityAsCaco3')}
            </label>
          </div>
        </section>
      )}

      {tab === 'elements' && (
        <section className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">{t('nutrient.element')}</th>
                <th className="text-right py-1">{t('nutrient.elements.mass')}</th>
                <th className="text-right py-1">{t('nutrient.elements.valence')}</th>
              </tr>
            </thead>
            <tbody>
              {(catalog.elements ?? []).map((el) => (
                <tr key={el.symbol} className="border-b border-border/50">
                  <td className="py-1">{el.display_name ?? el.symbol}</td>
                  <td className="text-right py-1">{el.atomic_mass ?? '—'}</td>
                  <td className="text-right py-1">{el.valence ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {catalog.oxide_factors && catalog.oxide_factors.length > 0 && (
            <>
              <h3 className="text-sm font-medium mt-4 mb-2">{t('nutrient.elements.salts')}</h3>
              <div className="overflow-x-auto max-h-64">
                <table className="min-w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1">{t('nutrient.elements.form')}</th>
                      <th className="text-left py-1">→</th>
                      <th className="text-right py-1">{t('nutrient.element')}</th>
                      <th className="text-right py-1">{t('nutrient.elements.factor')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.oxide_factors.map((ox, i) => (
                      <tr key={`${ox.form_key}-${i}`} className="border-b border-border/40">
                        <td className="py-1">{ox.form_key}</td>
                        <td className="py-1">→</td>
                        <td className="text-right py-1">{ox.element_symbol}</td>
                        <td className="text-right py-1">{Number(ox.factor).toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'wand' && (
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
          {result && profile && (
            <NutrientResultPanel
              catalog={catalog}
              result={result}
              target={target}
              model={model}
              volumeL={volumeL}
              tankMode={tankMode}
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
              <select className="rounded-md border px-2 py-1 text-sm" value={saveKind} onChange={(e) => setSaveKind(e.target.value as NutrientSolutionKind)}>
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
      )}
    </div>
  );
}
