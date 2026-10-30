'use client';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { useTranslation } from '@/components/providers/I18nProvider';
import { cn } from '@/lib/utils';

type AppBrandLineProps = {
  className?: string;
  /** Default header lockup; `sm` for footers / tight spaces. */
  size?: 'md' | 'sm';
};

/** OG Lab wordmark + “Growlog” — equal-weight lockup, one baseline. */
export function AppBrandLine({ className, size = 'md' }: AppBrandLineProps) {
  const { t } = useTranslation();
  const textSize = size === 'sm' ? 'text-base' : 'text-[19px] sm:text-[20px]';

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-baseline gap-2.5 font-semibold leading-none tracking-tight text-grow-brand',
        textSize,
        className,
      )}
      aria-label={t('appName')}
    >
      <BrandLogo className="h-[1em] w-auto shrink-0" aria-hidden />
      <span className="whitespace-nowrap">Growlog</span>
    </span>
  );
}
