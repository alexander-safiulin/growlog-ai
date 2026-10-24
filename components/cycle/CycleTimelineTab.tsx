'use client';

import { CycleDayDetail } from '@/components/cycle/CycleDayDetail';
import { CycleHarvestSection } from '@/components/cycle/CycleHarvestSection';
import { CycleMonthCalendar } from '@/components/cycle/CycleMonthCalendar';
import { CycleSummaryCard } from '@/components/cycle/CycleSummaryCard';
import { useCycleCalendarMonth } from '@/components/cycle/useCycleCalendarData';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { farmCalendarDateString } from '@growlog/domain';
import Link from 'next/link';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';

export function CycleTimelineTab() {
  const { t } = useTranslation();
  const { recentEvents, farms, farmId } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const today = farmCalendarDateString(farmTz);
  const initial = useMemo(() => {
    const [y, m] = today.split('-').map(Number);
    return { year: y, month: m };
  }, [today]);

  const [ym, setYm] = useState(initial);
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const cal = useCycleCalendarMonth(ym);

  function shiftMonth(delta: number) {
    let { year, month } = ym;
    month += delta;
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    setYm({ year, month });
  }

  return (
    <div className="space-y-4">
      <CycleSummaryCard />
      <CycleHarvestSection />
      <CycleMonthCalendar
        year={ym.year}
        month={ym.month}
        cells={cal.grid}
        onPrev={() => shiftMonth(-1)}
        onNext={() => shiftMonth(1)}
        selectedDate={selectedDate}
        onSelectDay={setSelectedDate}
      />
      {selectedDate ? (
        <CycleDayDetail
          date={selectedDate}
          timeZone={cal.farmTz}
          events={cal.events}
          feedingRows={cal.feedingRows}
        />
      ) : null}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t('cycle.calRecentEvents')}</h3>
        <ul className="space-y-2 text-sm">
          {recentEvents.slice(0, 12).map((ev) => (
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
    </div>
  );
}
