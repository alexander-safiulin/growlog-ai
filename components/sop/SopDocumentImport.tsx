'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { sopImportErrorI18nKey } from '@/lib/growlog/sop-import-errors';
import {
  describeImportTriggerDisplay,
  getDailyLocalTimeForEdit,
  setDailyLocalTimeOnTriggers,
  stepsFromMultilineText,
  type SopImportDefinitionDraft,
  type SopImportTriggerDisplay,
} from '@growlog/domain/growlog/sop-import-draft';
import Link from 'next/link';
import { useCallback, useState } from 'react';

type ImportPhase = 'idle' | 'review' | 'success';

type PreviewState = {
  sourceText: string;
  sourceLabel: string;
  drafts: SopImportDefinitionDraft[];
  dropped_trigger_count: number;
  duplicateDocument?: boolean;
};

type CreatedSop = {
  definitionId: string;
  title: string;
  triggerCount: number;
};

type DraftRow = SopImportDefinitionDraft & {
  clientKey: string;
  selected: boolean;
  expanded: boolean;
  stepsText: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('read_failed'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('read_failed'));
    reader.readAsDataURL(file);
  });
}

function draftToRow(d: SopImportDefinitionDraft, i: number): DraftRow {
  return {
    ...d,
    clientKey: `${i}-${d.title.slice(0, 24)}`,
    selected: true,
    expanded: false,
    stepsText: d.steps.join('\n'),
  };
}

function formatTriggerLabel(
  t: (key: string, params?: Record<string, string>) => string,
  display: SopImportTriggerDisplay
): string {
  switch (display.kind) {
    case 'daily':
      return t('sop.importTriggerLabelDaily', { time: display.time });
    case 'interval':
      return t('sop.importTriggerLabelInterval', { days: display.days, time: display.time });
    case 'date':
      return t('sop.importTriggerLabelDate', { date: display.date });
    case 'stage':
      return t('sop.importTriggerLabelStage', { stage: display.stage });
    case 'offset':
      return t('sop.importTriggerLabelOffset', { days: display.days });
    case 'time':
      return t('sop.importTriggerLabelTime', { time: display.time });
  }
}

