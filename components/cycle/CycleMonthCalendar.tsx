'use client';

import { useTranslation } from '@/components/providers/I18nProvider';
import { stageBandStyle, type CalendarMonthCell, type GrowCycleStage } from '@growlog/domain';
import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  FileText,
  FlaskConical,
  Flower2,
  ImageIcon,
  Leaf,
  Scissors,
  Sprout,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

function StageChangeMarkerIcon({ stage }: { stage?: GrowCycleStage }) {
  const className = 'h-3 w-3 text-amber-700 dark:text-amber-400';
  if (stage === 'flower') return <Flower2 className={className} aria-hidden />;
  if (stage === 'propagation' || stage === 'cloning') {
    return <Sprout className={className} aria-hidden />;
  }
  return <Leaf className={className} aria-hidden />;
}

type Props = {
  year: number;
  month: number;
  cells: CalendarMonthCell[];
  onPrev: () => void;
  onNext: () => void;
  onSelectDay: (date: string) => void;
  selectedDate?: string | null;
};

export function CycleMonthCalendar({
  year,
  month,
  cells,
  onPrev,
  onNext,
  onSelectDay,
  selectedDate,
}: Props) {
  const { t, locale } = useTranslation();
  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="icon" onClick={onPrev} aria-label={t('cycle.calPrev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold capitalize">{monthLabel}</h3>
        <Button type="button" variant="outline" size="icon" onClick={onNext} aria-label={t('cycle.calNext')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
        {WEEKDAY_KEYS.map((k) => (
          <div key={k}>
            {
              {
                mon: t('cycle.calWeekday.mon'),
                tue: t('cycle.calWeekday.tue'),
                wed: t('cycle.calWeekday.wed'),
                thu: t('cycle.calWeekday.thu'),
                fri: t('cycle.calWeekday.fri'),
                sat: t('cycle.calWeekday.sat'),
                sun: t('cycle.calWeekday.sun'),
              }[k]
            }
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const tint = stageBandStyle(cell.stage, cell.inCycle ? 0.16 : 0.04);
          const selected = selectedDate === cell.date;
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelectDay(cell.date)}
              className={[
                'relative flex min-h-[52px] flex-col rounded-md border p-1 text-left transition-colors',
                cell.isCurrentMonth ? 'border-border/70' : 'border-transparent',
                cell.muted ? 'opacity-45' : '',
                cell.isToday ? 'ring-2 ring-primary/60' : '',
                selected ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted/40',
              ].join(' ')}
              style={{ backgroundColor: tint ?? undefined }}
            >
              <span className="text-xs font-medium leading-none">{cell.dayOfMonth}</span>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {cell.markers.watering ? (
                  <Droplets className="h-3 w-3 text-sky-600 dark:text-sky-400" aria-hidden />
                ) : null}
                {cell.markers.feedingColors?.map((c, i) => (
                  <FlaskConical key={i} className="h-3 w-3" style={{ color: c }} aria-hidden />
                ))}
                {cell.markers.stageChange ? (
                  <StageChangeMarkerIcon stage={cell.markers.stageChangeTo} />
                ) : null}
                {cell.markers.procedure ? (
                  <Scissors className="h-3 w-3 text-primary" aria-hidden />
                ) : null}
                {cell.markers.note ? (
                  <FileText className="h-3 w-3 text-muted-foreground" aria-hidden />
                ) : null}
                {cell.markers.photo ? (
                  <ImageIcon className="h-3 w-3 text-muted-foreground" aria-hidden />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
