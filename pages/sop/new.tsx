'use client';

import { AppRouteReady } from '@/components/AppRouteReady';
import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { createSopDefinitionWithAssignment } from '@/lib/growlog/sop-mutations';
import {
  GROWER_STAGE_ORDER,
  growerStageLabel,
  weekdayShortLabels,
  type GrowCycleStage,
  type SopManualSchedule,
} from '@growlog/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

const SCHEDULE_KINDS = ['daily', 'weekdays', 'month_day', 'stage'] as const;

function SopNewBody() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { supabase, farmId, cycle, primaryScope } = useFarmContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [localTime, setLocalTime] = useState('09:00');
  const [kind, setKind] = useState<(typeof SCHEDULE_KINDS)[number]>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [monthDayText, setMonthDayText] = useState('1');
  const [stage, setStage] = useState<GrowCycleStage>('flower');
  const [stageEnter, setStageEnter] = useState(true);
  const [stageExit, setStageExit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const weekdayLabels = weekdayShortLabels(locale);

  function schedule(): SopManualSchedule[] | null {
    if (kind === 'weekdays') {
      if (!weekdays.length) return null;
      return [{ kind, localTime, weekdays }];
    }
    if (kind === 'month_day') {
      const monthDay = Number(monthDayText);
      if (!Number.isInteger(monthDay) || monthDay < 1 || monthDay > 31) return null;
      return [{ kind, localTime, monthDay }];
    }
    if (kind === 'stage') {
      const items: SopManualSchedule[] = [];
      if (stageEnter) items.push({ kind: 'stage_enter', localTime, stage });
      if (stageExit) items.push({ kind: 'stage_exit', localTime, stage });
      return items.length ? items : null;
    }
    return [{ kind: 'daily', localTime }];
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = schedule();
    if (!farmId || !cycle || !primaryScope || !next) return;
    setError(null);
    setPending(true);
    try {
      await createSopDefinitionWithAssignment(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope.id,
        title,
        description,
        schedule: next,
        appliesToScope: 'tent',
      });
      await router.push('/sop');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setPending(false);
    }
  }

  if (!cycle || !primaryScope) {
    return (
      <>
        <PageHead titleKey="titles.sopNew" />
        <AppShell title={t('titles.sopNew')}>
          <p className="text-muted-foreground">{t('sop.needCycleScope')}</p>
        </AppShell>
      </>
    );
  }

  return (
    <>
      <PageHead titleKey="titles.sopNew" />
      <AppShell title={t('titles.sopNew')}>
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>{t('sop.dailyTitle')}</CardTitle>
            <CardDescription>{t('sop.newDescTechnical')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('sop.titleLabel')}</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('sop.descriptionLabel')}</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t('sop.scheduleLabel')}</legend>
                <div className="flex flex-wrap gap-2">
                  {SCHEDULE_KINDS.map((option) => {
                    const label =
                      option === 'daily'
                        ? t('sop.scheduleDaily')
                        : option === 'weekdays'
                          ? t('sop.scheduleWeekdays')
                          : option === 'month_day'
                            ? t('sop.scheduleMonthDay')
                            : t('sop.stageLabel');
                    const selected = kind === option;
                    return (
                      <Button
                        key={option}
                        type="button"
                        size="sm"
                        variant={selected ? 'default' : 'outline'}
                        onClick={() => setKind(option)}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </fieldset>
              {kind === 'weekdays' && (
                <div className="flex flex-wrap gap-2">
                  {weekdayLabels.map((label, index) => {
                    const day = index + 1;
                    const selected = weekdays.includes(day);
                    return (
                      <Button
                        key={day}
                        type="button"
                        size="sm"
                        variant={selected ? 'default' : 'outline'}
                        onClick={() =>
                          setWeekdays((current) =>
                            current.includes(day)
                              ? current.filter((item) => item !== day)
                              : [...current, day].sort()
                          )
                        }
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              )}
              {kind === 'month_day' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('sop.monthDayLabel')}</label>
                  <Input
                    inputMode="numeric"
                    value={monthDayText}
                    onChange={(e) => setMonthDayText(e.target.value)}
                    required
                  />
                </div>
              )}
              {kind === 'stage' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('sop.stageLabel')}</label>
                  <div className="flex flex-wrap gap-2">
                    {GROWER_STAGE_ORDER.map((option) => {
                      const selected = stage === option;
                      return (
                        <Button
                          key={option}
                          type="button"
                          size="sm"
                          variant={selected ? 'default' : 'outline'}
                          onClick={() => setStage(option)}
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
                      variant={stageEnter ? 'default' : 'outline'}
                      onClick={() => setStageEnter((value) => !value)}
                    >
                      {t('sop.scheduleStageEnter')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={stageExit ? 'default' : 'outline'}
                      onClick={() => setStageExit((value) => !value)}
                    >
                      {t('sop.scheduleStageExit')}
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('sop.dueTimeLabel')}</label>
                <Input
                  type="time"
                  value={localTime}
                  onChange={(e) => setLocalTime(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">{t('sop.dueTimeHint')}</p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={pending || !schedule()}>
                  {pending ? t('common.saving') : t('common.create')}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/sop">{t('common.cancel')}</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </AppShell>
    </>
  );
}

export default function SopNewPage() {
  return (
    <AppRouteReady>
      <SopNewBody />
    </AppRouteReady>
  );
}
