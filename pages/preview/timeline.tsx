'use client';

import { CaptureFab } from '@/components/layout/CaptureFab';
import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { useLocalhostPreviewGuard } from '@/components/preview/useLocalhostPreviewGuard';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { previewGrowCycle, previewTimelineEvents } from '@/lib/preview/mock-farm-data';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';

/** Localhost-only snapshot of current timeline UI (ADR events list). */
export default function PreviewTimelinePage() {
  useLocalhostPreviewGuard();
  const { t } = useTranslation();
  const cycle = previewGrowCycle;
  const recentEvents = previewTimelineEvents;

  return (
    <>
      <PageHead titleKey="titles.timeline" />
      <AppShell title={t('titles.timeline')}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('timeline.intro')}{' '}
            <span className="font-medium text-foreground">{cycle.name}</span> {t('timeline.introSuffix')}
          </p>
          <ul className="space-y-4">
            {recentEvents.map((e) => (
              <li
                key={e.id}
                className="rounded-lg border border-border/80 bg-card/50 px-4 py-3 shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {e.event_type.replace(/_/g, ' ')}
                  </span>
                  <time className="text-xs text-muted-foreground" dateTime={e.occurred_at}>
                    {new Date(e.occurred_at).toLocaleString('ru-RU')}
                  </time>
                </div>
                {e.title && <p className="mt-1 font-medium">{e.title}</p>}
                {e.body && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{e.body}</p>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/assistant">
                <MessageCircle className="mr-2 h-4 w-4" />
                {t('timeline.explainHistory')}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/log">{t('timeline.openLog')}</Link>
            </Button>
          </div>
        </div>
      </AppShell>
      <CaptureFab />
    </>
  );
}
