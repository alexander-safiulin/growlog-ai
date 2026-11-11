import type { SupabaseClient } from '@supabase/supabase-js';
import { hasLocalWorkspaceEntityId } from '../mobile/local-workspace';
import { DAILY_FOCUS_INSIGHT_TYPES } from './daily-focus-insights';

export type DailyFocusInsightRow = {
  id: string;
  title: string | null;
  body: string;
  insight_type: string;
  confidence: number | null;
  confidence_label: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type InsightGroundingRow = {
  source_type: string;
  source_id: string | null;
  excerpt: string | null;
};

export async function fetchDailyFocusInsights(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string; limit?: number }
): Promise<DailyFocusInsightRow[]> {
  if (hasLocalWorkspaceEntityId(params.farmId, params.cycleId)) return [];
  const { data, error } = await supabase
    .from('ai_insights')
    .select('id, title, body, insight_type, confidence, confidence_label, created_at, updated_at')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .in('insight_type', [...DAILY_FOCUS_INSIGHT_TYPES])
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 8);
  if (error) throw error;
  return (data ?? []) as DailyFocusInsightRow[];
}

export async function fetchInsightGrounding(
  supabase: SupabaseClient,
  insightId: string,
  limit = 8
): Promise<InsightGroundingRow[]> {
  const { data, error } = await supabase
    .from('insight_grounding')
    .select('source_type, source_id, excerpt')
    .eq('insight_id', insightId)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as InsightGroundingRow[];
}

/** Latest `daily_focus` insight whose created_at falls in [dayStartIso, dayEndIso]. */
export async function fetchTodayDailyFocusInsight(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    dayStartIso: string;
    dayEndIso: string;
  }
): Promise<DailyFocusInsightRow | null> {
  if (hasLocalWorkspaceEntityId(params.farmId, params.cycleId)) return null;
  const { data, error } = await supabase
    .from('ai_insights')
    .select('id, title, body, insight_type, confidence, confidence_label, created_at, updated_at')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .eq('insight_type', 'daily_focus')
    .gte('created_at', params.dayStartIso)
    .lte('created_at', params.dayEndIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as DailyFocusInsightRow | null) ?? null;
}

/** Other insight cards for the same farm day (risk, anomaly, …), excluding daily_focus. */
export async function fetchTodaySupplementalInsights(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    dayStartIso: string;
    dayEndIso: string;
    limit?: number;
  }
): Promise<DailyFocusInsightRow[]> {
  if (hasLocalWorkspaceEntityId(params.farmId, params.cycleId)) return [];
  const types = DAILY_FOCUS_INSIGHT_TYPES.filter((t) => t !== 'daily_focus');
  const { data, error } = await supabase
    .from('ai_insights')
    .select('id, title, body, insight_type, confidence, confidence_label, created_at, updated_at')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .in('insight_type', [...types])
    .gte('created_at', params.dayStartIso)
    .lte('created_at', params.dayEndIso)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 6);
  if (error) throw error;
  return (data ?? []) as DailyFocusInsightRow[];
}

export async function fetchOpenSopRunsMaxUpdatedAt(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string }
): Promise<string | null> {
  if (hasLocalWorkspaceEntityId(params.farmId, params.cycleId)) return null;
  const { data, error } = await supabase
    .from('sop_runs')
    .select('updated_at')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .in('status', ['open', 'acknowledged', 'overdue'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const row = data as { updated_at?: string } | null;
  return row?.updated_at ?? null;
}
