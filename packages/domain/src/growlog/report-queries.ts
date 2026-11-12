import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReportRow } from '../types/report';
import { parseEditorLayer } from './grow-report/editor-layer';

export async function fetchReportsForFarm(
  supabase: SupabaseClient,
  farmId: string,
  limit = 40
): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as ReportRow[];
}

export async function fetchReportById(
  supabase: SupabaseClient,
  farmId: string,
  reportId: string
): Promise<ReportRow | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('farm_id', farmId)
    .eq('id', reportId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ReportRow) ?? null;
}

/** RLS-scoped editor save (mobile-first; same rules as PUT /api/reports/:id/editor). */
export async function saveReportEditorLayer(
  supabase: SupabaseClient,
  farmId: string,
  reportId: string,
  editorInput: unknown
): Promise<void> {
  const parsed = parseEditorLayer(editorInput);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  const { error } = await supabase
    .from('reports')
    .update({ editor_json: parsed.editor as unknown as Record<string, unknown> })
    .eq('id', reportId)
    .eq('farm_id', farmId);
  if (error) throw error;
}
