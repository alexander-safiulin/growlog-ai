'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import Link from 'next/link';

export function NutrientCloudSyncPrompt({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <p className={className ?? 'text-sm text-muted-foreground rounded-xl border border-dashed px-3 py-2.5'}>
      {t('nutrient.guest.cloudHint')}{' '}
      <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
        {t('nutrient.guest.loginLink')}
      </Link>
    </p>
  );
}
