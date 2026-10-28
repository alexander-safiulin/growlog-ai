'use client';

import { createGuestId, saveFarmFertilizerProduct, toggleNutrientFavorite } from '@growlog/domain';
import { toggleGuestFavorite, upsertGuestFertilizer } from '@/lib/nutrient/guest/guest-workspace-actions';
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
    isCloudSynced,
    updateGuestStore,
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
    const favorited = !favoriteIds.has(p.id);
    if (!isCloudSynced) {
      updateGuestStore((store) => toggleGuestFavorite(store, p.id));
      return;
    }
    if (!farmId || !userId) return;
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
    const guestId =
      editingFarmId === 'new' ? undefined : editingFarmId?.replace(/^farm:/, '');
    if (!isCloudSynced) {
      const id = guestId ?? createGuestId();
      updateGuestStore((store) =>
        upsertGuestFertilizer(store, {
          id,
          external_key: draft.externalKey,
          brand: draft.brand,
          name: draft.name,
          physical_form: draft.physicalForm,
          dose_unit: draft.doseUnit,
          density_g_per_ml: draft.densityGPerMl ? Number(draft.densityGPerMl) : null,
          label_basis: draft.labelBasis || null,
          metadata: { n_total_includes_forms: draft.nTotalIncludesForms },
          lines: draft.lines
            .filter((l) => l.form_key.trim() && l.value_pct > 0)
            .map((l) => ({
              form_key: l.form_key.trim(),
              value_pct: l.value_pct,
              n_form: l.n_form || null,
            })),
        }),
      );
      setEditingFarmId(null);
      setSearch('');
      setBrandFilter('');
      setFormFilter('');
      setSourceFilter('farm');
      return;
    }
    if (!farmId) return;
    const id = guestId;
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
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <Switch className="scale-110" checked={favoritesOnly} onCheckedChange={setFavoritesOnly} />
          <span className="py-2">{t('nutrient.favorites.only')}</span>
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
        <Button type="button" className="min-h-11 rounded-xl" onClick={startNewFarmProduct}>
          {isCloudSynced ? t('nutrient.productFilters.newFarm') : t('nutrient.productFilters.newCustom')}
        </Button>
      </div>

      {editingFarmId && (
        <div className="space-y-3 rounded-xl border bg-card p-3 text-sm shadow-sm">
          <h3 className="font-medium">{t('nutrient.productFilters.editComposition')}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input className="min-h-11 rounded-xl" placeholder={t('nutrient.productFilters.brand')} value={draft.brand} onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))} />
            <Input className="min-h-11 rounded-xl" placeholder={t('nutrient.recipeName')} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            <NativeSelect value={draft.physicalForm} onChange={(e) => setDraft((d) => ({ ...d, physicalForm: e.target.value as 'solid' | 'liquid' }))}>
              <option value="solid">{t('nutrient.productFilters.solid')}</option>
              <option value="liquid">{t('nutrient.productFilters.liquid')}</option>
            </NativeSelect>
            <NativeSelect value={draft.doseUnit} onChange={(e) => setDraft((d) => ({ ...d, doseUnit: e.target.value as 'g_per_L' | 'ml_per_L' }))}>
              <option value="g_per_L">g/L</option>
              <option value="ml_per_L">mL/L</option>
            </NativeSelect>
            <Input className="min-h-11 rounded-xl" placeholder={t('nutrient.productFilters.density')} value={draft.densityGPerMl} onChange={(e) => setDraft((d) => ({ ...d, densityGPerMl: e.target.value }))} />
            <NativeSelect value={draft.labelBasis} onChange={(e) => setDraft((d) => ({ ...d, labelBasis: e.target.value as '' | 'w_w' | 'w_v' }))}>
              <option value="">{t('nutrient.productFilters.labelBasis')}</option>
              <option value="w_w">w/w</option>
              <option value="w_v">w/v</option>
            </NativeSelect>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-input accent-primary"
              checked={draft.nTotalIncludesForms}
              onChange={(e) => setDraft((d) => ({ ...d, nTotalIncludesForms: e.target.checked }))}
            />
            <span>{t('nutrient.productFilters.nTotalIncludesForms')}</span>
          </label>
          {draft.lines.map((line, idx) => (
            <div key={idx} className="flex flex-wrap gap-2">
              <Input className="min-h-11 w-28 rounded-xl" placeholder={t('nutrient.productFilters.formKey')} value={line.form_key} onChange={(e) => {
                const lines = [...draft.lines];
                lines[idx] = { ...lines[idx], form_key: e.target.value };
                setDraft((d) => ({ ...d, lines }));
              }} />
              <Input type="number" className="min-h-11 w-32 rounded-xl" placeholder={t('nutrient.productFilters.valuePct')} value={line.value_pct} onChange={(e) => {
                const lines = [...draft.lines];
                lines[idx] = { ...lines[idx], value_pct: Number(e.target.value) };
                setDraft((d) => ({ ...d, lines }));
              }} />
              <NativeSelect className="min-w-[9rem]" value={line.n_form ?? ''} onChange={(e) => {
                const lines = [...draft.lines];
                lines[idx] = { ...lines[idx], n_form: e.target.value };
                setDraft((d) => ({ ...d, lines }));
              }}>
                <option value="">{t('nutrient.productFilters.nForm')}</option>
                <option value="nitrate">{t('nutrient.productFilters.nFormNitrate')}</option>
                <option value="ammonium">{t('nutrient.productFilters.nFormAmmonium')}</option>
                <option value="urea">{t('nutrient.productFilters.nFormUrea')}</option>
                <option value="total">{t('nutrient.productFilters.nFormTotal')}</option>
              </NativeSelect>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-11 rounded-xl" onClick={() => setDraft((d) => ({ ...d, lines: [...d.lines, { form_key: 'P', value_pct: 0, n_form: '' }] }))}>{t('common.add')}</Button>
            <Button type="button" className="min-h-11 rounded-xl" onClick={() => saveFarmProduct()}>{t('common.save')}</Button>
            <Button type="button" className="min-h-11 rounded-xl" variant="ghost" onClick={() => setEditingFarmId(null)}>{t('common.cancel')}</Button>
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
                'flex gap-2 rounded-xl border bg-card p-2 shadow-sm',
                selected && 'border-primary/40 bg-primary/[0.04]',
              )}
            >
              <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-input accent-primary"
                  checked={selected}
                  onChange={() => toggleProduct(p.id)}
                />
              </label>
              <div className="min-w-0 flex-1 py-0.5">
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center text-left leading-snug"
                  onClick={() => toggleProduct(p.id)}
                >
                  {productLabel(p, locale)}
                </button>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-muted-foreground sm:text-xs">
                    {scopeLabel(p.scope, t)}
                  </span>
                  {p.metadata && <SourceBadge metadata={p.metadata} compact />}
                  {p.compositionEdited ? (
                    <span className="rounded-full border border-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">
                      {t('nutrient.productFilters.edited')}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-0.5">
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
