import type { SupabaseClient } from '@supabase/supabase-js';
import type { GrowCycle } from '@/types/database';
import type {
  CycleBriefBlock,
  CycleFeedingBriefItem,
  CycleLightBrief,
  CyclePlantBriefItem,
  EnvironmentalStatItem,
  GrowerJournalEventItem,
  SensorLatestByMetricItem,
  TimeWindowIso,
} from '@/types/retrieval-assembly';
import { summarizeSolutionSnapshotForRetrieval } from '@/lib/growlog/retrieval/solution-snapshot-summary';

const MAX_PLANTS = 40;
const MAX_FEEDINGS = 8;
const MAX_JOURNAL = 25;
const MAX_CYCLE_ENV_STATS = 84;
const MAX_LATEST_READINGS_SCAN = 180;

const JOURNAL_EXCLUDED_TYPES = new Set(['sensor_snapshot', 'conversation_turn', 'ai_analysis']);

function applyScopeOrUnscoped<T extends { eq: Function; or: Function }>(
  query: T,
  scopeId: string | null
): T {
  if (!scopeId) return query;
  return query.or(`scope_id.eq.${scopeId},scope_id.is.null`) as T;
}

function metricEmbed(
  raw: unknown
): { metric_code: string; name: string; unit?: string | null } | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    return first && typeof first === 'object'
      ? (first as { metric_code: string; name: string; unit?: string | null })
      : null;
  }
  if (typeof raw === 'object') {
    return raw as { metric_code: string; name: string; unit?: string | null };
  }
  return null;
}

function cycleStatWindow(cycle: GrowCycle, toIso: string): TimeWindowIso {
  const from = `${cycle.start_date.trim()}T00:00:00.000Z`;
  return { from, to: toIso };
}

function buildCultivarSummary(cycle: GrowCycle, plants: CyclePlantBriefItem[]): string | null {
  const names = new Set<string>();
  if (cycle.cultivar_name?.trim()) names.add(cycle.cultivar_name.trim());
  for (const p of plants) {
    if (p.cultivarName?.trim()) names.add(p.cultivarName.trim());
  }
  if (!names.size) return null;
  return [...names].join(', ');
}

export async function fetchCyclePlantsBrief(
  supabase: SupabaseClient,
  farmId: string,
  cycleId: string
): Promise<CyclePlantBriefItem[]> {
  const { data, error } = await supabase
    .from('plants')
    .select('id, plant_code, cultivar_name, status')
    .eq('farm_id', farmId)
    .eq('cycle_id', cycleId)
    .order('plant_code', { ascending: true })
    .limit(MAX_PLANTS);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as {
      id: string;
      plant_code: string;
      cultivar_name: string | null;
      status: string;
    };
    return {
      id: row.id,
      plantCode: row.plant_code,
      cultivarName: row.cultivar_name,
      status: row.status,
    };
  });
}

export async function fetchRecentFeedingBrief(
  supabase: SupabaseClient,
  params: { farmId: string; cycleId: string }
): Promise<CycleFeedingBriefItem[]> {
  let q = supabase
    .from('grow_cycle_feeding_entries')
    .select(
      `
        id,
        event_id,
        entry_kind,
        volume_ml,
        ph,
        ec_ms,
        solution_snapshot,
        events!inner ( occurred_at ),
        nutrient_recipes ( name )
      `
    )
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .order('created_at', { ascending: false })
    .limit(MAX_FEEDINGS);

  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }

  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    const ev = row.events as { occurred_at: string } | { occurred_at: string }[] | null;
    const occurredAt = Array.isArray(ev) ? ev[0]?.occurred_at : ev?.occurred_at;
    const recipe = row.nutrient_recipes as { name: string } | { name: string }[] | null;
    const recipeName = Array.isArray(recipe) ? recipe[0]?.name : recipe?.name;
    return {
      id: row.id as string,
      eventId: row.event_id as string,
      entryKind: row.entry_kind as 'watering' | 'feeding',
      occurredAt: occurredAt ?? new Date(0).toISOString(),
      volumeMl: Number(row.volume_ml),
      ph: row.ph != null ? Number(row.ph) : null,
      ecMs: row.ec_ms != null ? Number(row.ec_ms) : null,
      recipeName: recipeName ?? null,
      solutionSnapshotSummary: summarizeSolutionSnapshotForRetrieval(row.solution_snapshot),
    };
  });
}

export async function fetchGrowerJournalEvents(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string | null;
    window: TimeWindowIso;
  }
): Promise<GrowerJournalEventItem[]> {
  let q = supabase
    .from('events')
    .select('id, occurred_at, event_type, title, body')
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .gte('occurred_at', params.window.from)
    .lte('occurred_at', params.window.to)
    .neq('event_type', 'sensor_snapshot')
    .order('occurred_at', { ascending: false })
    .limit(MAX_JOURNAL * 2);

  q = applyScopeOrUnscoped(q, params.scopeId);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as {
    id: string;
    occurred_at: string;
    event_type: string;
    title: string | null;
    body: string | null;
  }[];

  return rows
    .filter((e) => !JOURNAL_EXCLUDED_TYPES.has(e.event_type))
    .slice(0, MAX_JOURNAL)
    .map((e) => ({
      id: e.id,
      occurredAt: e.occurred_at,
      eventType: e.event_type,
      title: e.title,
      body: e.body && e.body.length > 420 ? `${e.body.slice(0, 420)}…` : e.body,
    }));
}

