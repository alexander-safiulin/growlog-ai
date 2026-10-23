'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import { cn } from '@/lib/utils';
import { Sprout } from 'lucide-react';

/** Compact brand line — fits 390px without truncation. */
export function AppBrandLine({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <p
      className={cn(
        'text-[11px] font-semibold leading-none text-grow-moss sm:text-xs',
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
