'use client';

import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { useLocalhostPreviewGuard } from '@/components/preview/useLocalhostPreviewGuard';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { EventType } from '@/types/domain';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const QUICK_TYPES: EventType[] = [
  'note',
  'observation',
  'action_taken',
  'watering',
  'feeding',
  'issue_detected',
];

/** Localhost-only snapshot of current journal / log form UI. */
export default function PreviewLogPage() {
  useLocalhostPreviewGuard();
  const { t } = useTranslation();
  const [eventType, setEventType] = useState<EventType>('observation');

  return (
    <>
      <PageHead titleKey="titles.log" />
      <AppShell title={t('titles.log')}>
        <Card>
          <CardHeader>
            <CardTitle>{t('log.textTitle')}</CardTitle>
            <CardDescription>{t('log.textDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('log.eventType')}</span>
              <div className="flex flex-wrap gap-2">
                {QUICK_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEventType(type)}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                      eventType === type
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {type.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('common.whenLocal')}</label>
              <Input type="datetime-local" value="2026-03-23T12:30" readOnly />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('common.text')}</label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={t('log.bodyPlaceholder')}
                defaultValue="Подкрутил вентилятор — влажность ночью держится около 62 %."
                readOnly
              />
            </div>
            <Button type="button" className="w-full sm:w-auto">{t('log.submit')}</Button>
          </CardContent>
        </Card>
      </AppShell>
    </>
  );
}
