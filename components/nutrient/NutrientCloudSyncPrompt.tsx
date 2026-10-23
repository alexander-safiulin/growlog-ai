'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import { useNutrientWorkspace } from '@/components/nutrient/workspace/NutrientWorkspaceContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function NutrientCloudSyncPrompt({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { isCloudSynced, openGuestMergeDialog, pendingGuestMergeCount } = useNutrientWorkspace();

  if (!isCloudSynced) {
    return (
      <p className={className ?? 'text-sm text-muted-foreground rounded-xl border border-dashed px-3 py-2.5'}>
        {t('nutrient.guest.cloudHint')}{' '}
        <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
          {t('nutrient.guest.loginLink')}
        </Link>
      </p>
    );
  }

  if (pendingGuestMergeCount <= 0) return null;

  return (
    <div
      className={
        className ??
        'flex flex-wrap items-center justify-between gap-2 text-sm rounded-xl border border-dashed px-3 py-2.5'
      }
    >
      <span className="text-muted-foreground">
        {t('nutrient.guest.mergeSettingsHint', { count: pendingGuestMergeCount })}
      </span>
      <Button type="button" size="sm" variant="outline" className="min-h-9" onClick={openGuestMergeDialog}>
        {t('nutrient.guest.mergeOpen')}
      </Button>
    </div>
  );
}
