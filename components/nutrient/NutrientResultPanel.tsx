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
  formatNutrientPpmLocale,
  formatStockAmount,
  formatTankLabel,
} from '@/lib/nutrient/format-dose';
import { solutionDoseFingerprint } from '@/lib/nutrient/workspace/wand-recipe-session';
import { nitrogenBreakdown, nitrogenRowVisible } from '@/lib/nutrient/nitrogen-breakdown';
import { nutrientTableElementKeys } from '@/lib/nutrient/solver-deviation-keys';
import { NutrientContextHelpLink } from '@/components/nutrient/help/NutrientContextHelpLink';
import { WandVariantCompare } from '@/components/nutrient/WandVariantCompare';
import { Button } from '@/components/ui/button';
import { SaveCustomTargetProfileBlock } from '@/components/nutrient/workspace/SaveCustomTargetProfileBlock';
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
  onSaveTargetProfile,
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
  onSaveTargetProfile?: (name: string, targetPpm: Record<string, number>) => Promise<string | null>;
}) {
  const { t, locale } = useTranslation();
  const fmt = (value: number, digits: number) => formatLocaleAmount(value, locale, digits);
  const ppmText = (value: number) => formatNutrientPpmLocale(value, locale);
  const [showMicro, setShowMicro] = useState(true);
  const [showTarget, setShowTarget] = useState(true);
  const [showAchieved, setShowAchieved] = useState(true);
  const [showDelta, setShowDelta] = useState(true);
  const [activeSolution, setActiveSolution] = useState(0);
  const [compareOpen, setCompareOpen] = useState(false);
  const [nitrogenOpen, setNitrogenOpen] = useState(false);

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

  const achievedPpm = solution.achievedPpm as Record<string, number>;
  const nitrogen = useMemo(() => nitrogenBreakdown(target, achievedPpm), [target, achievedPpm]);

  const elementKeys: ElementKey[] = useMemo(() => {
    const base =
      model === 'hydroodo_legacy'
        ? (['P', 'K', 'Ca', 'Mg', 'S'] as ElementKey[])
        : nutrientTableElementKeys({ showMicro, showOptionalIons });
    return base.filter(
      (k) => k !== 'N_NO3' && k !== 'N_NH4' && ((target[k] ?? 0) > 0 || (achievedPpm[k] ?? 0) > 0),
    );
  }, [model, showMicro, showOptionalIons, target, achievedPpm]);

  const deviations = useMemo(
    () => computeDeviations(elementKeys, target, achievedPpm),
    [elementKeys, target, achievedPpm],
  );

  const compositionRows = useMemo(() => {
    const rows: Array<{
      id: string;
      label: string;
      targetPpm: number;
      achievedPpm: number;
      deltaPct: number | null;
      withinTolerance: boolean;
      depth: 0 | 1;
      expandable: boolean;
    }> = [];
    if (nitrogenRowVisible(nitrogen)) {
      rows.push({
        id: 'N',
        label: elementDisplayLabel('N', t),
        targetPpm: nitrogen.targetPpm,
        achievedPpm: nitrogen.achievedPpm,
        deltaPct: nitrogen.deltaPct,
        withinTolerance: nitrogen.withinTolerance,
        depth: 0,
        expandable: nitrogen.forms.length > 0,
      });
      if (nitrogenOpen) {
        for (const form of nitrogen.forms) {
          rows.push({
            id: form.key,
            label: elementDisplayLabel(form.key, t),
            targetPpm: form.targetPpm,
            achievedPpm: form.achievedPpm,
            deltaPct: form.deltaPct,
            withinTolerance: form.withinTolerance,
            depth: 1,
            expandable: false,
          });
        }
      }
    }
    for (const row of deviations) {
      rows.push({
        id: row.element,
        label: elementDisplayLabel(row.element, t),
        targetPpm: row.targetPpm,
        achievedPpm: row.achievedPpm,
        deltaPct: row.deltaPct,
        withinTolerance: row.withinTolerance,
        depth: 0,
        expandable: false,
      });
    }
    return rows;
  }, [nitrogen, nitrogenOpen, deviations, t]);

  const doseRows = solution.doses as StockDoseRow[];

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
            const isZeroDose = d.amountPerL < 1e-4;
            return (
              <Card
                key={`${d.fertilizerId}-${d.tank}-m-${safeActive}`}
                className={cn('shadow-sm', isZeroDose && 'border-dashed bg-muted/25 opacity-80')}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('font-medium text-sm leading-snug', isZeroDose && 'text-muted-foreground')}>
                      {displayName}
                    </p>
                    {tankMode === 'ab' && d.tank && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {formatTankLabel(d.tank)}
                      </Badge>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div>
                      <dt className="text-muted-foreground">{t('nutrient.perL')}</dt>
                      <dd className={cn('font-medium tabular-nums', isZeroDose && 'text-muted-foreground font-normal')}>
                        {fmt(d.amountPerL, 3)} {unit}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t('nutrient.perTank')}</dt>
                      <dd className={cn('font-medium tabular-nums', isZeroDose && 'text-muted-foreground font-normal')}>
                        {fmt(total, 2)} {massUnit}
                      </dd>
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
                const isZeroDose = d.amountPerL < 1e-4;
                return (
                  <tr
                    key={`${d.fertilizerId}-${d.tank}-d-${safeActive}`}
                    className={cn(
                      'border-b border-border/50',
                      isZeroDose && 'bg-muted/20 text-muted-foreground',
                    )}
                  >
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
          {compositionRows.map((row) => {
            const barPct = Math.min(100, Math.abs(row.deltaPct ?? 0));
            const name = (
              <span className={cn('font-medium text-sm', row.depth === 1 && 'pl-4 font-normal text-muted-foreground')}>
                {row.expandable ? (nitrogenOpen ? '▾ ' : '▸ ') : ''}
                {row.label}
              </span>
            );
            return (
              <div key={row.id} className="rounded-xl border bg-card px-3 py-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  {row.expandable ? (
                    <button
                      type="button"
                      className="min-h-11 text-left"
                      aria-expanded={nitrogenOpen}
                      onClick={() => setNitrogenOpen((open) => !open)}
                    >
                      {name}
                    </button>
                  ) : (
                    name
                  )}
                  {showDelta && (
                    <span
                      className={cn(
                        'text-xs font-medium tabular-nums',
                        row.deltaPct == null
                          ? 'text-muted-foreground'
                          : row.withinTolerance
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : row.deltaPct < 0
                              ? 'text-amber-600'
                              : 'text-red-600',
                      )}
                    >
                      {row.deltaPct == null ? '—' : `${row.deltaPct > 0 ? '+' : ''}${fmt(row.deltaPct, 1)}%`}
                    </span>
                  )}
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      deviationBarClass(row.withinTolerance, row.deltaPct ?? 0),
                    )}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-muted-foreground tabular-nums">
                  {showTarget && (
                    <span>
                      {t('nutrient.target')}: {row.depth === 1 && row.targetPpm <= 0 ? '—' : ppmText(row.targetPpm)}
                    </span>
                  )}
                  {showAchieved && (
                    <span>
                      {t('nutrient.achieved')}: {ppmText(row.achievedPpm)}
                    </span>
                  )}
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
              {compositionRows.map((row) => (
                <tr key={row.id} className="border-b border-border/50">
                  <td className={cn('sticky left-0 bg-card py-2 px-3 font-medium', row.depth === 1 && 'pl-8 font-normal text-muted-foreground')}>
                    {row.expandable ? (
                      <button
                        type="button"
                        className="min-h-11 text-left"
                        aria-expanded={nitrogenOpen}
                        onClick={() => setNitrogenOpen((open) => !open)}
                      >
                        {nitrogenOpen ? '▾' : '▸'} {row.label}
                      </button>
                    ) : (
                      row.label
                    )}
                  </td>
                  {showTarget && (
                    <td className="text-right py-2 px-3 tabular-nums">
                      {row.depth === 1 && row.targetPpm <= 0 ? '—' : ppmText(row.targetPpm)}
                    </td>
                  )}
                  {showAchieved && <td className="text-right py-2 px-3 tabular-nums">{ppmText(row.achievedPpm)}</td>}
                  {showDelta && (
                    <td
                      className={cn(
                        'text-right py-2 px-3 tabular-nums font-medium',
                        row.deltaPct == null
                          ? 'text-muted-foreground'
                          : row.withinTolerance
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : row.deltaPct < 0
                              ? 'text-amber-600'
                              : 'text-red-600',
                      )}
                    >
                      {row.deltaPct == null ? '—' : fmt(row.deltaPct, 1)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {onSaveTargetProfile ? (
        <SaveCustomTargetProfileBlock
          achievedPpm={solution.achievedPpm as Record<string, number>}
          onSave={onSaveTargetProfile}
        />
      ) : null}
    </section>
  );
}

/** Re-export for tests that format warnings directly. */
export { formatNutrientWarning };
