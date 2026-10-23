'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import {
  farmDateFromIso,
  formatRuDecimal,
  growerStageLabelRu,
  type RawCalendarEvent,
  type RawFeedingRow,
} from '@growlog/domain';
import { format } from 'date-fns';
import Link from 'next/link';

type Props = {
  date: string;
  timeZone: string;
  events: RawCalendarEvent[];
  feedingRows: RawFeedingRow[];
};

export function CycleDayDetail({ date, timeZone, events, feedingRows }: Props) {
  const { t } = useTranslation();

  const dayFeeding = feedingRows.filter((r) => farmDateFromIso(r.occurred_at, timeZone) === date);
  const dayEvents = events.filter((e) => farmDateFromIso(e.occurred_at, timeZone) === date);

  const stageEvents = dayEvents.filter((e) => e.event_type === 'stage_changed');
  const miscEvents = dayEvents.filter(
    (e) => !['watering', 'feeding', 'stage_changed'].includes(e.event_type),
  );

  const hasContent = dayFeeding.length > 0 || dayEvents.length > 0;

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{t('cycle.calDayTitle', { date })}</h4>
        <Button asChild size="sm" variant="outline">
          <Link href={`/cycle/log?kind=watering&date=${date}`}>{t('cycle.calAddEntry')}</Link>
        </Button>
      </div>

      {!hasContent ? <p className="text-sm text-muted-foreground">{t('cycle.calDayEmpty')}</p> : null}

      <ul className="space-y-3 text-sm">
        {dayFeeding.map((row) => (
          <li key={row.event_id} className="space-y-1 border-b border-border/40 pb-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">
                {row.entry_kind === 'feeding' ? t('cycle.logTitleFeed') : t('cycle.logTitleWater')}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(row.occurred_at), 'HH:mm')}
              </span>
            </div>
            <p>
              {t('cycle.logVolume')}: {formatRuDecimal(row.volume_ml, 0)} мл
            </p>
            {row.ph != null ? <p>{t('cycle.logPh')}: {formatRuDecimal(row.ph, 1)}</p> : null}
            {row.ec_ms != null ? <p>{t('cycle.logEc')}: {formatRuDecimal(row.ec_ms, 2)}</p> : null}
            {row.recipe_name ? <p>{t('cycle.logRecipe')}: {row.recipe_name}</p> : null}
            {row.doses.length > 0 ? (
              <ul className="text-xs text-muted-foreground">
                {row.doses.map((d, i) => (
                  <li key={i}>
                    {d.product_label}: {formatRuDecimal(d.amount_ml, 1)} мл
                  </li>
                ))}
              </ul>
            ) : null}
            {row.air_temp_c != null || row.air_rh_pct != null ? (
              <p className="text-xs text-muted-foreground">
                {row.air_temp_c != null ? `${formatRuDecimal(row.air_temp_c, 1)} °C` : ''}
                {row.air_temp_c != null && row.air_rh_pct != null ? ' · ' : ''}
                {row.air_rh_pct != null ? `${formatRuDecimal(row.air_rh_pct, 0)} %` : ''}
              </p>
            ) : null}
            {row.comment ? <p className="text-xs">{row.comment}</p> : null}
          </li>
        ))}

        {stageEvents.map((ev) => {
          const to = ev.payload?.to_stage as string | undefined;
          return (
            <li key={ev.id} className="border-b border-border/40 pb-2">
              <span className="text-xs text-muted-foreground">{format(new Date(ev.occurred_at), 'HH:mm')}</span>
              <p>{t('cycle.calStageChange', { stage: growerStageLabelRu(to ?? '') })}</p>
            </li>
          );
        })}

        {miscEvents.map((ev) => (
          <li key={ev.id} className="border-b border-border/40 pb-2">
            <span className="text-xs text-muted-foreground">{format(new Date(ev.occurred_at), 'HH:mm')}</span>
            <p>{ev.body ?? ev.event_type}</p>
          </li>
        ))}
      </ul>

    </div>
  );
}
