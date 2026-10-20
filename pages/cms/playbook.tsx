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
  const [metric, setMetric] = useState('vpd_kpa');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [stage, setStage] = useState('veg');
  const [sopDefinitionId, setSopDefinitionId] = useState('');
  const [sopTitle, setSopTitle] = useState('');
  const [sopBody, setSopBody] = useState('');

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

  async function addThreshold() {
    if (!farmId || !metric.trim()) return;
    const { error } = await supabase.from('playbook_thresholds').insert({
      farm_id: farmId,
      metric_code: metric.trim(),
      cycle_stage: stage || null,
      min_value: minValue === '' ? null : Number(minValue),
      max_value: maxValue === '' ? null : Number(maxValue),
      status: 'draft',
      severity: 'medium',
    });
    setMessage(error ? error.message : 'Threshold draft saved');
  }

  async function proposeSop() {
    if (!farmId || !sopDefinitionId || !sopTitle || !sopBody) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch('/api/cms/sop-revision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action: 'propose',
        farmId,
        sopDefinitionId,
        title: sopTitle,
        bodyText: sopBody,
        reason: 'Playbook draft',
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? `Revision v${data.revision?.version}` : data.detail || data.error);
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

        <Card>
          <CardHeader>
            <CardTitle>Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <input className="w-full border rounded px-2 py-1" value={metric} onChange={(e) => setMetric(e.target.value)} />
            <div className="flex gap-2">
              <input className="w-full border rounded px-2 py-1" placeholder="min" value={minValue} onChange={(e) => setMinValue(e.target.value)} />
              <input className="w-full border rounded px-2 py-1" placeholder="max" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} />
              <input className="w-full border rounded px-2 py-1" value={stage} onChange={(e) => setStage(e.target.value)} />
            </div>
            <Button type="button" size="sm" onClick={() => void addThreshold()}>
              Save threshold draft
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SOP revision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <input className="w-full border rounded px-2 py-1" placeholder="sop_definitions UUID" value={sopDefinitionId} onChange={(e) => setSopDefinitionId(e.target.value)} />
            <input className="w-full border rounded px-2 py-1" placeholder="Title" value={sopTitle} onChange={(e) => setSopTitle(e.target.value)} />
            <textarea className="w-full border rounded px-2 py-1 min-h-[80px]" value={sopBody} onChange={(e) => setSopBody(e.target.value)} />
            <Button type="button" size="sm" onClick={() => void proposeSop()}>
              Propose revision
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
