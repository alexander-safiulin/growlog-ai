export type ImportDraftKind =
  | 'playbook_rule'
  | 'sop_procedure'
  | 'playbook_threshold'
  | 'cycle_stage';

export type ClassifiedImportDraft = {
  kind: ImportDraftKind;
  title: string;
  excerpt: string;
  body: string;
  metric_code?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  cycle_stage?: string | null;
  sop_definition_id?: string | null;
  stage?: string | null;
  planned_start?: string | null;
  planned_end?: string | null;
};

export function parseClassifiedImportJson(raw: string): ClassifiedImportDraft[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('invalid_classifier_json');
  }
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { drafts?: unknown }).drafts)
      ? (parsed as { drafts: unknown[] }).drafts
      : [];
  const out: ClassifiedImportDraft[] = [];
  const kinds = new Set<ImportDraftKind>([
    'playbook_rule',
    'sop_procedure',
    'playbook_threshold',
    'cycle_stage',
  ]);
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const kind = row.kind;
    if (typeof kind !== 'string' || !kinds.has(kind as ImportDraftKind)) continue;
    const title = typeof row.title === 'string' ? row.title.trim() : '';
    const excerpt = typeof row.excerpt === 'string' ? row.excerpt.trim() : '';
    const body = typeof row.body === 'string' ? row.body.trim() : excerpt;
    if (!title || !body) continue;
    out.push({
      kind: kind as ImportDraftKind,
      title: title.slice(0, 200),
      excerpt: excerpt.slice(0, 500) || body.slice(0, 500),
      body: body.slice(0, 8000),
      metric_code:
        typeof row.metric_code === 'string' ? row.metric_code.trim().slice(0, 64) : null,
      min_value: typeof row.min_value === 'number' ? row.min_value : null,
      max_value: typeof row.max_value === 'number' ? row.max_value : null,
      cycle_stage:
        typeof row.cycle_stage === 'string' ? row.cycle_stage.trim().slice(0, 32) : null,
      sop_definition_id:
        typeof row.sop_definition_id === 'string' ? row.sop_definition_id.trim() : null,
      stage: typeof row.stage === 'string' ? row.stage.trim().slice(0, 32) : null,
      planned_start:
        typeof row.planned_start === 'string' ? row.planned_start.slice(0, 10) : null,
      planned_end: typeof row.planned_end === 'string' ? row.planned_end.slice(0, 10) : null,
    });
  }
  return out.slice(0, 40);
}
