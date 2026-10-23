'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import Link from 'next/link';
import { format } from 'date-fns';

export function CycleTimelineTab() {
  const { t } = useTranslation();
  const { recentEvents } = useFarmContext();

  return (
    <div className="space-y-3">
      <ul className="space-y-2 text-sm">
        {recentEvents.slice(0, 20).map((ev) => (
          <li key={ev.id} className="border-b border-border/50 pb-2">
            <span className="text-xs text-muted-foreground">
              {format(new Date(ev.occurred_at), 'dd.MM.yyyy HH:mm')}
            </span>
            <p className="font-medium">{ev.body ?? ev.event_type}</p>
          </li>
        ))}
      </ul>
      <Link href="/timeline" className="text-sm text-primary underline-offset-2 hover:underline">
        {t('cycle.openTimeline')}
      </Link>
    </div>
  );
}
