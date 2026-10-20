'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import type { HandoverPack } from '@/lib/growlog/handover-queries';

export default function HandoverPage() {
  const { t } = useTranslation();
  const { farmId, cycle, supabase } = useFarmContext();
  const [pack, setPack] = useState<(HandoverPack & { today?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!farmId) return;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const q = new URLSearchParams({ farmId });
      if (cycle?.id) q.set('cycleId', cycle.id);
      const res = await fetch(`/api/cms/handover?${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || 'failed');
        return;
      }
      setPack(data);
    })();
  }, [farmId, cycle?.id, supabase]);

  return (
    <AppShell title={t('cms.handover')}>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {!pack ? (
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      ) : (
        <div className="space-y-4 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>{t('cms.autonomyScore')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              Score: {pack.autonomy.score}/100 · overdue SOP: {pack.autonomy.overdueSopRuns} ·
              critical deviations: {pack.autonomy.openCriticalDeviations}
            </CardContent>
          </Card>

          <HandoverSection title="1. Active batches" items={pack.activeBatches.map((b) => `${b.name} (${b.batch_code ?? '—'}) · ${b.stage}`)} />
          <HandoverSection title="2–3. Work today / week" items={[...pack.workToday.map((w) => `Today: ${w.title} (${w.status})`), ...pack.workWeek.slice(0, 8).map((w) => `Week: ${w.title}`)]} />
          <HandoverSection title="4. Active SOPs" items={pack.activeSops.map((s) => `${s.title}${s.revision_version ? ` v${s.revision_version}` : ''}`)} />
          <HandoverSection title="5. Open deviations" items={pack.openDeviations.map((d) => `[${d.severity}] ${d.title}`)} />
          <HandoverSection title="6. Recent readings" items={pack.recentReadings.map((r) => `${r.metric_code}=${r.value} @ ${r.captured_at}`)} />
          <HandoverSection title="7. Escalation" items={pack.escalationContacts.map((e) => `${e.severity} → ${e.role}`)} />
          <HandoverSection title="Equipment" items={pack.equipmentAttention.map((e) => `${e.name} due ${e.next_service_due ?? '—'}`)} />
        </div>
      )}
    </AppShell>
  );
}

function HandoverSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <ul className="list-disc pl-5 text-sm space-y-1">
            {items.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
