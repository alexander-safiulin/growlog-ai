'use client';

import { AppShell } from '@/components/layout/AppShell';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCallback, useEffect, useState } from 'react';

type KnowledgeDraft = {
  id: string;
  title: string;
  body: string;
  status: string;
  metadata: Record<string, unknown> | null;
  source_media_asset_id: string | null;
};

type ThresholdDraft = {
  id: string;
  metric_code: string;
  min_value: number | null;
  max_value: number | null;
  cycle_stage: string | null;
  reason: string | null;
};

type SopDraft = {
  id: string;
  title: string;
  version: number;
  sop_definition_id: string;
  reason: string | null;
};

function draftKindLabel(meta: Record<string, unknown> | null): string {
  const k = meta?.import_draft_kind;
  return typeof k === 'string' ? k : 'playbook_rule';
}

export default function PlaybookPage() {
  const { t } = useTranslation();
  const { farmId, cycle, supabase } = useFarmContext();
  const [knowledge, setKnowledge] = useState<KnowledgeDraft[]>([]);
  const [thresholds, setThresholds] = useState<ThresholdDraft[]>([]);
  const [sopRevisions, setSopRevisions] = useState<SopDraft[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sopDefByItem, setSopDefByItem] = useState<Record<string, string>>({});
  const [schemaReady, setSchemaReady] = useState<boolean | null>(null);

  const reload = useCallback(async () => {
    if (!farmId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/cms/knowledge/import-drafts?farmId=${encodeURIComponent(farmId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.status === 503) {
      setSchemaReady(false);
      setMessage(t('cms.schemaNotReady'));
      return;
    }
    setSchemaReady(true);
    setKnowledge((data.knowledge as KnowledgeDraft[]) ?? []);
    setThresholds((data.thresholds as ThresholdDraft[]) ?? []);
    setSopRevisions((data.sopRevisions as SopDraft[]) ?? []);
  }, [farmId, supabase, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!farmId) return;
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/health/adr013', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSchemaReady(Boolean(data.ready));
    })();
  }, [farmId, supabase]);

  async function uploadFile(file: File) {
    if (!farmId) return;
    setUploading(true);
    setMessage(null);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const fileBase64 = btoa(binary);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('No session');

      const up = await fetch('/api/cms/knowledge/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          farmId,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileBase64,
          cycleId: cycle?.id ?? null,
        }),
      });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.detail || upData.error || 'upload failed');

      const imp = await fetch('/api/cms/knowledge/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          farmId,
          mediaAssetId: upData.mediaAssetId,
          cycleId: cycle?.id ?? null,
        }),
      });
      const impData = await imp.json();
      if (!imp.ok) throw new Error(impData.detail || impData.error || 'import failed');
      setMessage(t('cms.importQueued'));
      setTimeout(() => void reload(), 4000);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function approveKnowledge(id: string, meta: Record<string, unknown> | null) {
    if (!farmId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const kind = draftKindLabel(meta);
    const res = await fetch(
      kind === 'playbook_rule' || kind === 'cycle_stage'
        ? '/api/cms/knowledge/approve-import'
        : '/api/cms/knowledge/approve-import',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          farmId,
          knowledgeItemId: id,
          sopDefinitionId: sopDefByItem[id] || undefined,
          cycleId: cycle?.id ?? undefined,
        }),
      }
    );
    setMessage(res.ok ? 'Approved' : 'approve failed');
    void reload();
  }

  async function rejectKnowledge(id: string) {
    if (!farmId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    await fetch('/api/cms/knowledge/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ farmId, knowledgeItemId: id }),
    });
    void reload();
  }

  async function approveThreshold(id: string) {
    if (!farmId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch('/api/cms/playbook-threshold/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ farmId, thresholdId: id }),
    });
    setMessage(res.ok ? 'Threshold approved' : 'failed');
    void reload();
  }

  async function rejectThreshold(id: string) {
    if (!farmId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    await fetch('/api/cms/playbook-threshold/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ farmId, thresholdId: id }),
    });
    void reload();
  }

  async function approveSopRevision(id: string) {
    if (!farmId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch('/api/cms/sop-revision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'approve', farmId, revisionId: id }),
    });
    setMessage(res.ok ? 'SOP revision approved' : 'failed');
    void reload();
  }

  return (
    <AppShell title={t('cms.playbook')}>
      <div className="max-w-3xl space-y-4">
        {schemaReady === false ? (
          <p className="text-sm text-amber-800 dark:text-amber-100 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2">
            {t('cms.schemaNotReady')}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{t('cms.importPlaybook')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <input
              type="file"
              accept=".pdf,.txt,.md,text/plain,application/pdf"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadFile(f);
                e.target.value = '';
              }}
            />
            <p className="text-xs text-muted-foreground">PDF with text layer, .txt, or .md (max 8 MB)</p>
            {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('cms.draftReview')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {knowledge.map((d) => {
              const meta = d.metadata;
              const kind = draftKindLabel(meta);
              const excerpt =
                meta && typeof meta.excerpt === 'string' ? meta.excerpt : d.body.slice(0, 280);
              return (
                <div key={d.id} className="border rounded p-2 space-y-2">
                  <div className="font-medium">
                    [{kind}] {d.title}
                  </div>
                  <p className="text-muted-foreground text-xs italic">{excerpt}</p>
                  {kind === 'sop_procedure' ? (
                    <input
                      className="w-full border rounded px-2 py-1 text-xs"
                      placeholder={t('cms.sopDefinitionId')}
                      value={sopDefByItem[d.id] ?? ''}
                      onChange={(e) =>
                        setSopDefByItem((prev) => ({ ...prev, [d.id]: e.target.value }))
                      }
                    />
                  ) : null}
                  <div className="flex gap-2">
                    <Button size="sm" type="button" onClick={() => void approveKnowledge(d.id, meta)}>
                      {t('cms.approveDraft')}
                    </Button>
                    <Button size="sm" variant="ghost" type="button" onClick={() => void rejectKnowledge(d.id)}>
                      {t('cms.rejectDraft')}
                    </Button>
                  </div>
                </div>
              );
            })}

            {thresholds.map((th) => (
              <div key={th.id} className="border rounded p-2 space-y-1">
                <div className="font-medium">
                  [playbook_threshold] {th.metric_code}{' '}
                  {th.min_value != null || th.max_value != null
                    ? `(${th.min_value ?? '—'} … ${th.max_value ?? '—'})`
                    : ''}
                  {th.cycle_stage ? ` · ${th.cycle_stage}` : ''}
                </div>
                {th.reason ? <p className="text-xs text-muted-foreground">{th.reason}</p> : null}
                <div className="flex gap-2">
                  <Button size="sm" type="button" onClick={() => void approveThreshold(th.id)}>
                    {t('cms.approveDraft')}
                  </Button>
                  <Button size="sm" variant="ghost" type="button" onClick={() => void rejectThreshold(th.id)}>
                    {t('cms.rejectDraft')}
                  </Button>
                </div>
              </div>
            ))}

            {sopRevisions.map((s) => (
              <div key={s.id} className="border rounded p-2 space-y-1">
                <div className="font-medium">
                  [sop_revision] v{s.version} {s.title}
                </div>
                {s.reason ? <p className="text-xs text-muted-foreground">{s.reason}</p> : null}
                <Button size="sm" type="button" onClick={() => void approveSopRevision(s.id)}>
                  {t('cms.approveDraft')}
                </Button>
              </div>
            ))}

            {!knowledge.length && !thresholds.length && !sopRevisions.length ? (
              <p className="text-muted-foreground">No import drafts yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
