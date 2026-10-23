'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import { cn } from '@/lib/utils';
import { Sprout } from 'lucide-react';

/** Compact brand line — fits 390px without truncation (Growlog / AI). */
export function AppBrandLine({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <p
      className={cn(
        'text-[10px] font-semibold uppercase leading-none text-grow-moss tracking-[0.14em] sm:text-[11px] sm:tracking-[0.18em]',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <Sprout className="h-3 w-3 shrink-0" aria-hidden />
        {t('appNameShort')}
      </span>
    </p>
  );
}
