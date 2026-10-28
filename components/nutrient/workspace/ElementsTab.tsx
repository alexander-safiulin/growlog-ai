'use client';

import { elementalFractionTable } from '@growlog/nutrient-calc';
import { unifiedToFertilizerSpecs } from '@/lib/nutrient/unified-products';
import { useMemo } from 'react';
import { useTranslation } from '@/components/providers/I18nProvider';
import { useNutrientWorkspace } from '@/components/nutrient/workspace/NutrientWorkspaceContext';
import { productDisplayName } from '@/lib/nutrient/product-display-names';
import { elementDisplayLabel } from '@/lib/nutrient/element-display-label';
import { elementMassAndValence } from '@/lib/nutrient/element-reference';
import { formatNutrientPercent, formatNutrientPpm } from '@/lib/nutrient/format-nutrient-amount';
import {
  formatSolutionElementDelta,
  solutionElementPanorama,
  type SolutionElementTile,
  type SolutionElementTone,
} from '@/lib/nutrient/solution-element-panorama';
import { cn } from '@/lib/utils';

const TILE_TONE: Record<SolutionElementTone, string> = {
  ok: 'border-emerald-300/80 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-50',
  under: 'border-amber-300/80 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50',
  over: 'border-red-300/80 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-50',
  neutral: 'border-border bg-muted/60 text-foreground',
};

function SolutionTiles({ tiles }: { tiles: SolutionElementTile[] }) {
  if (tiles.length === 0) return null;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
      {tiles.map((tile) => {
        const ppm = formatNutrientPpm(tile.achievedPpm);
        const delta = tile.deltaPct == null ? null : formatSolutionElementDelta(tile.deltaPct);
        return (
          <div
            key={tile.element}
            className={cn('rounded-lg border px-2.5 py-2', TILE_TONE[tile.tone])}
            aria-label={delta ? `${tile.element} ${ppm}, ${delta}` : `${tile.element} ${ppm}`}
          >
            <div className="text-sm font-semibold leading-none">{tile.element}</div>
            <div className="mt-1 text-base font-medium tabular-nums leading-tight">{ppm}</div>
            {delta ? <div className="mt-0.5 text-sm tabular-nums leading-tight">{delta}</div> : null}
          </div>
        );
      })}
    </div>
  );
}

export function ElementsTab() {
  const { t } = useTranslation();
  const { catalog, locale, unifiedProducts, selectedIds, model, result, target, showOptionalIons } =
    useNutrientWorkspace();

  const selected = useMemo(
    () => unifiedProducts.filter((p) => selectedIds.includes(p.id)),
    [unifiedProducts, selectedIds],
  );

  const fractionRows = useMemo(() => {
    if (!selected.length) return [];
    const specs = unifiedToFertilizerSpecs(selected);
    return elementalFractionTable(specs, model);
  }, [selected, model]);

  const solutionTiles = useMemo(() => {
    const achieved = result?.best?.achievedPpm;
    if (!achieved) return [];
    return solutionElementPanorama({
      target,
      achieved: achieved as Record<string, number>,
      showOptionalIons,
    });
  }, [result, target, showOptionalIons]);

  const macroTiles = solutionTiles.filter((tile) => tile.group === 'macro');
  const microTiles = solutionTiles.filter((tile) => tile.group === 'micro');

  return (
    <section className="space-y-4">
      {solutionTiles.length > 0 ? (
        <div className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">{t('nutrient.elements.inSolution')}</h3>
            <span className="text-sm text-muted-foreground">{t('nutrient.elements.inSolutionUnit')}</span>
          </div>
          <SolutionTiles tiles={macroTiles} />
          {microTiles.length > 0 ? (
            <div className={macroTiles.length > 0 ? 'mt-2' : undefined}>
              <SolutionTiles tiles={microTiles} />
            </div>
          ) : null}
        </div>
      ) : null}
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
            <table className="min-w-full text-sm border-collapse">
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
                      <td className="text-right py-1">{elementDisplayLabel(row.element, t)}</td>
                      <td className="text-right py-1">{formatNutrientPercent(row.pctInProduct)}</td>
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
