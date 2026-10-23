'use client';

import { saveFarmFertilizerProduct, toggleNutrientFavorite } from '@growlog/domain';
import { useMemo, useState } from 'react';
import { SourceBadge } from '@/components/nutrient/SourceBadge';
import { useNutrientWorkspace } from '@/components/nutrient/workspace/NutrientWorkspaceContext';
import { useTranslation } from '@/components/providers/I18nProvider';
import { productDisplayName } from '@/lib/nutrient/product-display-names';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { productMatchesSearch } from '@/lib/nutrient/product-search';
import type { UnifiedProduct } from '@/lib/nutrient/unified-products';

function productLabel(p: UnifiedProduct, locale: 'en' | 'ru') {
  const name = productDisplayName(p.external_key, p.name, locale, {
    preserveFallback: p.scope === 'farm',
  });
  return `${p.brand} — ${name}`;
}

function scopeLabel(scope: UnifiedProduct['scope'], t: (k: string) => string) {
  if (scope === 'farm') return t('nutrient.productFilters.farm');
  return t('nutrient.productFilters.catalog');
}

export function FertilizersTab() {
  const { t } = useTranslation();
  const {
    locale,
    supabase,
    farmId,
    userId,
    unifiedProducts,
    selectedIds,
    toggleProduct,
    favoriteIds,
    reloadFarmData,
    search,
    setSearch,
    favoritesOnly,
    setFavoritesOnly,
    brandFilter,
    setBrandFilter,
    formFilter,
    setFormFilter,
    sourceFilter,
    setSourceFilter,
  } = useNutrientWorkspace();

  const brands = useMemo(() => {
    const set = new Set(unifiedProducts.map((p) => p.brand));
    return [...set].sort();
  }, [unifiedProducts]);

  const filtered = useMemo(() => {
    const q = search.trim();
    let list = unifiedProducts;
    if (q) {
      list = list.filter((p) => productMatchesSearch(p, q, locale));
    }
    if (favoritesOnly) list = list.filter((p) => favoriteIds.has(p.id));
    if (brandFilter) {
      const b = brandFilter.toLowerCase();
      list = list.filter((p) => p.brand.toLowerCase() === b);
    }
    if (formFilter) list = list.filter((p) => p.physical_form === formFilter);
    if (sourceFilter) list = list.filter((p) => p.scope === sourceFilter);
    return list;
  }, [unifiedProducts, search, favoritesOnly, favoriteIds, brandFilter, formFilter, sourceFilter, locale]);

  const [editingFarmId, setEditingFarmId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    externalKey: '',
    brand: '',
    name: '',
    physicalForm: 'solid' as 'solid' | 'liquid',
    doseUnit: 'g_per_L' as 'g_per_L' | 'ml_per_L',
    densityGPerMl: '' as string,
    labelBasis: '' as '' | 'w_w' | 'w_v',
    nTotalIncludesForms: false,
    lines: [{ form_key: 'K', value_pct: 0, n_form: '' as string }],
  });

  const onToggleFavorite = async (p: UnifiedProduct) => {
    if (!farmId || !userId) return;
    const favorited = !favoriteIds.has(p.id);
    if (p.scope === 'catalog') {
      await toggleNutrientFavorite(supabase, {
        farmId,
        userId,
        productScope: 'catalog',
        catalogProductId: p.id,
        favorited,
      });
    } else {
      const farmProductId = p.id.replace(/^farm:/, '');
      await toggleNutrientFavorite(supabase, {
        farmId,
        userId,
        productScope: 'farm',
        farmProductId,
        favorited,
      });
    }
    await reloadFarmData();
  };

  const startNewFarmProduct = () => {
    setEditingFarmId('new');
    setDraft({
      externalKey: `farm:${Date.now()}`,
      brand: 'Farm',
      name: '',
      physicalForm: 'solid',
      doseUnit: 'g_per_L',
      densityGPerMl: '',
      labelBasis: '',
      nTotalIncludesForms: false,
      lines: [{ form_key: 'K', value_pct: 0, n_form: '' }],
    });
  };

  const startEditFarm = (p: UnifiedProduct) => {
    setEditingFarmId(p.id);
    const meta = p.metadata ?? {};
    setDraft({
      externalKey: p.external_key,
      brand: p.brand,
      name: p.name,
      physicalForm: p.physical_form,
      doseUnit: p.dose_unit,
      densityGPerMl: p.density_g_per_ml != null ? String(p.density_g_per_ml) : '',
      labelBasis: (p.label_basis ?? '') as '' | 'w_w' | 'w_v',
      nTotalIncludesForms: Boolean(meta.n_total_includes_forms),
      lines: p.lines.length
        ? p.lines.map((l) => ({ ...l, n_form: l.n_form ?? '' }))
        : [{ form_key: 'K', value_pct: 0, n_form: '' }],
    });
  };

  const saveFarmProduct = async () => {
    if (!farmId) return;
    const id = editingFarmId === 'new' ? undefined : editingFarmId?.replace(/^farm:/, '');
    await saveFarmFertilizerProduct(supabase, {
      farmId,
      userId,
      id,
      externalKey: draft.externalKey,
      brand: draft.brand,
      name: draft.name,
      physicalForm: draft.physicalForm,
      doseUnit: draft.doseUnit,
      densityGPerMl: draft.densityGPerMl ? Number(draft.densityGPerMl) : null,
      labelBasis: draft.labelBasis || null,
      nTotalIncludesForms: draft.nTotalIncludesForms,
      lines: draft.lines
        .filter((l) => l.form_key.trim() && l.value_pct > 0)
        .map((l) => ({
          form_key: l.form_key.trim(),
          value_pct: l.value_pct,
          n_form: l.n_form || null,
        })),
    });
    setEditingFarmId(null);
    setSearch('');
    setBrandFilter('');
    setFormFilter('');
    setSourceFilter('farm');
    await reloadFarmData();
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3">
        <Input
          type="search"
          className="min-h-11"
          placeholder={t('nutrient.searchFertilizers')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <Switch checked={favoritesOnly} onCheckedChange={setFavoritesOnly} />
          {t('nutrient.favorites.only')}
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
          <NativeSelect value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            <option value="">{t('nutrient.productFilters.allBrands')}</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </NativeSelect>
          <NativeSelect
            value={formFilter}
            onChange={(e) => setFormFilter(e.target.value as '' | 'solid' | 'liquid')}
          >
            <option value="">{t('nutrient.productFilters.allForms')}</option>
            <option value="solid">{t('nutrient.productFilters.solid')}</option>
            <option value="liquid">{t('nutrient.productFilters.liquid')}</option>
          </NativeSelect>
          <NativeSelect
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as '' | 'catalog' | 'farm')}
          >
            <option value="">{t('nutrient.productFilters.allSources')}</option>
            <option value="catalog">{t('nutrient.productFilters.catalog')}</option>
            <option value="farm">{t('nutrient.productFilters.farm')}</option>
          </NativeSelect>
        </div>
        {farmId && (
          <Button type="button" className="min-h-11 rounded-xl" onClick={startNewFarmProduct}>
            {t('nutrient.productFilters.newFarm')}
          </Button>
        )}
      </div>

      {editingFarmId && (
        <div className="border rounded-md p-3 space-y-2 text-sm">
          <h3 className="font-medium">{t('nutrient.productFilters.editComposition')}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="border rounded px-2 py-1" placeholder={t('nutrient.productFilters.brand')} value={draft.brand} onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))} />
            <input className="border rounded px-2 py-1" placeholder={t('nutrient.recipeName')} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            <select className="border rounded px-2 py-1" value={draft.physicalForm} onChange={(e) => setDraft((d) => ({ ...d, physicalForm: e.target.value as 'solid' | 'liquid' }))}>
              <option value="solid">{t('nutrient.productFilters.solid')}</option>
              <option value="liquid">{t('nutrient.productFilters.liquid')}</option>
            </select>
            <select className="border rounded px-2 py-1" value={draft.doseUnit} onChange={(e) => setDraft((d) => ({ ...d, doseUnit: e.target.value as 'g_per_L' | 'ml_per_L' }))}>
              <option value="g_per_L">g/L</option>
              <option value="ml_per_L">mL/L</option>
            </select>
            <input className="border rounded px-2 py-1" placeholder={t('nutrient.productFilters.density')} value={draft.densityGPerMl} onChange={(e) => setDraft((d) => ({ ...d, densityGPerMl: e.target.value }))} />
            <select className="border rounded px-2 py-1" value={draft.labelBasis} onChange={(e) => setDraft((d) => ({ ...d, labelBasis: e.target.value as '' | 'w_w' | 'w_v' }))}>
              <option value="">{t('nutrient.productFilters.labelBasis')}</option>
              <option value="w_w">w/w</option>
              <option value="w_v">w/v</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={draft.nTotalIncludesForms} onChange={(e) => setDraft((d) => ({ ...d, nTotalIncludesForms: e.target.checked }))} />
            {t('nutrient.productFilters.nTotalIncludesForms')}
          </label>
          {draft.lines.map((line, idx) => (
            <div key={idx} className="flex flex-wrap gap-2">
              <input className="border rounded px-2 py-1 w-24" placeholder={t('nutrient.productFilters.formKey')} value={line.form_key} onChange={(e) => {
                const lines = [...draft.lines];
                lines[idx] = { ...lines[idx], form_key: e.target.value };
                setDraft((d) => ({ ...d, lines }));
              }} />
              <input type="number" className="border rounded px-2 py-1 w-28" placeholder={t('nutrient.productFilters.valuePct')} value={line.value_pct} onChange={(e) => {
                const lines = [...draft.lines];
                lines[idx] = { ...lines[idx], value_pct: Number(e.target.value) };
                setDraft((d) => ({ ...d, lines }));
              }} />
              <select className="border rounded px-2 py-1 text-xs" value={line.n_form ?? ''} onChange={(e) => {
                const lines = [...draft.lines];
                lines[idx] = { ...lines[idx], n_form: e.target.value };
                setDraft((d) => ({ ...d, lines }));
              }}>
                <option value="">{t('nutrient.productFilters.nForm')}</option>
                <option value="nitrate">{t('nutrient.productFilters.nFormNitrate')}</option>
                <option value="ammonium">{t('nutrient.productFilters.nFormAmmonium')}</option>
                <option value="urea">{t('nutrient.productFilters.nFormUrea')}</option>
                <option value="total">{t('nutrient.productFilters.nFormTotal')}</option>
              </select>
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => setDraft((d) => ({ ...d, lines: [...d.lines, { form_key: 'P', value_pct: 0, n_form: '' }] }))}>{t('common.add')}</Button>
            <Button type="button" size="sm" onClick={() => saveFarmProduct()}>{t('common.save')}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingFarmId(null)}>{t('common.cancel')}</Button>
          </div>
        </div>
      )}

      <div className="max-h-[min(24rem,50vh)] overflow-y-auto space-y-2 text-sm">
        {filtered.map((p) => {
          const selected = selectedIds.includes(p.id);
          return (
            <div
              key={p.id}
              className={cn(
                'flex min-h-11 items-stretch gap-1 rounded-xl border bg-card p-1 shadow-sm',
                selected && 'border-primary/40 bg-primary/[0.04]',
              )}
            >
              <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 px-2 py-1.5">
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 rounded border-input accent-primary"
                  checked={selected}
                  onChange={() => toggleProduct(p.id)}
                />
                <span className="min-w-0 flex-1 leading-snug">{productLabel(p, locale)}</span>
              </label>
              <div className="flex shrink-0 items-center gap-0.5 pr-1">
                <span className="hidden text-[10px] text-muted-foreground sm:inline px-1">
                  {scopeLabel(p.scope, t)}
                </span>
                {p.metadata && <SourceBadge metadata={p.metadata} compact />}
                <button
                  type="button"
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-lg text-lg leading-none transition-colors',
                    favoriteIds.has(p.id) ? 'text-amber-500' : 'text-muted-foreground hover:bg-muted',
                  )}
                  onClick={() => onToggleFavorite(p)}
                  aria-label={t('nutrient.favorites.toggle')}
                >
                  ★
                </button>
                {p.scope === 'farm' && (
                  <button
                    type="button"
                    className="flex h-11 min-w-11 items-center justify-center rounded-lg px-2 text-xs font-medium text-primary hover:bg-muted"
                    onClick={() => startEditFarm(p)}
                  >
                    {t('nutrient.productFilters.edit')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t('nutrient.picker.selected', { n: String(selectedIds.length) })}</p>
    </section>
  );
}
