'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';

type StagePlan = {
  stage: string;
  planned_start: string | null;
  planned_end: string | null;
  notes: string | null;
};

type SopRun = {
  id: string;
  anchor_date: string | null;
  status: string;
  due_at: string | null;
};

export default function CalendarPage() {
  const { t } = useTranslation();
  const { farmId, cycle, supabase } = useFarmContext();
  const [plan, setPlan] = useState<StagePlan[]>([]);
  const [runs, setRuns] = useState<SopRun[]>([]);

  useEffect(() => {
    if (!farmId || !cycle?.id) return;
    void (async () => {
      const { data: stages } = await supabase
        .from('cycle_stage_plan')
        .select('stage, planned_start, planned_end, notes')
        .eq('farm_id', farmId)
        .eq('cycle_id', cycle.id)
        .order('planned_start', { ascending: true });
      setPlan((stages as StagePlan[]) ?? []);

      const { data: sopRuns } = await supabase
        .from('sop_runs')
        .select('id, anchor_date, status, due_at')
        .eq('farm_id', farmId)
        .eq('cycle_id', cycle.id)
        .order('anchor_date', { ascending: true })
        .limit(60);
      setRuns((sopRuns as SopRun[]) ?? []);
    })();
  }, [farmId, cycle?.id, supabase]);

  return (
    <AppShell title={t('cms.calendar')}>
      {!cycle ? (
        <p className="text-sm text-muted-foreground">{t('common.needActiveCycle')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Stage plan</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {plan.length === 0 ? (
                <p className="text-muted-foreground">No stage plan rows yet.</p>
              ) : (
                plan.map((p) => (
                  <div key={p.stage} className="border-b pb-2">
                    <strong>{p.stage}</strong>
                    <div>
                      {p.planned_start ?? '—'} → {p.planned_end ?? '—'}
                    </div>
                    {p.notes ? <div className="text-muted-foreground">{p.notes}</div> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>SOP runs</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1 max-h-96 overflow-y-auto">
              {runs.map((r) => (
                <div key={r.id}>
                  {r.anchor_date ?? '—'} · {r.status} · due {r.due_at ?? '—'}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
