'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { GuestMergeDuplicate } from '@growlog/domain';

export function NutrientGuestMergeDialog({
  open,
  itemCount,
  duplicates,
  errorMessage,
  merging,
  onConfirm,
  onSkip,
}: {
  open: boolean;
  itemCount: number;
  duplicates: GuestMergeDuplicate[];
  errorMessage: string | null;
  merging: boolean;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <Card className="border-primary/30 bg-primary/5 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('nutrient.guest.mergeTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>{t('nutrient.guest.mergeBody', { count: itemCount })}</p>
        {duplicates.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-foreground">
            <p className="font-medium text-xs mb-1">{t('nutrient.guest.mergeDuplicatesTitle')}</p>
            <ul className="list-disc pl-4 space-y-0.5 text-xs">
              {duplicates.map((d) => (
                <li key={`${d.kind}-${d.guestId}`}>
                  {d.label}{' '}
                  <span className="text-muted-foreground">
                    (
                    {d.reason === 'name_exists'
                      ? t('nutrient.guest.mergeDuplicateReason.name_exists')
                      : t('nutrient.guest.mergeDuplicateReason.external_key_exists')}
                    )
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs mt-1.5 text-muted-foreground">{t('nutrient.guest.mergeDuplicatesHint')}</p>
          </div>
        )}
        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">{errorMessage}</p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={merging} onClick={onSkip}>
          {t('nutrient.guest.mergeSkip')}
        </Button>
        <Button type="button" disabled={merging || itemCount === 0} onClick={onConfirm}>
          {merging ? t('nutrient.guest.mergeWorking') : t('nutrient.guest.mergeConfirm')}
        </Button>
      </CardFooter>
    </Card>
  );
}
