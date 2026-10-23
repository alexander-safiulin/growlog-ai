'use client';

import { AlertTriangle, Info } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from '@/components/providers/I18nProvider';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import {
  formatNutrientWarning,
  nutrientWarningGroupId,
} from '@/lib/nutrient/format-warning';
import { cn } from '@/lib/utils';

export function NutrientWarnings({
  warnings,
  catalog,
  className,
}: {
  warnings: string[];
  catalog: CatalogBundle;
  className?: string;
}) {
  const { t } = useTranslation();

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const w of warnings) {
      const gid = nutrientWarningGroupId(w);
      const list = map.get(gid) ?? [];
      list.push(w);
      map.set(gid, list);
    }
    return [...map.entries()];
  }, [warnings]);

  if (warnings.length === 0) return null;

  const formatWarning = (key: string) =>
    formatNutrientWarning(key, (k, params) => t(k, params), catalog);

  return (
    <div className={cn('space-y-2', className)} role="region" aria-label={t('nutrient.warningsRegion')}>
      {grouped.map(([groupId, keys]) => {
        const severe =
          groupId.includes('incompatible') ||
          groupId.includes('exceeded') ||
          groupId.includes('infeasible');
        const Icon = severe ? AlertTriangle : Info;
        return (
          <div
            key={groupId}
            className={cn(
              'flex gap-3 rounded-xl border px-3 py-2.5 text-sm shadow-sm',
              severe
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100'
                : 'border-border bg-muted/50 text-foreground',
            )}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0 opacity-80" aria-hidden />
            <ul className="min-w-0 flex-1 space-y-1">
              {keys.map((w) => (
                <li key={w} className="leading-snug">{formatWarning(w)}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
