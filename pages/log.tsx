'use client';

import { AppRouteReady } from '@/components/AppRouteReady';
import { AppShell } from '@/components/layout/AppShell';
import { PageHead } from '@/components/layout/PageHead';
import { VoiceLogFlow } from '@/components/voice/VoiceLogFlow';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { createLogEntry } from '@/lib/growlog/mutations';
import type { EventType, SourceType } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const QUICK_TYPES: EventType[] = [
  'note',
  'observation',
  'action_taken',
  'watering',
  'feeding',
  'issue_detected',
];

function LogForm() {
  const { t } = useTranslation();
  const { supabase, farmId, cycle, primaryScope, refetchAll, userId } = useFarmContext();
  const [eventType, setEventType] = useState<EventType>('note');
  const [body, setBody] = useState('');
  const [occurredAt, setOccurredAt] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!farmId || !cycle || !primaryScope) return;
    setError(null);
    setPending(true);
    try {
      const iso = new Date(occurredAt).toISOString();
      await createLogEntry(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope.id,
        eventType,
        body,
        occurredAt: iso,
        sourceType: 'user_form' as SourceType,
        createdBy: userId,
      });
      setBody('');
      await refetchAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('log.saveFailed'));
    } finally {
      setPending(false);
    }
  }

  if (!cycle || !primaryScope) {
    return (
      <div className="rounded-xl border border-dashed border-grow-leaf/25 bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
        {t('log.needOnboarding')}
      </div>
    );
  }

  return (
    <Card className="border-grow-leaf/15 shadow-md">
      <CardHeader>
        <CardTitle>{t('log.textTitle')}</CardTitle>
        <CardDescription>{t('log.textDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <Field label={t('log.eventType')}>
            <NativeSelect
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
            >
              {QUICK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t('common.text')}>
            <textarea
              className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              placeholder={t('log.bodyPlaceholder')}
            />
          </Field>
          <Field label={t('common.whenLocal')}>
            <Input
              className="h-11 rounded-xl"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
            />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="min-h-11 w-full rounded-xl sm:w-auto" disabled={pending}>
            {pending ? t('common.saving') : t('log.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function LogTabs() {
  const { t } = useTranslation();
  const router = useRouter();
  const [mode, setMode] = useState<'text' | 'voice'>('text');

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.tab;
    if (q === 'voice') setMode('voice');
    else if (q === undefined || q === '') setMode('text');
  }, [router.isReady, router.query.tab]);

  function switchMode(next: 'text' | 'voice') {
    setMode(next);
    void router.replace(
      { pathname: '/log', query: next === 'voice' ? { tab: 'voice' } : {} },
      undefined,
      { shallow: true }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl border border-grow-leaf/15 bg-muted/50 p-1 shadow-sm">
        <button
          type="button"
          className={cn(
            'flex min-h-11 flex-1 items-center justify-center rounded-lg text-sm font-medium transition-colors',
            mode === 'text' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => switchMode('text')}
        >
          {t('common.text')}
        </button>
        <button
          type="button"
          className={cn(
            'flex min-h-11 flex-1 items-center justify-center rounded-lg text-sm font-medium transition-colors',
            mode === 'voice' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => switchMode('voice')}
        >
          {t('common.voice')}
        </button>
      </div>
      {mode === 'text' ? <LogForm /> : <VoiceLogFlow />}
    </div>
  );
}

function LogPageBody() {
  const { t } = useTranslation();
  return (
    <>
      <PageHead titleKey="titles.log" />
      <AppShell title={t('titles.log')}>
        <LogTabs />
      </AppShell>
    </>
  );
}

export default function LogPage() {
  return (
    <AppRouteReady>
      <LogPageBody />
    </AppRouteReady>
  );
}
