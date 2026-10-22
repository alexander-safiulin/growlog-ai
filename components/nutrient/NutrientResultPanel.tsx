'use client';

import { useMemo, useState } from 'react';
import {
  computeDeviations,
  estimateEcWithMeta,
  type ElementKey,
  type SolveForwardResult,
} from '@growlog/nutrient-calc';
import { useTranslation } from '@/components/providers/I18nProvider';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import { formatNutrientWarning } from '@/lib/nutrient/format-warning';
import { formatDoseUnit, formatTankLabel, formatStockAmount } from '@/lib/nutrient/format-dose';
import {
  NUTRIENT_ALL_ELEMENT_KEYS,
  NUTRIENT_MACRO_KEYS,
  NUTRIENT_MICRO_KEYS,
} from '@/lib/nutrient/solver-deviation-keys';

type StockDoseRow = {
  fertilizerId: string;
  fertilizerName: string;
  amountPerL: number;
  unit: 'g_per_L' | 'ml_per_L';
  tank: string;
  amountTotal?: number;
  stockAmountPerL?: number;
};

export function NutrientResultPanel({
  catalog,
  result,
  target,
  model,
  volumeL,
  tankMode,
  showAlternatives = true,
}: {
  catalog: CatalogBundle;
  result: SolveForwardResult;
  target: Record<string, number>;
  model: 'canonical' | 'hydroodo_legacy';
  volumeL: number;
  tankMode: 'single' | 'ab';
  showAlternatives?: boolean;
}) {
  const { t } = useTranslation();
  const [showMicro, setShowMicro] = useState(true);
  const [showTarget, setShowTarget] = useState(true);
  const [showAchieved, setShowAchieved] = useState(true);
  const [showDelta, setShowDelta] = useState(true);
  const [activeSolution, setActiveSolution] = useState(0);

  const solutions = useMemo(
    () => [result.best, ...result.alternatives],
    [result.best, result.alternatives],
  );
  const solution = solutions[activeSolution] ?? result.best;

  const formatWarning = (key: string) =>
    formatNutrientWarning(key, (k) => t(k as 'nutrient.warnings.no_fertilizers'), catalog);

  const ecMeta = useMemo(
    () => estimateEcWithMeta(solution.achievedPpm as Record<string, number>, { ionPairing: true }),
    [solution.achievedPpm],
  );

  const elementKeys: ElementKey[] = useMemo(() => {
    if (model === 'hydroodo_legacy') {
      return ['N', 'P', 'K', 'Ca', 'Mg', 'S'] as ElementKey[];
    }
    const keys = showMicro ? NUTRIENT_ALL_ELEMENT_KEYS : NUTRIENT_MACRO_KEYS;
    return keys.filter((k) => (target[k] ?? 0) > 0 || (solution.achievedPpm as Record<string, number>)[k] > 0);
  }, [model, showMicro, target, solution.achievedPpm]);

  const deviations = useMemo(() => {
    const achieved = solution.achievedPpm as Record<string, number>;
    if (model === 'hydroodo_legacy') {
      const legacyTarget = {
        N: (target.N_NO3 ?? 0) + (target.N_NH4 ?? 0) + (target.N_UREA ?? 0),
        P: target.P ?? 0,
        K: target.K ?? 0,
        Ca: target.Ca ?? 0,
        Mg: target.Mg ?? 0,
        S: target.S ?? 0,
      };
      const legacyAchieved = {
        N: achieved.N ?? 0,
        P: achieved.P ?? 0,
        K: achieved.K ?? 0,
        Ca: achieved.Ca ?? 0,
        Mg: achieved.Mg ?? 0,
        S: achieved.S ?? 0,
      };
      return computeDeviations(['N', 'P', 'K', 'Ca', 'Mg', 'S'], legacyTarget, legacyAchieved);
    }
    const microSet = new Set(NUTRIENT_MICRO_KEYS);
    const keys = elementKeys.filter((k) => showMicro || !microSet.has(k));
    return computeDeviations(keys, target, achieved);
  }, [solution, target, model, elementKeys, showMicro]);

  const doseRows = solution.doses as StockDoseRow[];

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium">{t('nutrient.results')}</h2>

      {showAlternatives && solutions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {solutions.map((sol, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSolution(idx)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm border ${
                activeSolution === idx ? 'bg-primary text-primary-foreground' : 'bg-background'
              }`}
            >
              {idx === 0
                ? t('nutrient.magic.best')
                : t('nutrient.magic.alt', { n: String(idx) })}
              {' · '}
              {(sol.matchScore * 100).toFixed(0)}%
            </button>
          ))}
        </div>
      )}

      {ecMeta && (
        <p className="text-sm">
          {t('nutrient.ecEstimate')}: <strong>{ecMeta.ecMsCm.toFixed(2)}</strong> mS/cm
        </p>
      )}

      {solution.warnings.length > 0 && (
        <ul className="text-sm text-amber-700 dark:text-amber-400 list-disc pl-5">
          {solution.warnings.map((w) => (
            <li key={w}>{formatWarning(w)}</li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1 pr-4">{t('nutrient.dose')}</th>
              <th className="text-right py-1 px-2">{t('nutrient.perL')}</th>
              <th className="text-right py-1 px-2">{t('nutrient.perTank')}</th>
              {tankMode === 'ab' && <th className="text-right py-1 px-2">{t('nutrient.stockPerL')}</th>}
              {tankMode === 'ab' && <th className="text-right py-1 pl-2">{t('nutrient.tank')}</th>}
            </tr>
          </thead>
          <tbody>
            {doseRows
              .filter((d) => d.amountPerL > 0)
              .map((d) => {
                const unit = formatDoseUnit(d.unit);
                const total = d.amountTotal ?? d.amountPerL * volumeL;
                const fert = catalog.fertilizers.find((f) => f.id === d.fertilizerId);
                const isLiquid = d.unit === 'ml_per_L' || fert?.physical_form === 'liquid';
                return (
                  <tr key={`${d.fertilizerId}-${d.tank}`} className="border-b border-border/50">
                    <td className="py-1 pr-4 whitespace-nowrap">{d.fertilizerName}</td>
                    <td className="text-right py-1 px-2 whitespace-nowrap">
                      {d.amountPerL.toFixed(3)} {unit}
                    </td>
                    <td className="text-right py-1 px-2 whitespace-nowrap">
                      {total.toFixed(2)} {unit.replace('/L', '')}
                    </td>
                    {tankMode === 'ab' && (
                      <td className="text-right py-1 px-2 whitespace-nowrap">
                        {d.stockAmountPerL != null
                          ? formatStockAmount(d.stockAmountPerL, isLiquid ? 'ml_per_L' : 'g_per_L', t)
                          : '—'}
                      </td>
                    )}
                    {tankMode === 'ab' && (
                      <td className="text-right py-1 pl-2">{formatTankLabel(d.tank)}</td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showMicro} onChange={(e) => setShowMicro(e.target.checked)} />
          {t('nutrient.columns.micro')}
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showTarget} onChange={(e) => setShowTarget(e.target.checked)} />
          {t('nutrient.target')}
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showAchieved} onChange={(e) => setShowAchieved(e.target.checked)} />
          {t('nutrient.achieved')}
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={showDelta} onChange={(e) => setShowDelta(e.target.checked)} />
          Δ%
        </label>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="min-w-[28rem] text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1 pr-4">{t('nutrient.element')}</th>
              {showTarget && <th className="text-right py-1 px-2">{t('nutrient.target')}</th>}
              {showAchieved && <th className="text-right py-1 px-2">{t('nutrient.achieved')}</th>}
              {showDelta && <th className="text-right py-1 pl-2">Δ%</th>}
            </tr>
          </thead>
          <tbody>
            {deviations.map((d) => (
              <tr key={d.element} className="border-b border-border/50">
                <td className="py-1 pr-4">{d.element}</td>
                {showTarget && <td className="text-right py-1 px-2">{d.targetPpm.toFixed(1)}</td>}
                {showAchieved && <td className="text-right py-1 px-2">{d.achievedPpm.toFixed(1)}</td>}
                {showDelta && <td className="text-right py-1 pl-2">{d.deltaPct.toFixed(1)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
