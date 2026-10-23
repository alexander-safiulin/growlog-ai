'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  computeDeviations,
  estimateEcWithMeta,
  type ElementKey,
  type SolveForwardResult,
} from '@growlog/nutrient-calc';
import { useTranslation } from '@/components/providers/I18nProvider';
import { NutrientWarnings } from '@/components/nutrient/NutrientWarnings';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import { formatNutrientWarning } from '@/lib/nutrient/format-warning';
import { elementDisplayLabel } from '@/lib/nutrient/element-display-label';
import {
  formatDoseUnit,
  formatEcUnit,
  formatMassUnitFromDoseUnit,
  formatLocaleAmount,
  formatStockAmount,
  formatTankLabel,
} from '@/lib/nutrient/format-dose';
import { solutionDoseFingerprint } from '@/lib/nutrient/workspace/wand-recipe-session';
import { nutrientTableElementKeys } from '@/lib/nutrient/solver-deviation-keys';
import { NutrientContextHelpLink } from '@/components/nutrient/help/NutrientContextHelpLink';
import { WandVariantCompare } from '@/components/nutrient/WandVariantCompare';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type StockDoseRow = {
  fertilizerId: string;
  fertilizerName: string;
  amountPerL: number;
  unit: 'g_per_L' | 'ml_per_L';
  tank: string;
  amountTotal?: number;
  stockAmountPerL?: number;
};

function deviationBarClass(withinTolerance: boolean, deltaPct: number): string {
  if (withinTolerance) return 'bg-emerald-500';
  if (deltaPct < 0) return 'bg-amber-500';
  return 'bg-red-500';
}

