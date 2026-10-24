'use client';

import { CycleDayDetail } from '@/components/cycle/CycleDayDetail';
import { CycleMonthCalendar } from '@/components/cycle/CycleMonthCalendar';
import { useCycleCalendarMonth } from '@/components/cycle/useCycleCalendarData';
import { AppShell } from '@/components/layout/AppShell';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { farmCalendarDateString, growerStageLabelRu } from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

type StagePlan = {
  stage: string;
  planned_start: string | null;
  planned_end: string | null;
};

export default function CalendarPage() {
  const { t } = useTranslation();
  const { farmId, cycle, supabase, farms } = useFarmContext();
  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';
  const today = farmCalendarDateString(farmTz);
  const initial = useMemo(() => {
    const [y, m] = today.split('-').map(Number);
    return { year: y, month: m };
  }, [today]);
  const [ym, setYm] = useState(initial);
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const cal = useCycleCalendarMonth(ym);

  const planQuery = useQuery({
    queryKey: ['cycle-stage-plan', cycle?.id],
    enabled: !!cycle?.id && !!farmId,
    queryFn: async () => {
      const { data } = await supabase
        .from('cycle_stage_plan')
        .select('stage, planned_start, planned_end')
        .eq('farm_id', farmId!)
        .eq('cycle_id', cycle!.id)
        .order('planned_start', { ascending: true });
      return (data ?? []) as StagePlan[];
    },
  });

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
    <AppShell title={t('cms.calendar')}>
      {!cycle ? (
        <p className="text-sm text-muted-foreground">{t('common.needActiveCycle')}</p>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
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
          {(planQuery.data?.length ?? 0) > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('cycle.calStagePlan')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {planQuery.data!.map((p) => (
                  <div key={p.stage} className="flex justify-between gap-2 border-b border-border/50 pb-1">
                    <span>{growerStageLabelRu(p.stage)}</span>
                    <span className="text-muted-foreground">
                      {p.planned_start ?? '—'} — {p.planned_end ?? '—'}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
