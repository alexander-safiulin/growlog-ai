'use client';

import { useMemo, useState } from 'react';
import type { SolveSolution } from '@growlog/nutrient-calc';
import { useTranslation } from '@/components/providers/I18nProvider';
import { elementDisplayLabel } from '@/lib/nutrient/element-display-label';
import { formatLocaleAmount } from '@/lib/nutrient/format-dose';
import {
  buildWandVariantCompareRows,
  type WandCompareCell,
} from '@/lib/nutrient/wand-variant-compare';
import { cn } from '@/lib/utils';

function cellTone(cell: WandCompareCell): string {
  if (cell.kind === 'match') return 'text-foreground';
  if (cell.kind === 'achieved') return 'text-muted-foreground';
  if (cell.kind === 'ec' && cell.deltaPct == null) return 'text-foreground';
  if (cell.kind === 'deviation' || (cell.kind === 'ec' && cell.deltaPct != null)) {
    const severity = cell.kind === 'deviation' ? cell.severity : cell.severity!;
    const direction = cell.kind === 'deviation' ? cell.direction : cell.direction!;
    if (severity === 'ok') return 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-100';
    if (severity === 'amber') {
      return direction === 'surplus'
        ? 'bg-amber-500/15 text-amber-950 dark:text-amber-100'
        : 'bg-amber-500/20 text-amber-950 dark:text-amber-50';
    }
    return direction === 'surplus'
      ? 'bg-red-500/15 text-red-950 dark:text-red-100'
      : 'bg-red-500/20 text-red-950 dark:text-red-50';
  }
  return '';
}

function formatCellPrimary(
  cell: WandCompareCell,
  fmt: (n: number, d: number) => string,
): string {
  if (cell.kind === 'match') return `${fmt(cell.matchPct, 0)}%`;
  if (cell.kind === 'achieved') return fmt(cell.achievedPpm, 1);
  if (cell.kind === 'ec') {
    if (cell.deltaPct != null) {
      const sign = cell.deltaPct > 0 ? '+' : '';
      return `${sign}${fmt(cell.deltaPct, 1)}%`;
    }
    return fmt(cell.ecMsCm, 2);
  }
  const sign = cell.deltaPct > 0 ? '+' : '';
  return `${sign}${fmt(cell.deltaPct, 1)}%`;
}

function formatCellSecondary(cell: WandCompareCell, fmt: (n: number, d: number) => string): string | null {
  if (cell.kind === 'deviation' || (cell.kind === 'ec' && cell.deltaPct != null)) {
    const ppm = cell.kind === 'deviation' ? cell.achievedPpm : cell.ecMsCm;
    return fmt(ppm, cell.kind === 'ec' ? 2 : 1);
  }
  if (cell.kind === 'achieved') return null;
  return null;
}

export function WandVariantCompare({
  solutions,
  target,
  model,
  showMicro,
  ecTargetMsCm,
  activeIndex,
  onSelectVariant,
}: {
  solutions: SolveSolution[];
  target: Record<string, number>;
  model: 'canonical' | 'hydroodo_legacy';
  showMicro: boolean;
  ecTargetMsCm?: number | null;
  activeIndex: number;
  onSelectVariant: (index: number) => void;
}) {
  const { t, locale } = useTranslation();
  const fmt = (value: number, digits: number) => formatLocaleAmount(value, locale, digits);
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      buildWandVariantCompareRows({
        solutions,
        target,
        model,
        showMicro,
        ecTargetMsCm,
      }),
    [solutions, target, model, showMicro, ecTargetMsCm],
  );

  const rowLabel = (rowId: string) => {
    if (rowId === 'N_total') return t('nutrient.compare.nTotal');
    if (rowId === 'ec') return t('nutrient.ecEstimate');
    if (rowId === 'match') return t('nutrient.matchScore');
    return elementDisplayLabel(rowId, t);
  };

  if (solutions.length < 2) return null;

  return (
    <div className="rounded-xl border border-grow-leaf/20 bg-card shadow-sm">
      <div className="border-b border-border/60 px-3 py-2">
        <h3 className="text-sm font-semibold">{t('nutrient.compare.title')}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{t('nutrient.compare.hint')}</p>
      </div>
      <div className="relative overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[28rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-card">
              <th
                className="sticky left-0 z-20 min-w-[7.5rem] bg-card px-3 py-2 text-left text-xs font-medium text-muted-foreground shadow-[4px_0_8px_-4px_hsl(var(--foreground)/0.08)]"
              >
                {t('nutrient.compare.element')}
              </th>
              {solutions.map((sol, colIdx) => (
                <th key={colIdx} className="min-w-[5.5rem] p-1">
                  <button
                    type="button"
                    onClick={() => onSelectVariant(colIdx)}
                    className={cn(
                      'flex min-h-11 w-full flex-col items-center justify-center rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                      activeIndex === colIdx
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/60 hover:bg-muted',
                    )}
                  >
                    <span>
                      {colIdx === 0
                        ? t('nutrient.magic.best')
                        : t('nutrient.magic.alt', { n: String(colIdx) })}
                    </span>
                    <span className="tabular-nums opacity-90">{Math.round(sol.matchScore * 100)}%</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/40">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-xs font-medium shadow-[4px_0_8px_-4px_hsl(var(--foreground)/0.08)]"
                >
                  {rowLabel(row.id)}
                </th>
                {row.cells.map((cell, colIdx) => {
                  const key = `${row.id}-${colIdx}`;
                  const secondary = formatCellSecondary(cell, fmt);
                  const showSecondary = expandedCell === key && secondary;
                  return (
                    <td key={colIdx} className="p-1">
                      <button
                        type="button"
                        className={cn(
                          'flex min-h-11 w-full flex-col items-center justify-center rounded-lg px-1.5 py-1 tabular-nums text-xs',
                          cellTone(cell),
                        )}
                        onClick={() => setExpandedCell((prev) => (prev === key ? null : key))}
                        aria-expanded={showSecondary}
                        title={secondary ? t('nutrient.compare.achievedHint') : undefined}
                      >
                        <span className="font-medium">{formatCellPrimary(cell, fmt)}</span>
                        {showSecondary && (
                          <span className="text-[10px] opacity-80">{secondary}</span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
