'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function NutrientGuestMergeDialog({
  open,
  itemCount,
  merging,
  onConfirm,
  onSkip,
}: {
  open: boolean;
  itemCount: number;
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
      <CardContent className="text-sm text-muted-foreground">
        {t('nutrient.guest.mergeBody', { count: itemCount })}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={merging} onClick={onSkip}>
          {t('nutrient.guest.mergeSkip')}
        </Button>
        <Button type="button" disabled={merging} onClick={onConfirm}>
          {merging ? t('nutrient.guest.mergeWorking') : t('nutrient.guest.mergeConfirm')}
        </Button>
      </CardFooter>
    </Card>
  );
}
