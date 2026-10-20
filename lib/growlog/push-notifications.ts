import type { SupabaseClient } from '@supabase/supabase-js';

export type SopPushEventType = 'sop_due' | 'sop_overdue' | 'escalation';

export type ExpoPushMessage = {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data: {
    type: SopPushEventType;
    sopRunId: string;
    farmId: string;
    cycleId: string;
  };
};

export function buildSopPushMessages(params: {
  tokens: string[];
  sopRunId: string;
  farmId: string;
  cycleId: string;
  title: string;
  body: string;
  eventType: SopPushEventType;
}): ExpoPushMessage[] {
  return params.tokens.map((to) => ({
    to,
    sound: 'default' as const,
    title: params.title,
    body: params.body,
    data: {
      type: params.eventType,
      sopRunId: params.sopRunId,
      farmId: params.farmId,
      cycleId: params.cycleId,
    },
  }));
}

export async function sendExpoPushMessages(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`expo_push_failed: ${res.status} ${detail.slice(0, 200)}`);
    }
  }
}

export async function fetchPushTokensForFarmMembers(
  supabase: SupabaseClient,
  farmId: string
): Promise<string[]> {
  const { data: members, error: mErr } = await supabase
    .from('farm_users')
    .select('user_id')
    .eq('farm_id', farmId);
  if (mErr) throw mErr;
  const userIds = (members ?? []).map((m) => m.user_id as string);
  if (userIds.length === 0) return [];

  const { data: tokens, error: tErr } = await supabase
    .from('mobile_push_tokens')
    .select('expo_push_token')
    .in('user_id', userIds);
  if (tErr) throw tErr;

  const unique = new Set<string>();
  for (const row of tokens ?? []) {
    const t = row.expo_push_token as string;
    if (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[')) {
      unique.add(t);
    }
  }
  return [...unique];
}

type SopRunNotifyRow = {
  id: string;
  status: string;
  sop_definitions: { title: string } | { title: string }[] | null;
};

function sopTitleFromRow(row: SopRunNotifyRow): string {
  const d = row.sop_definitions;
  if (!d) return 'SOP';
  if (Array.isArray(d)) return d[0]?.title ?? 'SOP';
  return d.title ?? 'SOP';
}

export async function notifyFarmOverdueSopRuns(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string }
): Promise<{ sent: number }> {
  const tokens = await fetchPushTokensForFarmMembers(supabase, params.farmId);
  if (tokens.length === 0) return { sent: 0 };

  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: runs, error } = await supabase
    .from('sop_runs')
    .select('id, status, sop_definitions(title)')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .eq('status', 'overdue')
    .gte('updated_at', since);
  if (error) throw error;

  const messages: ExpoPushMessage[] = [];
  for (const run of (runs ?? []) as SopRunNotifyRow[]) {
    const title = sopTitleFromRow(run);
    messages.push(
      ...buildSopPushMessages({
        tokens,
        sopRunId: run.id,
        farmId: params.farmId,
        cycleId: params.cycleId,
        title: 'SOP overdue',
        body: `${title} is overdue`,
        eventType: 'sop_overdue',
      })
    );
  }

  await sendExpoPushMessages(messages);
  return { sent: messages.length };
}

export async function notifyEscalation(
  supabase: SupabaseClient,
  params: { farmId: string; title: string; body: string; severity?: string }
): Promise<{ sent: number }> {
  const { data: farm } = await supabase
    .from('farms')
    .select('settings')
    .eq('id', params.farmId)
    .maybeSingle();
  const settings = (farm?.settings as Record<string, unknown> | null) ?? {};
  const matrix = Array.isArray(settings.escalation_matrix)
    ? (settings.escalation_matrix as Array<{ severity: string; role: string; user_id?: string }>)
    : [
        { severity: 'critical', role: 'manager' },
        { severity: 'high', role: 'manager' },
      ];
  const severity = params.severity ?? 'high';
  const targets = matrix.filter((row) => row.severity === severity || row.severity === 'critical');
  const roles = new Set(targets.map((row) => row.role));
  const directIds = targets.map((row) => row.user_id).filter((id): id is string => !!id);

  const { data: members, error: mErr } = await supabase
    .from('farm_users')
    .select('user_id, role')
    .eq('farm_id', params.farmId);
  if (mErr) throw mErr;
  const userIds = (members ?? [])
    .filter((m) => directIds.includes(m.user_id as string) || roles.has(m.role as string))
    .map((m) => m.user_id as string);
  if (userIds.length === 0) return { sent: 0 };

  const { data: tokenRows, error: tErr } = await supabase
    .from('mobile_push_tokens')
    .select('expo_push_token')
    .in('user_id', userIds);
  if (tErr) throw tErr;
  const tokens = [
    ...new Set(
      (tokenRows ?? [])
        .map((row) => row.expo_push_token as string)
        .filter((t) => t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['))
    ),
  ];
  const messages: ExpoPushMessage[] = tokens.map((to) => ({
    to,
    sound: 'default',
    title: params.title,
    body: params.body,
    data: {
      type: 'escalation',
      sopRunId: params.farmId,
      farmId: params.farmId,
      cycleId: params.farmId,
    },
  }));
  await sendExpoPushMessages(messages);
  return { sent: messages.length };
}
