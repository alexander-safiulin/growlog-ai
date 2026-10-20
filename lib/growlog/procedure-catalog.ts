import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProcedureHit } from '@/lib/growlog/routine-match';

export async function loadApprovedProcedures(
  supabase: SupabaseClient,
  farmId: string
): Promise<ProcedureHit[]> {
  const [revisions, knowledge, thresholds] = await Promise.all([
    supabase
      .from('sop_revisions')
      .select('id, title, body_json, instructions_json, version')
      .eq('farm_id', farmId)
      .eq('status', 'approved')
      .order('effective_from', { ascending: false })
      .limit(30),
    supabase
      .from('knowledge_items')
      .select('id, title, body')
      .eq('farm_id', farmId)
      .eq('status', 'approved')
      .limit(30),
    supabase
      .from('playbook_thresholds')
      .select('id, metric_code, min_value, max_value, cycle_stage')
      .eq('farm_id', farmId)
      .eq('status', 'approved')
      .limit(40),
  ]);

  if (revisions.error) throw revisions.error;
  if (knowledge.error) throw knowledge.error;
  if (thresholds.error) throw thresholds.error;

  const hits: ProcedureHit[] = [];
  for (const row of revisions.data ?? []) {
    const body = JSON.stringify({
      body: row.body_json,
      instructions: row.instructions_json,
      version: row.version,
    });
    hits.push({
      id: row.id as string,
      sourceType: 'sop_revision',
      title: `${row.title as string} v${row.version as number}`,
      text: body.slice(0, 1500),
    });
  }
  for (const row of knowledge.data ?? []) {
    hits.push({
      id: row.id as string,
      sourceType: 'knowledge_item',
      title: row.title as string,
      text: String(row.body ?? '').slice(0, 1500),
    });
  }
  for (const row of thresholds.data ?? []) {
    hits.push({
      id: row.id as string,
      sourceType: 'playbook_threshold',
      title: row.metric_code as string,
      text: `stage=${row.cycle_stage ?? 'any'} min=${row.min_value ?? '—'} max=${row.max_value ?? '—'}`,
    });
  }
  return hits;
}

export function formatProcedureBlock(procedures: ProcedureHit[]): string {
  if (!procedures.length) return '';
  return procedures
    .slice(0, 20)
    .map((p) => `[${p.sourceType} id=${p.id}] ${p.title} · ${p.text.slice(0, 400)}`)
    .join('\n');
}
