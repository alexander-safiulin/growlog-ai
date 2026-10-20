'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';

type DraftItem = { id: string; title: string; body: string; status: string };

export default function PlaybookPage() {
  const { t } = useTranslation();
  const { farmId, supabase } = useFarmContext();
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [mediaAssetId, setMediaAssetId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function reload() {
    if (!farmId) return;
    const { data } = await supabase
      .from('knowledge_items')
      .select('id, title, body, status')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false })
      .limit(30);
    setDrafts((data as DraftItem[]) ?? []);
  }

  useEffect(() => {
    void reload();
  }, [farmId]);

  async function enqueueImport() {
    if (!farmId || !mediaAssetId.trim()) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch('/api/cms/knowledge/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ farmId, mediaAssetId: mediaAssetId.trim() }),
    });
    const data = await res.json();
    setMessage(res.ok ? 'Import job queued' : data.error || 'failed');
    void reload();
  }

  async function approve(id: string) {
    if (!farmId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch('/api/cms/knowledge/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ farmId, knowledgeItemId: id }),
    });
    setMessage(res.ok ? 'Approved' : 'approve failed');
    void reload();
  }

  return (
    <AppShell title={t('cms.playbook')}>
      <div className="max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('cms.importPlaybook')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="media_assets UUID (upload first via Photos)"
              value={mediaAssetId}
              onChange={(e) => setMediaAssetId(e.target.value)}
            />
            <Button type="button" onClick={() => void enqueueImport()}>
              Queue import
            </Button>
            {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Knowledge items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {drafts.map((d) => (
              <div key={d.id} className="border rounded p-2">
                <div className="font-medium">
                  {d.title} · {d.status}
                </div>
                <p className="text-muted-foreground line-clamp-3">{d.body}</p>
                {d.status === 'draft' ? (
                  <Button size="sm" className="mt-2" type="button" onClick={() => void approve(d.id)}>
                    {t('cms.approveDraft')}
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
