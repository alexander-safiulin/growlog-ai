'use client';

import { AppRouteReady } from '@/components/AppRouteReady';
import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import {
  resolveManualSchedules,
  SopManualScheduleEditor,
  type SopManualScheduleFormState,
} from '@/components/sop/SopManualScheduleEditor';
import { createSopDefinitionWithAssignment } from '@/lib/growlog/sop-mutations';
import { clearSopMaterializeOnce, sopMaterializeScopeKey } from '@/lib/growlog/sop-open-runs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';

const initialSchedule: SopManualScheduleFormState = {
  kind: 'daily',
  localTime: '09:00',
  weekdays: [1],
  monthDayText: '1',
  stage: 'flower',
  stageEnter: true,
  stageExit: false,
};

function SopNewBody() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { supabase, farmId, cycle, primaryScope } = useFarmContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleForm, setScheduleForm] = useState<SopManualScheduleFormState>(initialSchedule);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const schedules = useMemo(() => resolveManualSchedules(scheduleForm), [scheduleForm]);
  const scheduleEditorLabels = useMemo(
    () => ({
      scheduleLabel: t('sop.scheduleLabel'),
      scheduleDaily: t('sop.scheduleDaily'),
      scheduleWeekdays: t('sop.scheduleWeekdays'),
      scheduleMonthDay: t('sop.scheduleMonthDay'),
      scheduleStageEnter: t('sop.scheduleStageEnter'),
      scheduleStageExit: t('sop.scheduleStageExit'),
      stageLabel: t('sop.stageLabel'),
      monthDayLabel: t('sop.monthDayLabel'),
      dueTimeLabel: t('sop.dueTimeLabel'),
      dueTimeHint: t('sop.dueTimeHint'),
      schedulePreviewTitle: t('sop.schedulePreviewTitle'),
      preview: {
        daily: (time: string) => t('sop.schedulePreviewDaily', { time }),
        weekdays: (days: string, time: string) => t('sop.schedulePreviewWeekdays', { days, time }),
        monthDay: (day: number, time: string) => t('sop.schedulePreviewMonthDay', { day, time }),
        stageEnter: (stage: string, time: string) => t('sop.schedulePreviewStageEnter', { stage, time }),
        stageExit: (stage: string, time: string) => t('sop.schedulePreviewStageExit', { stage, time }),
      },
    }),
    [t]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = schedules;
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
        appliesToScope: primaryScope.scope_type,
      });
      clearSopMaterializeOnce(sopMaterializeScopeKey(farmId, cycle.id));
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
              <SopManualScheduleEditor
                value={scheduleForm}
                onChange={setScheduleForm}
                locale={locale}
                labels={scheduleEditorLabels}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={pending || !schedules}>
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
