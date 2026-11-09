import type { SupabaseClient } from '@supabase/supabase-js';

function localHour(timezone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(at);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '0';
  return Number(hour);
}

function localDateKey(timezone: string, at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** Once per worker day-window: enqueue focus.refresh for active scopes around local morning. */
export async function enqueueMorningFocusRefreshJobs(
  supabase: SupabaseClient,
  at = new Date()
): Promise<{ enqueued: number }> {
  const { data: scopes, error } = await supabase
    .from('scopes')
    .select('id, farm_id, cycle_id, active, farms!inner(timezone)')
    .eq('active', true);
  if (error) throw error;

  let enqueued = 0;
  for (const row of scopes ?? []) {
    const scope = row as {
      id: string;
      farm_id: string;
      cycle_id: string | null;
      farms: { timezone?: string } | { timezone?: string }[];
    };
    const farmJoin = scope.farms;
    const tz = (Array.isArray(farmJoin) ? farmJoin[0] : farmJoin)?.timezone ?? 'UTC';
    const hour = localHour(tz, at);
    if (hour < 5 || hour > 9) continue;
    if (!scope.cycle_id) continue;

    const focusDate = localDateKey(tz, at);
    const dedupKey = `focus.refresh:${scope.id}:${focusDate}`;
    const { data: existing } = await supabase
      .from('background_jobs')
      .select('id')
      .eq('farm_id', scope.farm_id)
      .eq('dedup_key', dedupKey)
      .limit(1);
    if (existing?.length) continue;

    const { error: insErr } = await supabase.from('background_jobs').insert({
      job_type: 'focus.refresh',
      status: 'pending',
      priority: 'normal',
      farm_id: scope.farm_id,
      cycle_id: scope.cycle_id,
      scope_id: scope.id,
      entity_type: 'scope',
      entity_id: scope.id,
      scheduled_for: at.toISOString(),
      dedup_key: dedupKey,
      payload_json: { focus_date: focusDate },
    });
    if (insErr) throw insErr;
    enqueued += 1;
  }

  return { enqueued };
}
