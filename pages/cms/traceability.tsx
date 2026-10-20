'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

export default function TraceabilityPage() {
  const { t } = useTranslation();
  const { farmId, cycle, primaryScope, supabase } = useFarmContext();
  const [message, setMessage] = useState<string | null>(null);
  const [lotId, setLotId] = useState('');
  const [qty, setQty] = useState('');
  const [wet, setWet] = useState('');
  const [dry, setDry] = useState('');
  const [testType, setTestType] = useState('');
  const [revisionId, setRevisionId] = useState('');

  async function post(body: Record<string, unknown>) {
    if (!farmId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch('/api/cms/traceability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ farmId, cycleId: cycle?.id, scopeId: primaryScope?.id, ...body }),
    });
    const data = await res.json();
    setMessage(res.ok ? 'Saved' : data.detail || data.error || 'failed');
  }

  return (
    <AppShell title={t('cms.traceability')}>
      <div className="max-w-xl space-y-4 text-sm">
        {message ? <p className="text-muted-foreground">{message}</p> : null}
        <Card>
          <CardHeader>
            <CardTitle>Apply input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <input className="w-full border rounded px-2 py-1" placeholder="material lot UUID" value={lotId} onChange={(e) => setLotId(e.target.value)} />
            <input className="w-full border rounded px-2 py-1" placeholder="quantity" value={qty} onChange={(e) => setQty(e.target.value)} />
            <Button type="button" size="sm" onClick={() => void post({ action: 'apply_input', materialLotId: lotId, quantity: Number(qty) })}>
              Record feeding event
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Harvest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <input className="w-full border rounded px-2 py-1" placeholder="wet kg" value={wet} onChange={(e) => setWet(e.target.value)} />
            <input className="w-full border rounded px-2 py-1" placeholder="dry kg" value={dry} onChange={(e) => setDry(e.target.value)} />
            <Button
              type="button"
              size="sm"
              onClick={() =>
                void post({
                  action: 'harvest',
                  wetWeightKg: wet === '' ? null : Number(wet),
                  dryWeightKg: dry === '' ? null : Number(dry),
                })
              }
            >
              Save harvest
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>QC and training</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <input className="w-full border rounded px-2 py-1" placeholder="test type" value={testType} onChange={(e) => setTestType(e.target.value)} />
            <Button type="button" size="sm" onClick={() => void post({ action: 'qc', testType, passed: true })}>
              Save QC pass
            </Button>
            <input className="w-full border rounded px-2 py-1" placeholder="SOP revision UUID" value={revisionId} onChange={(e) => setRevisionId(e.target.value)} />
            <Button type="button" size="sm" variant="outline" onClick={() => void post({ action: 'training_ack', sopRevisionId: revisionId })}>
              I read this SOP version
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
