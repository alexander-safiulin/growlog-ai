'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';

type Deviation = {
  id: string;
  title: string;
  severity: string;
  status: string;
  corrective_action: string | null;
  detected_at: string;
};

export default function DeviationsPage() {
  const { t } = useTranslation();
  const { farmId, supabase } = useFarmContext();
  const [rows, setRows] = useState<Deviation[]>([]);
  const [note, setNote] = useState('');

  function reload() {
    if (!farmId) return;
    void supabase
      .from('deviations')
      .select('id, title, severity, status, corrective_action, detected_at')
      .eq('farm_id', farmId)
      .order('detected_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setRows((data as Deviation[]) ?? []));
  }

  useEffect(() => {
    reload();
  }, [farmId, supabase]);

  async function closeDeviation(id: string) {
    if (!farmId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch('/api/cms/deviations/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        farmId,
        deviationId: id,
        correctiveAction: note || undefined,
      }),
    });
    if (!res.ok) return;
    setNote('');
    reload();
  }

  return (
    <AppShell title={t('cms.deviations')}>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Deviation &amp; CAPA log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <input
            className="w-full border rounded px-2 py-1"
            placeholder="Corrective action (optional, applied on close)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {rows.length === 0 ? (
            <p className="text-muted-foreground">No deviations recorded.</p>
          ) : (
            rows.map((d) => (
              <div key={d.id} className="border rounded p-2">
                <div className="font-medium">
                  [{d.severity}] {d.title} · {d.status}
                </div>
                <div className="text-muted-foreground text-xs">{d.detected_at}</div>
                {d.corrective_action ? <div>CAPA: {d.corrective_action}</div> : null}
                {d.status !== 'closed' ? (
                  <Button size="sm" className="mt-2" type="button" onClick={() => void closeDeviation(d.id)}>
                    {t('cms.closeDeviation')}
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
