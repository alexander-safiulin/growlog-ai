'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  GROWER_STAGE_ORDER,
  growerStageLabel,
  isGrowCycleStage,
  linesForManualSchedules,
  schedulesFromManualForm,
  weekdayShortLabels,
  type SopManualSchedule,
  type SopManualScheduleFormKind,
  type SopManualScheduleFormState,
  type SopManualSchedulePreviewLabels,
} from '@growlog/domain';
import { useMemo } from 'react';

const SCHEDULE_KINDS: SopManualScheduleFormKind[] = ['daily', 'weekdays', 'month_day', 'stage'];

export type SopManualScheduleEditorProps = {
  value: SopManualScheduleFormState;
  onChange: (next: SopManualScheduleFormState) => void;
  locale: string;
  labels: {
    scheduleLabel: string;
    scheduleDaily: string;
    scheduleWeekdays: string;
    scheduleMonthDay: string;
    scheduleStageEnter: string;
    scheduleStageExit: string;
    stageLabel: string;
    monthDayLabel: string;
    dueTimeLabel: string;
    dueTimeHint: string;
    schedulePreviewTitle: string;
    preview: SopManualSchedulePreviewLabels;
  };
};

export function resolveManualSchedules(state: SopManualScheduleFormState): SopManualSchedule[] | null {
  return schedulesFromManualForm(state);
}

export function SopManualScheduleEditor({ value, onChange, locale, labels }: SopManualScheduleEditorProps) {
  const weekdayLabels = weekdayShortLabels(locale);
  const schedules = useMemo(() => resolveManualSchedules(value), [value]);
  const previewLines = useMemo(() => {
    if (!schedules?.length) return [];
    return linesForManualSchedules(schedules, {
      locale,
      stageName: (stage) =>
        isGrowCycleStage(stage) ? growerStageLabel(stage, locale) : stage,
      labels: labels.preview,
    });
  }, [schedules, locale, labels.preview]);

  return (
    <div className="space-y-4 rounded-lg border border-border/80 bg-muted/30 p-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{labels.scheduleLabel}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SCHEDULE_KINDS.map((option) => {
            const optionLabel =
              option === 'daily'
                ? labels.scheduleDaily
                : option === 'weekdays'
                  ? labels.scheduleWeekdays
                  : option === 'month_day'
                    ? labels.scheduleMonthDay
                    : labels.stageLabel;
            const selected = value.kind === option;
            return (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={selected ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => onChange({ ...value, kind: option })}
              >
                {optionLabel}
              </Button>
            );
          })}
        </div>
      </fieldset>

      {value.kind === 'weekdays' && (
        <div className="flex flex-wrap gap-2">
          {weekdayLabels.map((label, index) => {
            const day = index + 1;
            const selected = value.weekdays.includes(day);
            return (
              <Button
                key={day}
                type="button"
                size="sm"
                variant={selected ? 'default' : 'outline'}
                className="min-w-[2.75rem] rounded-full"
                onClick={() =>
                  onChange({
                    ...value,
                    weekdays: selected
                      ? value.weekdays.filter((item) => item !== day)
                      : [...value.weekdays, day].sort(),
                  })
                }
              >
                {label}
              </Button>
            );
          })}
        </div>
      )}

      {value.kind === 'month_day' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">{labels.monthDayLabel}</label>
          <Input
            inputMode="numeric"
            value={value.monthDayText}
            onChange={(e) => onChange({ ...value, monthDayText: e.target.value })}
            required
          />
        </div>
      )}

      {value.kind === 'stage' && (
        <div className="space-y-3">
          <label className="text-sm font-medium">{labels.stageLabel}</label>
          <div className="flex flex-wrap gap-2">
            {GROWER_STAGE_ORDER.map((option) => {
              const selected = value.stage === option;
              return (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={selected ? 'default' : 'outline'}
                  className="rounded-full"
                  onClick={() => onChange({ ...value, stage: option })}
                >
                  {growerStageLabel(option, locale)}
                </Button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={value.stageEnter ? 'default' : 'outline'}
              onClick={() => onChange({ ...value, stageEnter: !value.stageEnter })}
            >
              {labels.scheduleStageEnter}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={value.stageExit ? 'default' : 'outline'}
              onClick={() => onChange({ ...value, stageExit: !value.stageExit })}
            >
              {labels.scheduleStageExit}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">{labels.dueTimeLabel}</label>
        <Input
          type="time"
          value={value.localTime}
          onChange={(e) => onChange({ ...value, localTime: e.target.value })}
          required
        />
        <p className="text-xs text-muted-foreground">{labels.dueTimeHint}</p>
      </div>

      {previewLines.length > 0 && (
        <div className="rounded-md border border-dashed border-primary/30 bg-background/80 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">{labels.schedulePreviewTitle}</p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {previewLines.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