export function NutrientResultPanel({
  catalog,
  result,
  target,
  model,
  volumeL,
  tankMode,
  showAlternatives = true,
  stepMeta,
  waterMeta,
  resolveProductName,
  computing = false,
  solutionKindLabel,
  showOptionalIons = false,
  onShowOptionalIonsChange,
}: {
  catalog: CatalogBundle;
  result: SolveForwardResult;
  target: Record<string, number>;
  model: 'canonical' | 'hydroodo_legacy';
  volumeL: number;
  tankMode: 'single' | 'ab';
  showAlternatives?: boolean;
  stepMeta?: { ph_target?: number | null; ec_target_ms_cm?: number | null };
  waterMeta?: { ph?: number; ecMsCm?: number };
  resolveProductName?: (id: string, fallback: string) => string;
  computing?: boolean;
  solutionKindLabel?: string;
  showOptionalIons?: boolean;
  onShowOptionalIonsChange?: (value: boolean) => void;
}) {
  const { t, locale } = useTranslation();
  const fmt = (value: number, digits: number) => formatLocaleAmount(value, locale, digits);
  const [showMicro, setShowMicro] = useState(true);
  const [showTarget, setShowTarget] = useState(true);
  const [showAchieved, setShowAchieved] = useState(true);
  const [showDelta, setShowDelta] = useState(true);
  const [activeSolution, setActiveSolution] = useState(0);
  const [compareOpen, setCompareOpen] = useState(false);

  const solutions = useMemo(
    () => [result.best, ...result.alternatives],
    [result.best, result.alternatives],
  );
  const resultFingerprint = useMemo(() => solutionDoseFingerprint(result), [result]);

  useEffect(() => {
    setActiveSolution(0);
  }, [resultFingerprint]);

  const safeActive = Math.min(activeSolution, Math.max(0, solutions.length - 1));
  const solution = solutions[safeActive] ?? result.best;

  const ecMeta = useMemo(
    () => estimateEcWithMeta(solution.achievedPpm as Record<string, number>, { ionPairing: true }),
    [solution.achievedPpm],
  );

  const elementKeys: ElementKey[] = useMemo(() => {
    if (model === 'hydroodo_legacy') {
      return ['N', 'P', 'K', 'Ca', 'Mg', 'S'] as ElementKey[];
    }
    const keys = nutrientTableElementKeys({ showMicro, showOptionalIons });
    return keys.filter((k) => (target[k] ?? 0) > 0 || (solution.achievedPpm as Record<string, number>)[k] > 0);
  }, [model, showMicro, showOptionalIons, target, solution.achievedPpm]);

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
    return computeDeviations(elementKeys, target, achieved);
  }, [solution, target, model, elementKeys]);

  const doseRows = (solution.doses as StockDoseRow[]).filter((d) => d.amountPerL > 0);

  const matchPct = fmt(solution.matchScore * 100, 0);

  return (
    <section className="space-y-4 animate-in fade-in duration-300">
      {showAlternatives && solutions.length > 1 && (
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-none">
            {solutions.map((sol, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSolution(idx)}
                className={cn(
                  'snap-start shrink-0 min-h-11 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
                  safeActive === idx
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-card text-foreground hover:bg-muted',
                )}
              >
                {idx === 0 ? t('nutrient.magic.best') : t('nutrient.magic.alt', { n: String(idx) })}
                <span className="ml-1.5 opacity-90">{Math.round(sol.matchScore * 100)}%</span>
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full rounded-xl"
            aria-expanded={compareOpen}
            onClick={() => setCompareOpen((o) => !o)}
          >
            {compareOpen ? t('nutrient.compare.hide') : t('nutrient.compare.toggle')}
          </Button>
          {compareOpen && (
            <WandVariantCompare
              solutions={solutions}
              target={target}
              model={model}
              showMicro={showMicro}
              showOptionalIons={showOptionalIons}
              ecTargetMsCm={stepMeta?.ec_target_ms_cm}
              activeIndex={safeActive}
              onSelectVariant={setActiveSolution}
            />
          )}
        </div>
      )}

      <Card className={cn('overflow-hidden border-grow-leaf/20 shadow-md', computing && 'opacity-80')}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              {t('nutrient.results')}
              <NutrientContextHelpLink context="results" />
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {tankMode === 'ab' && (
                <Badge variant="secondary" className="font-normal">A+B</Badge>
              )}
              {solutionKindLabel && (
                <Badge variant="outline" className="font-normal">{solutionKindLabel}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {computing ? (
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/60 px-3 py-2.5">
                <p className="text-xs text-muted-foreground">{t('nutrient.ecEstimate')}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {ecMeta ? fmt(ecMeta.ecMsCm, 2) : '—'}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">{formatEcUnit(t)}</span>
                </p>
              </div>
              <div className="rounded-xl bg-muted/60 px-3 py-2.5">
                <p className="text-xs text-muted-foreground">{t('nutrient.matchScore')}</p>
                <p className="text-lg font-semibold tabular-nums">{matchPct}%</p>
              </div>
              {(stepMeta?.ph_target != null || waterMeta?.ph != null) && (
                <div className="rounded-xl bg-muted/60 px-3 py-2.5 col-span-2 sm:col-span-1">
                  <p className="text-xs text-muted-foreground">{t('nutrient.water.ph')}</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {stepMeta?.ph_target ?? waterMeta?.ph ?? '—'}
                  </p>
                </div>
              )}
            </div>
          )}
          {stepMeta?.ec_target_ms_cm != null && (
            <p className="text-xs text-muted-foreground">
              {t('nutrient.systems.ecTarget')}: {stepMeta.ec_target_ms_cm} {formatEcUnit(t)}
              {waterMeta?.ecMsCm != null && ` · ${t('nutrient.water.ec')}: ${waterMeta.ecMsCm}`}
            </p>
          )}
        </CardContent>
      </Card>

      <NutrientWarnings warnings={solution.warnings} catalog={catalog} />

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground">{t('nutrient.dose')}</h3>
        <div className="space-y-2 md:hidden">
          {doseRows.map((d) => {
            const unit = formatDoseUnit(d.unit, t);
            const massUnit = formatMassUnitFromDoseUnit(d.unit, t);
            const total = d.amountTotal ?? d.amountPerL * volumeL;
            const fert = catalog.fertilizers.find((f) => f.id === d.fertilizerId);
            const isLiquid = d.unit === 'ml_per_L' || fert?.physical_form === 'liquid';
            const displayName = resolveProductName?.(d.fertilizerId, d.fertilizerName) ?? d.fertilizerName;
            return (
              <Card key={`${d.fertilizerId}-${d.tank}-m-${safeActive}`} className="shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm leading-snug">{displayName}</p>
                    {tankMode === 'ab' && d.tank && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {formatTankLabel(d.tank)}
                      </Badge>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div>
                      <dt className="text-muted-foreground">{t('nutrient.perL')}</dt>
                      <dd className="font-medium tabular-nums">{fmt(d.amountPerL, 3)} {unit}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t('nutrient.perTank')}</dt>
                      <dd className="font-medium tabular-nums">{fmt(total, 2)} {massUnit}</dd>
                    </div>
                    {tankMode === 'ab' && d.stockAmountPerL != null && (
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">{t('nutrient.stockPerL')}</dt>
                        <dd className="font-medium tabular-nums">
                          {formatStockAmount(d.stockAmountPerL, isLiquid ? 'ml_per_L' : 'g_per_L', t, locale)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="hidden md:block overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left py-2 px-3 font-medium">{t('nutrient.dose')}</th>
                <th className="text-right py-2 px-3 font-medium">{t('nutrient.perL')}</th>
                <th className="text-right py-2 px-3 font-medium">{t('nutrient.perTank')}</th>
                {tankMode === 'ab' && <th className="text-right py-2 px-3 font-medium">{t('nutrient.stockPerL')}</th>}
                {tankMode === 'ab' && <th className="text-right py-2 px-3 font-medium">{t('nutrient.tank')}</th>}
              </tr>
            </thead>
            <tbody>
              {doseRows.map((d) => {
                const unit = formatDoseUnit(d.unit, t);
                const massUnit = formatMassUnitFromDoseUnit(d.unit, t);
                const total = d.amountTotal ?? d.amountPerL * volumeL;
                const fert = catalog.fertilizers.find((f) => f.id === d.fertilizerId);
                const isLiquid = d.unit === 'ml_per_L' || fert?.physical_form === 'liquid';
                const displayName = resolveProductName?.(d.fertilizerId, d.fertilizerName) ?? d.fertilizerName;
                return (
                  <tr key={`${d.fertilizerId}-${d.tank}-d-${safeActive}`} className="border-b border-border/50">
                    <td className="py-2 px-3">{displayName}</td>
                    <td className="text-right py-2 px-3 tabular-nums whitespace-nowrap">
                      {fmt(d.amountPerL, 3)} {unit}
                    </td>
                    <td className="text-right py-2 px-3 tabular-nums whitespace-nowrap">
                      {fmt(total, 2)} {massUnit}
                    </td>
                    {tankMode === 'ab' && (
                      <td className="text-right py-2 px-3 tabular-nums whitespace-nowrap">
                        {d.stockAmountPerL != null
                          ? formatStockAmount(d.stockAmountPerL, isLiquid ? 'ml_per_L' : 'g_per_L', t, locale)
                          : '—'}
                      </td>
                    )}
                    {tankMode === 'ab' && (
                      <td className="text-right py-2 px-3">{formatTankLabel(d.tank)}</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex min-h-11 items-center gap-2 cursor-pointer">
          <Switch checked={showMicro} onCheckedChange={setShowMicro} />
          {t('nutrient.columns.micro')}
        </label>
        {onShowOptionalIonsChange && (
          <label className="flex min-h-11 items-center gap-2 cursor-pointer">
            <Switch checked={showOptionalIons} onCheckedChange={onShowOptionalIonsChange} />
            {t('nutrient.showOptionalIons')}
          </label>
        )}
        <label className="flex min-h-11 items-center gap-2 cursor-pointer">
          <Switch checked={showTarget} onCheckedChange={setShowTarget} />
          {t('nutrient.target')}
        </label>
        <label className="flex min-h-11 items-center gap-2 cursor-pointer">
          <Switch checked={showAchieved} onCheckedChange={setShowAchieved} />
          {t('nutrient.achieved')}
        </label>
        <label className="flex min-h-11 items-center gap-2 cursor-pointer">
          <Switch checked={showDelta} onCheckedChange={setShowDelta} />
          Δ%
        </label>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t('nutrient.element')}</h3>
        <div className="space-y-2 md:hidden">
          {deviations.map((d) => {
            const barPct = Math.min(100, Math.abs(d.deltaPct));
            return (
              <div key={d.element} className="rounded-xl border bg-card px-3 py-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-medium text-sm">{elementDisplayLabel(d.element, t)}</span>
                  {showDelta && (
                    <span
                      className={cn(
                        'text-xs font-medium tabular-nums',
                        d.withinTolerance ? 'text-emerald-600 dark:text-emerald-400' : d.deltaPct < 0 ? 'text-amber-600' : 'text-red-600',
                      )}
                    >
                      {d.deltaPct > 0 ? '+' : ''}{fmt(d.deltaPct, 1)}%
                    </span>
                  )}
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', deviationBarClass(d.withinTolerance, d.deltaPct))}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-muted-foreground tabular-nums">
                  {showTarget && <span>{t('nutrient.target')}: {fmt(d.targetPpm, 1)}</span>}
                  {showAchieved && <span>{t('nutrient.achieved')}: {fmt(d.achievedPpm, 1)}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden md:block overflow-x-auto rounded-xl border max-h-[min(24rem,50vh)]">
          <table className="min-w-[28rem] text-sm border-collapse">
            <thead className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10">
              <tr className="border-b">
                <th className="sticky left-0 z-20 bg-muted/95 text-left py-2 px-3 font-medium">{t('nutrient.element')}</th>
                {showTarget && <th className="text-right py-2 px-3 font-medium">{t('nutrient.target')}</th>}
                {showAchieved && <th className="text-right py-2 px-3 font-medium">{t('nutrient.achieved')}</th>}
                {showDelta && <th className="text-right py-2 px-3 font-medium">Δ%</th>}
              </tr>
            </thead>
            <tbody>
              {deviations.map((d) => (
                <tr key={d.element} className="border-b border-border/50">
                  <td className="sticky left-0 bg-card py-2 px-3 font-medium">{elementDisplayLabel(d.element, t)}</td>
                  {showTarget && <td className="text-right py-2 px-3 tabular-nums">{fmt(d.targetPpm, 1)}</td>}
                  {showAchieved && <td className="text-right py-2 px-3 tabular-nums">{fmt(d.achievedPpm, 1)}</td>}
                  {showDelta && (
                    <td
                      className={cn(
                        'text-right py-2 px-3 tabular-nums font-medium',
                        d.withinTolerance ? 'text-emerald-600 dark:text-emerald-400' : d.deltaPct < 0 ? 'text-amber-600' : 'text-red-600',
                      )}
                    >
                      {fmt(d.deltaPct, 1)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/** Re-export for tests that format warnings directly. */
export { formatNutrientWarning };
