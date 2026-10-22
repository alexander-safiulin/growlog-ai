'use client';

import { elementalFractionTable } from '@growlog/nutrient-calc';
import { unifiedToFertilizerSpecs } from '@/lib/nutrient/unified-products';
import { useMemo } from 'react';
import { useTranslation } from '@/components/providers/I18nProvider';
import { useNutrientWorkspace } from '@/components/nutrient/workspace/NutrientWorkspaceContext';
import { productDisplayName } from '@/lib/nutrient/product-display-names';
import { elementMassAndValence } from '@/lib/nutrient/element-reference';

export function ElementsTab() {
  const { t } = useTranslation();
  const { catalog, locale, unifiedProducts, selectedIds, model } = useNutrientWorkspace();

  const selected = useMemo(
    () => unifiedProducts.filter((p) => selectedIds.includes(p.id)),
    [unifiedProducts, selectedIds],
  );

  const fractionRows = useMemo(() => {
    if (!selected.length) return [];
    const specs = unifiedToFertilizerSpecs(selected);
    return elementalFractionTable(specs, model);
  }, [selected, model]);

  return (
    <section className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1">{t('nutrient.element')}</th>
              <th className="text-right py-1">{t('nutrient.elements.mass')}</th>
              <th className="text-right py-1">{t('nutrient.elements.valence')}</th>
            </tr>
          </thead>
          <tbody>
            {(catalog.elements ?? []).map((el) => {
              const ref = elementMassAndValence(el.symbol);
              const mass = el.atomic_mass ?? ref.atomic_mass;
              const val = el.valence ?? ref.valence;
              return (
                <tr key={el.symbol} className="border-b border-border/50">
                  <td className="py-1">{el.display_name ?? el.symbol}</td>
                  <td className="text-right py-1">{mass != null ? mass : '—'}</td>
                  <td className="text-right py-1">{val != null ? val : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">{t('nutrient.elements.fractions')}</h3>
          <div className="overflow-x-auto max-h-64">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">{t('nutrient.dose')}</th>
                  <th className="text-right py-1">{t('nutrient.element')}</th>
                  <th className="text-right py-1">%</th>
                </tr>
              </thead>
              <tbody>
                {fractionRows.map((row, i) => {
                  const prod = selected.find((p) => p.id === row.fertilizerId);
                  const label = prod
                    ? productDisplayName(prod.external_key, prod.name, locale)
                    : row.name;
                  return (
                    <tr key={`${row.fertilizerId}-${row.element}-${i}`} className="border-b border-border/40">
                      <td className="py-1">{label}</td>
                      <td className="text-right py-1">{row.element}</td>
                      <td className="text-right py-1">{row.pctInProduct.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {catalog.oxide_factors && catalog.oxide_factors.length > 0 && (
        <>
          <h3 className="text-sm font-medium">{t('nutrient.elements.salts')}</h3>
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
  );
}
