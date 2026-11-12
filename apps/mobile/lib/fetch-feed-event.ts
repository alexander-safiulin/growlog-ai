import { presentFeedEvents, type EventRow } from '@growlog/domain';
import type { SupabaseClient } from '@supabase/supabase-js';

const EVENT_SELECT =
  'id, farm_id, cycle_id, scope_id, event_type, title, body, occurred_at, source_type, payload, created_at';

export async function fetchFeedEventById(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string; eventId: string },
): Promise<EventRow | null> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .eq('id', params.eventId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const presented = presentFeedEvents([data as EventRow]);
  return presented[0] ?? null;
}

export async function fetchMediaAssetsMeta(
  supabase: SupabaseClient,
  farmId: string,
  mediaAssetIds: string[],
): Promise<{
  paths: Record<string, string>;
  analysisStatus: Record<string, string | null>;
}> {
  if (!mediaAssetIds.length) return { paths: {}, analysisStatus: {} };
  const { data, error } = await supabase
    .from('media_assets')
    .select('id, storage_path, analysis_status')
    .eq('farm_id', farmId)
    .in('id', mediaAssetIds);
  if (error) throw error;
  const paths: Record<string, string> = {};
  const analysisStatus: Record<string, string | null> = {};
  for (const row of data ?? []) {
    const id = row.id as string;
    if (typeof row.storage_path === 'string' && row.storage_path) {
      paths[id] = row.storage_path;
    }
    analysisStatus[id] =
      typeof row.analysis_status === 'string' ? row.analysis_status : null;
  }
  return { paths, analysisStatus };
}
