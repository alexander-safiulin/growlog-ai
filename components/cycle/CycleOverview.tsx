'use client';

import { CycleTaskRow } from '@/components/cycle/CycleTaskRow';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import {
  buildStageTimeline,
  cycleDayNumber,
  daysInCurrentStage,
  fetchCycleStagePlan,
  fetchLastFeedingEvents,
  fetchStageChangeEvents,
  growerStageLabelRu,
  lightSchedulePresetLabel,
  nextLightTransition,
  perStageDayCounters,
  stagesForStartMaterial,
  type GrowCycleStage,
} from '@growlog/domain';
import { useQuery } from '@tanstack/react-query';
import { Droplets, FlaskConical, Plus } from 'lucide-react';
import { format } from 'date-fns';

export function CycleOverview() {
  const { t } = useTranslation();
  const { supabase, farmId, cycle, farms } = useFarmContext();

  const farmTz = farms.find((f) => f.id === farmId)?.timezone ?? 'UTC';

  const lastEventsQuery = useQuery({
    queryKey: ['cycle-last-feed', farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id,
    queryFn: () => fetchLastFeedingEvents(supabase, { farmId: farmId!, cycleId: cycle!.id }),
  });

  const stageEventsQuery = useQuery({
    queryKey: ['cycle-stage-events', farmId, cycle?.id],
    enabled: !!farmId && !!cycle?.id,
    queryFn: () => fetchStageChangeEvents(supabase, { farmId: farmId!, cycleId: cycle!.id }),
  });

  const planQuery = useQuery({
    queryKey: ['cycle-stage-plan', cycle?.id],
    enabled: !!cycle?.id,
    queryFn: () => fetchCycleStagePlan(supabase, cycle!.id),
  });

  if (!cycle) return null;

  const day = cycleDayNumber({ startDate: cycle.start_date, timeZone: farmTz });
  const transitions = (stageEventsQuery.data ?? []).map((e) => ({
    toStage: (e.payload.to_stage as GrowCycleStage) ?? cycle.stage,
    occurredAt: e.occurred_at,
  }));
  const material = cycle.start_material === 'clone' ? 'clone' : 'seed';
  const timeline = buildStageTimeline({
    cycleStartDate: cycle.start_date,
    initialStage: (cycle.stage as GrowCycleStage) ?? 'veg',
    transitions,
  });
  const stageDays = daysInCurrentStage({ timeline, timeZone: farmTz });
  const counters = perStageDayCounters({ timeline, timeZone: farmTz });
  const stageList = stagesForStartMaterial(material);

  const lightOn = cycle.light_hours_on ?? 18;
  const lightOff = cycle.light_hours_off ?? 6;
  const lightsOnAt = cycle.lights_on_at?.slice(0, 5) ?? '06:00';
  const countdown = nextLightTransition({
    schedule: { lightHoursOn: lightOn, lightHoursOff: lightOff, lightsOnAt },
    timeZone: farmTz,
  });

  const plannedEnd = (planQuery.data ?? [])
    .map((p) => p.planned_end)
    .filter(Boolean)
    .sort()
    .pop();

  function formatWhen(iso: string | null | undefined) {
    if (!iso) return t('cycle.never');
    return format(new Date(iso), 'dd.MM.yyyy HH:mm');
  }

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">{t('cycle.dayOfCycle', { day: String(day) })}</dt>
          <dd className="font-medium">
            {growerStageLabelRu(cycle.stage)} · {t('cycle.stageDays', { days: String(stageDays) })}
          </dd>
        </div>
        {cycle.plant_count != null ? (
          <div>
            <dt className="text-muted-foreground">{t('cycle.plantCount')}</dt>
            <dd className="font-medium">{cycle.plant_count}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground">{t('cycle.lastWatering')}</dt>
          <dd className="font-medium">{formatWhen(lastEventsQuery.data?.lastWatering)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('cycle.lastFeeding')}</dt>
          <dd className="font-medium">{formatWhen(lastEventsQuery.data?.lastFeeding)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('cycle.lightSchedule')}</dt>
          <dd className="font-medium">
            {lightSchedulePresetLabel(lightOn, lightOff)} · {lightsOnAt}
          </dd>
        </div>
        {countdown ? (
          <div>
            <dt className="text-muted-foreground">{t('cycle.lightsCountdown', { event: countdown.labelRu })}</dt>
            <dd className="font-medium">{format(countdown.targetAt, 'HH:mm')}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground">{t('cycle.startDate')}</dt>
          <dd className="font-medium">{cycle.start_date}</dd>
        </div>
        {plannedEnd ? (
          <div>
            <dt className="text-muted-foreground">{t('cycle.plannedEnd')}</dt>
            <dd className="font-medium">{plannedEnd}</dd>
          </div>
        ) : null}
      </dl>

      <ul className="space-y-1 text-xs text-muted-foreground">
        {stageList.map((s) => {
          const d = counters[s];
          if (!d) return null;
          return (
            <li key={s}>
              {t('cycle.stageCounter', {
                stage: growerStageLabelRu(s),
                day: String(d),
              })}
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t('cycle.tasksTitle')}</h3>
        <CycleTaskRow href="/cycle/log?kind=watering" icon={Droplets} label={t('cycle.logWatering')} />
        <CycleTaskRow href="/cycle/log?kind=feeding" icon={FlaskConical} label={t('cycle.logFeeding')} />
        <CycleTaskRow href="/cycle/new" icon={Plus} label={t('cycle.newCycle')} />
      </div>
    </div>
  );
}
