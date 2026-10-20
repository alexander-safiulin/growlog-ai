'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { Button } from '@/components/ui/button';
import type { ChatExtractionResult } from '@/lib/chat/extraction-schema';
import { useState } from 'react';

type Props = {
  message: string;
};

export function ChatLogExtract({ message }: Props) {
  const { farmId, cycle, primaryScope, supabase } = useFarmContext();
  const [draft, setDraft] = useState<ChatExtractionResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function extract() {
    setPending(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('No session');
      const res = await fetch('/api/assistant/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'extract failed');
      setDraft(data as ChatExtractionResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'extract failed');
    } finally {
      setPending(false);
    }
  }

  async function confirmSave() {
    if (!draft || !farmId || !cycle?.id || !primaryScope?.id) return;
    setPending(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('No session');
      const res = await fetch('/api/assistant/confirm-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          farmId,
          cycleId: cycle.id,
          scopeId: primaryScope.id,
          events: draft.events,
          readings: draft.readings,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'save failed');
      setSaved(true);
      setDraft(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'save failed');
    } finally {
      setPending(false);
    }
  }

  if (saved) {
    return <p className="text-xs text-muted-foreground mt-1">Saved to journal.</p>;
  }

  return (
    <div className="mt-1 space-y-1">
      {!draft ? (
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => void extract()}>
          {pending ? '…' : 'Extract to journal'}
        </Button>
      ) : (
        <div className="rounded border p-2 text-xs space-y-1 bg-muted/40">
          <p>
            {draft.events.length} event(s), {draft.readings.length} reading(s)
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={() => void confirmSave()}>
              Confirm save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
