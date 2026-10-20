'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
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
  const { farmId, cycle, supabase, primaryScope } = useFarmContext();
  const [plan, setPlan] = useState<StagePlan[]>([]);
  const [runs, setRuns] = useState<SopRun[]>([]);
  const [stage, setStage] = useState('veg');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [manualDef, setManualDef] = useState('');

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

  async function saveStage() {
    if (!farmId || !cycle?.id || !stage) return;
    const { error } = await supabase.from('cycle_stage_plan').upsert(
      {
        farm_id: farmId,
        cycle_id: cycle.id,
        stage,
        planned_start: plannedStart || null,
        planned_end: plannedEnd || null,
      },
      { onConflict: 'cycle_id,stage' }
    );
    setMessage(error ? error.message : 'Stage plan saved');
  }

  async function closeCycle() {
    if (!farmId || !cycle?.id) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch('/api/cms/cycle/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ farmId, cycleId: cycle.id, status: 'harvested' }),
    });
    const data = await res.json();
    setMessage(res.ok ? 'Cycle closed, lesson draft queued' : data.detail || data.error);
  }

  async function startManual(definitionId: string) {
    if (!farmId || !cycle?.id || !primaryScope?.id) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch('/api/sop/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope.id,
        sopDefinitionId: definitionId,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? 'Manual SOP run created' : data.detail || data.error);
  }

  return (
    <AppShell title={t('cms.calendar')}>
      {!cycle ? (
        <p className="text-sm text-muted-foreground">{t('common.needActiveCycle')}</p>
      ) : (
        <>
        <div className="max-w-4xl space-y-3 mb-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <input className="border rounded px-2 py-1" value={stage} onChange={(e) => setStage(e.target.value)} />
            <input className="border rounded px-2 py-1" type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
            <input className="border rounded px-2 py-1" type="date" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} />
            <Button type="button" size="sm" onClick={() => void saveStage()}>
              Save stage
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void closeCycle()}>
              Close cycle
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="border rounded px-2 py-1 min-w-64"
              placeholder="SOP definition for today's checklist"
              value={manualDef}
              onChange={(e) => setManualDef(e.target.value)}
            />
            <Button type="button" size="sm" variant="outline" onClick={() => void startManual(manualDef.trim())}>
              Start manual SOP
            </Button>
          </div>
          <p className="text-muted-foreground">
            Open SOP runs are the daily and weekly checklist. stage_based and offset_based runs appear after materialize.
          </p>
          {message ? <p className="text-muted-foreground">{message}</p> : null}
        </div>
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
        </>
      )}
    </AppShell>
  );
}
