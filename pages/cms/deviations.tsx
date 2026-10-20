'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
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

  useEffect(() => {
    if (!farmId) return;
    void supabase
      .from('deviations')
      .select('id, title, severity, status, corrective_action, detected_at')
      .eq('farm_id', farmId)
      .order('detected_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setRows((data as Deviation[]) ?? []));
  }, [farmId, supabase]);

  return (
    <AppShell title={t('cms.deviations')}>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Deviation &amp; CAPA log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
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
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
