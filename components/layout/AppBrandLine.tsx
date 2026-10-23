'use client';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { useTranslation } from '@/components/providers/I18nProvider';
import { cn } from '@/lib/utils';

/** Compact brand line — OG Lab logo + “Growlog”; fits 390px without truncation. */
export function AppBrandLine({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <p
      className={cn(
        'text-[11px] font-semibold leading-none text-grow-moss dark:text-[#b4c496] sm:text-xs',
        className,
      )}
    >
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap"
        aria-label={t('appName')}
      >
        <BrandLogo className="h-[15px] w-auto" aria-hidden />
        <span>Growlog</span>
      </span>
    </p>
  );
}