export async function fetchEnvironmentalDailyStatsForCycle(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string | null;
    window: TimeWindowIso;
  }
): Promise<EnvironmentalStatItem[]> {
  const fromD = params.window.from.slice(0, 10);
  const toD = params.window.to.slice(0, 10);

  let q = supabase
    .from('environmental_daily_stats')
    .select(
      'id, stat_date, min_value, max_value, avg_value, reading_count, metric_id, sensor_metrics(metric_code, name, unit)'
    )
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .gte('stat_date', fromD)
    .lte('stat_date', toD)
    .order('stat_date', { ascending: false })
    .limit(MAX_CYCLE_ENV_STATS);

  q = applyScopeOrUnscoped(q, params.scopeId);

  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }

  return (data ?? []).map((r) => {
    const raw = r as Record<string, unknown>;
    const sm = metricEmbed(raw.sensor_metrics);
    return {
      id: raw.id as string,
      statDate: raw.stat_date as string,
      metricCode: sm?.metric_code ?? 'unknown',
      metricName: sm?.name ?? 'metric',
      minValue: Number(raw.min_value),
      maxValue: Number(raw.max_value),
      avgValue: Number(raw.avg_value),
      readingCount: raw.reading_count as number,
      unit: sm?.unit ?? null,
    };
  });
}

export async function fetchSensorLatestByMetric(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string | null;
  }
): Promise<SensorLatestByMetricItem[]> {
  let q = supabase
    .from('sensor_readings')
    .select(
      `
        captured_at,
        value_numeric,
        unit,
        sensor_metrics ( metric_code, name )
      `
    )
    .eq('farm_id', params.farmId)
    .eq('cycle_id', params.cycleId)
    .order('captured_at', { ascending: false })
    .limit(MAX_LATEST_READINGS_SCAN);

  q = applyScopeOrUnscoped(q, params.scopeId);

  const { data, error } = await q;
  if (error) throw error;

  const seen = new Set<string>();
  const out: SensorLatestByMetricItem[] = [];
  for (const r of data ?? []) {
    const row = r as {
      captured_at: string;
      value_numeric: number;
      unit: string | null;
      sensor_metrics:
        | { metric_code: string; name: string }
        | { metric_code: string; name: string }[]
        | null;
    };
    const metric = metricEmbed(row.sensor_metrics);
    const code = metric?.metric_code ?? 'unknown';
    if (seen.has(code)) continue;
    seen.add(code);
    out.push({
      metricCode: code,
      metricName: metric?.name ?? 'metric',
      valueNumeric: Number(row.value_numeric),
      unit: row.unit,
      capturedAt: row.captured_at,
    });
  }
  return out;
}

export function cycleLightFromGrowCycle(cycle: GrowCycle): CycleLightBrief {
  return {
    lightHoursOn: cycle.light_hours_on,
    lightHoursOff: cycle.light_hours_off,
    lightsOnAt: cycle.lights_on_at,
  };
}

export async function fetchCycleBrief(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string | null;
    cycle: GrowCycle;
    assembledToIso: string;
  }
): Promise<CycleBriefBlock> {
  const statWindow = cycleStatWindow(params.cycle, params.assembledToIso);

  const [plants, recentFeedings, growerJournalEvents, sensorDailyStats, sensorLatestByMetric] =
    await Promise.all([
      fetchCyclePlantsBrief(supabase, params.farmId, params.cycleId),
      fetchRecentFeedingBrief(supabase, {
        farmId: params.farmId,
        cycleId: params.cycleId,
      }),
      fetchGrowerJournalEvents(supabase, {
        farmId: params.farmId,
        cycleId: params.cycleId,
        scopeId: params.scopeId,
        window: statWindow,
      }),
      fetchEnvironmentalDailyStatsForCycle(supabase, {
        farmId: params.farmId,
        cycleId: params.cycleId,
        scopeId: params.scopeId,
        window: statWindow,
      }),
      fetchSensorLatestByMetric(supabase, {
        farmId: params.farmId,
        cycleId: params.cycleId,
        scopeId: params.scopeId,
      }),
    ]);

  const plantCount =
    plants.length > 0 ? plants.length : params.cycle.plant_count ?? 0;

  return {
    cultivarSummary: buildCultivarSummary(params.cycle, plants),
    plantCount,
    plants,
    light: cycleLightFromGrowCycle(params.cycle),
    recentFeedings,
    growerJournalEvents,
    sensorDailyStats,
    sensorLatestByMetric,
  };
}