export function SopDocumentImport({ onCommitted }: { onCommitted?: () => void }) {
  const { t } = useTranslation();
  const { farmId, cycle, primaryScope, supabase } = useFarmContext();
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [paste, setPaste] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [created, setCreated] = useState<CreatedSop[]>([]);
  const [pendingPreview, setPendingPreview] = useState(false);
  const [pendingCommit, setPendingCommit] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [duplicateHint, setDuplicateHint] = useState(false);

  const canImport = !!farmId && !!cycle && !!primaryScope;

  const formatError = useCallback(
    (code: string) => t(sopImportErrorI18nKey(code)),
    [t]
  );

  const resetToIdle = useCallback(() => {
    setPhase('idle');
    setPreview(null);
    setRows([]);
    setCreated([]);
    setAllowDuplicate(false);
    setDuplicateHint(false);
    setError(null);
    setPaste('');
  }, []);

  async function authHeaders(): Promise<HeadersInit> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('unauthorized');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  function patchRow(clientKey: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.clientKey === clientKey ? { ...r, ...patch } : r)));
  }

  async function runPreview(body: Record<string, unknown>) {
    if (!farmId) return;
    setError(null);
    setCreated([]);
    setPendingPreview(true);
    setPreview(null);
    setRows([]);
    setPhase('idle');
    try {
      const res = await fetch('/api/sop/import-preview', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ farmId, ...body }),
      });
      const j = (await res.json()) as PreviewState & { error?: string };
      if (!res.ok) {
        throw new Error(j.error ?? 'preview_failed');
      }
      setDuplicateHint(!!j.duplicateDocument);
      if (!j.drafts?.length) {
        setError(t('sop.importNoDrafts'));
        setPreview({
          sourceText: j.sourceText,
          sourceLabel: j.sourceLabel,
          drafts: [],
          dropped_trigger_count: j.dropped_trigger_count ?? 0,
          duplicateDocument: j.duplicateDocument,
        });
        return;
      }
      setPreview({
        sourceText: j.sourceText,
        sourceLabel: j.sourceLabel,
        drafts: j.drafts,
        dropped_trigger_count: j.dropped_trigger_count ?? 0,
        duplicateDocument: j.duplicateDocument,
      });
      setRows(j.drafts.map((d, i) => draftToRow(d, i)));
      setPhase('review');
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : 'generic';
      setError(formatError(code));
    } finally {
      setPendingPreview(false);
    }
  }

  async function onPreviewPaste() {
    await runPreview({ text: paste });
  }

  async function onFiles(files: FileList | File[]) {
    if (pendingPreview) return;
    const file = files[0];
    if (!file) return;
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      await runPreview({
        fileBase64: base64,
        mimeType: file.type || 'application/octet-stream',
        fileName: file.name,
      });
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : 'generic';
      setError(formatError(code));
    }
  }

  function rowToDraft(row: DraftRow): SopImportDefinitionDraft {
    const steps = stepsFromMultilineText(row.stepsText);
    return {
      title: row.title.trim(),
      description: row.description?.trim() || null,
      category: row.category,
      criticality: row.criticality,
      applies_to_scope: row.applies_to_scope,
      severity_if_missed: row.severity_if_missed,
      steps: steps.length ? steps : row.steps,
      required_inputs_after_execution: row.required_inputs_after_execution,
      triggers: row.triggers,
      schedule_unparsed: row.schedule_unparsed,
    };
  }

  async function onCommit() {
    if (!farmId || !cycle || !primaryScope || !preview) return;
    const selected = rows.filter((r) => r.selected);
    if (!selected.length) {
      setError(t('sop.importNoDrafts'));
      return;
    }
    if (duplicateHint && !allowDuplicate) {
      setError(formatError('duplicate_document'));
      return;
    }
    setError(null);
    setPendingCommit(true);
    try {
      const res = await fetch('/api/sop/import-commit', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          farmId,
          cycleId: cycle.id,
          scopeId: primaryScope.id,
          sourceText: preview.sourceText,
          sourceTitle: preview.sourceLabel || 'Imported SOP',
          allowDuplicate,
          drafts: selected.map((row) => ({
            selected: true,
            draft: rowToDraft(row),
          })),
        }),
      });
      const j = (await res.json()) as {
        error?: string;
        created?: CreatedSop[];
      };
      if (!res.ok) throw new Error(j.error ?? 'commit_failed');
      setCreated(
        j.created ??
          selected.map((r) => ({
            definitionId: '',
            title: r.title,
            triggerCount: r.triggers.length,
          }))
      );
      setPhase('success');
      onCommitted?.();
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : 'generic';
      setError(formatError(code));
    } finally {
      setPendingCommit(false);
    }
  }

  const commitBlockedByDuplicate = duplicateHint && !allowDuplicate;
  const showUpload = phase === 'idle';

  function renderTriggerLabels(row: DraftRow) {
    if (!row.triggers.length) {
      return (
        <p className="text-xs text-amber-700 dark:text-amber-400 pl-6">
          {t('sop.importNoTriggersWarning')}
        </p>
      );
    }
    return (
      <ul className="text-xs text-muted-foreground pl-6 list-disc list-inside space-y-0.5">
        {row.triggers.map((tr, i) => {
          const display = describeImportTriggerDisplay(tr);
          if (!display) {
            return (
              <li key={i}>{t('sop.importTriggerCount', { count: '1' })}</li>
            );
          }
          return <li key={i}>{formatTriggerLabel(t, display)}</li>;
        })}
      </ul>
    );
  }

  if (!canImport) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">{t('sop.importTitle')}</CardTitle>
          <CardDescription>{t('sop.importNeedCycleScope')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (phase === 'success') {
    return (
      <Card className="border-green-600/30">
        <CardHeader>
          <CardTitle className="text-base">
            {t('sop.importSuccessTitle', { count: String(created.length) })}
          </CardTitle>
          <CardDescription>{t('sop.importDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm">
            {created.map((item) => (
              <li key={item.definitionId || item.title} className="rounded-md border border-border/80 px-3 py-2">
                <p className="font-medium">{item.title}</p>
                {item.triggerCount === 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    {t('sop.importSavedNoTriggers')}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="button" asChild>
              <Link href="/sop">{t('sop.importSuccessViewSop')}</Link>
            </Button>
            <Button type="button" variant="secondary" onClick={() => resetToIdle()}>
              {t('sop.importAnother')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {phase === 'review' ? t('sop.importReviewTitle') : t('sop.importTitle')}
        </CardTitle>
        <CardDescription>
          {phase === 'review' ? t('sop.importReviewDesc') : t('sop.importDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showUpload && (
          <>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={t('sop.importPastePlaceholder')}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={pendingPreview || paste.trim().length < 40}
                onClick={() => void onPreviewPaste()}
              >
                {pendingPreview ? t('sop.importPreviewing') : t('sop.importPreview')}
              </Button>
            </div>

            <div
              className={`rounded-lg border border-dashed px-4 py-8 text-center text-sm transition-colors ${
                dragOver ? 'border-primary bg-muted/40' : 'border-border text-muted-foreground'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void onFiles(e.dataTransfer.files);
              }}
            >
              <p>{t('sop.importDropHint')}</p>
              <label className="mt-2 inline-block cursor-pointer text-primary underline-offset-4 hover:underline">
                {t('common.add')}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.md,text/plain,application/pdf"
                  disabled={pendingPreview}
                  onChange={(e) => {
                    const f = e.target.files;
                    if (f?.length) void onFiles(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </>
        )}

        {phase === 'review' && (
          <Button type="button" variant="ghost" size="sm" onClick={() => resetToIdle()}>
            {t('sop.importBackToUpload')}
          </Button>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {preview && preview.dropped_trigger_count > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t('sop.importDroppedTriggers', {
              count: String(preview.dropped_trigger_count),
            })}
          </p>
        )}

        {duplicateHint && rows.length > 0 && phase === 'review' && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm space-y-2">
            <p>{t('sop.importDuplicateWarning')}</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowDuplicate}
                onChange={(e) => setAllowDuplicate(e.target.checked)}
              />
              {t('sop.importAllowDuplicate')}
            </label>
          </div>
        )}

        {phase === 'review' && rows.length > 0 && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {rows.length} {t('sop.definitionsTitle').toLowerCase()}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRows((prev) => prev.map((r) => ({ ...r, selected: true })))}
              >
                {t('sop.importSelectAll')}
              </Button>
            </div>
            <ul className="space-y-3">
              {rows.map((row) => {
                const hasDaily = row.triggers.some((tr) => tr.trigger_type === 'recurring_daily');
                const dailyTime = getDailyLocalTimeForEdit(row.triggers);
                return (
                  <li
                    key={row.clientKey}
                    className="rounded-lg border border-border/80 px-3 py-2 text-sm space-y-2"
                  >
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={row.selected}
                        onChange={(e) =>
                          patchRow(row.clientKey, { selected: e.target.checked })
                        }
                      />
                      <span className="flex-1">
                        <span className="font-medium">{row.title}</span>
                        {row.description && !row.expanded && (
                          <span className="block text-muted-foreground text-xs mt-0.5 line-clamp-2">
                            {row.description}
                          </span>
                        )}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => patchRow(row.clientKey, { expanded: !row.expanded })}
                      >
                        {row.expanded ? t('sop.importCollapse') : t('sop.importExpand')}
                      </Button>
                    </label>

                    {row.expanded && (
                      <div className="pl-6 space-y-3 border-l border-border ml-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{t('sop.titleLabel')}</label>
                          <Input
                            value={row.title}
                            onChange={(e) => patchRow(row.clientKey, { title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{t('sop.descriptionLabel')}</label>
                          <textarea
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                            value={row.description ?? ''}
                            onChange={(e) =>
                              patchRow(row.clientKey, {
                                description: e.target.value || null,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{t('sop.importStepsLabel')}</label>
                          <textarea
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-mono"
                            value={row.stepsText}
                            onChange={(e) =>
                              patchRow(row.clientKey, { stepsText: e.target.value })
                            }
                          />
                        </div>
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium">
                              {t('sop.importDailyTimeLabel')}
                            </label>
                            <Input
                              type="time"
                              value={dailyTime}
                              onChange={(e) => {
                                const next = setDailyLocalTimeOnTriggers(
                                  row.triggers,
                                  e.target.value
                                );
                                patchRow(row.clientKey, { triggers: next });
                              }}
                            />
                          </div>
                          {!hasDaily && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const next = setDailyLocalTimeOnTriggers(row.triggers, '09:00');
                                patchRow(row.clientKey, { triggers: next });
                              }}
                            >
                              {t('sop.importAddDailyTrigger')}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {!row.expanded && (
                      <p className="text-xs text-muted-foreground pl-6">
                        {t('sop.importSteps')}: {row.steps.slice(0, 3).join(' · ')}
                        {row.steps.length > 3 ? '…' : ''}
                      </p>
                    )}
                    {renderTriggerLabels(row)}
                    {row.schedule_unparsed.length > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 pl-6">
                        {t('sop.importScheduleUnparsed')}: {row.schedule_unparsed.join('; ')}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={pendingCommit || commitBlockedByDuplicate}
                onClick={() => void onCommit()}
              >
                {pendingCommit ? t('sop.importCommitting') : t('sop.importConfirmSave')}
              </Button>
              <Button type="button" variant="outline" onClick={() => resetToIdle()}>
                {t('sop.importBackToUpload')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
