'use client';

import { saveFarmFertilizerProduct, toggleNutrientFavorite } from '@growlog/domain';
import { useMemo, useState } from 'react';
import { SourceBadge } from '@/components/nutrient/SourceBadge';
import { useNutrientWorkspace } from '@/components/nutrient/workspace/NutrientWorkspaceContext';
import { useTranslation } from '@/components/providers/I18nProvider';
import { productDisplayName } from '@/lib/nutrient/product-display-names';
import { Button } from '@/components/ui/button';
import type { UnifiedProduct } from '@/lib/nutrient/unified-products';

function productLabel(p: UnifiedProduct, locale: 'en' | 'ru') {
  return `${p.brand} — ${productDisplayName(p.external_key, p.name, locale)}`;
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
    const q = search.trim().toLowerCase();
    let list = unifiedProducts;
    if (q) {
      list = list.filter(
        (p) =>
          p.brand.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.external_key.toLowerCase().includes(q),
      );
    }
    if (favoritesOnly) list = list.filter((p) => favoriteIds.has(p.id));
    if (brandFilter) list = list.filter((p) => p.brand === brandFilter);
    if (formFilter) list = list.filter((p) => p.physical_form === formFilter);
    if (sourceFilter) list = list.filter((p) => p.scope === sourceFilter);
    return list;
  }, [unifiedProducts, search, favoritesOnly, favoriteIds, brandFilter, formFilter, sourceFilter]);

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
      <div className="flex flex-wrap gap-2">
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
        <select className="rounded-md border px-2 py-1 text-sm" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
          <option value="">{t('nutrient.productFilters.allBrands')}</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select
          className="rounded-md border px-2 py-1 text-sm"
          value={formFilter}
          onChange={(e) => setFormFilter(e.target.value as '' | 'solid' | 'liquid')}
        >
          <option value="">{t('nutrient.productFilters.allForms')}</option>
          <option value="solid">{t('nutrient.productFilters.solid')}</option>
          <option value="liquid">{t('nutrient.productFilters.liquid')}</option>
        </select>
        <select
          className="rounded-md border px-2 py-1 text-sm"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as '' | 'catalog' | 'farm')}
        >
          <option value="">{t('nutrient.productFilters.allSources')}</option>
          <option value="catalog">{t('nutrient.productFilters.catalog')}</option>
          <option value="farm">{t('nutrient.productFilters.farm')}</option>
        </select>
        {farmId && (
          <Button type="button" size="sm" onClick={startNewFarmProduct}>{t('nutrient.productFilters.newFarm')}</Button>
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

      <div className="max-h-80 overflow-y-auto border rounded-md p-2 space-y-1 text-sm">
        {filtered.map((p) => (
          <label key={p.id} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
            <button
              type="button"
              className={`text-lg leading-none ${favoriteIds.has(p.id) ? 'text-amber-500' : 'text-muted-foreground'}`}
              onClick={() => onToggleFavorite(p)}
              aria-label={t('nutrient.favorites.toggle')}
            >
              ★
            </button>
            <span className="flex-1">{productLabel(p, locale)}</span>
            <span className="text-xs text-muted-foreground">{p.scope}</span>
            {p.scope === 'farm' && (
              <button type="button" className="text-xs underline" onClick={() => startEditFarm(p)}>
                {t('nutrient.productFilters.edit')}
              </button>
            )}
            {p.metadata && <SourceBadge metadata={p.metadata} compact />}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t('nutrient.picker.selected', { n: String(selectedIds.length) })}</p>
    </section>
  );
}
