import type { SupabaseClient } from '@supabase/supabase-js';
import { proposeSopRevision } from '@growlog/domain';
import type { BackgroundJobRow } from '@/types/background-jobs';
import { classifyGrowerDocument } from '@/lib/growlog/knowledge-import-classifier';
import type { ClassifiedImportDraft } from '@/lib/growlog/knowledge-import-schema';
import { extractDocumentText } from '@/lib/growlog/document-text';
import { embedText } from '@/lib/growlog/embeddings';

function payloadStr(job: BackgroundJobRow, key: string): string | null {
  const v = job.payload_json?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export async function processKnowledgeImportJob(
  supabase: SupabaseClient,
  job: BackgroundJobRow
): Promise<Record<string, unknown>> {
  const mediaAssetId = payloadStr(job, 'media_asset_id') ?? job.entity_id;
  if (!mediaAssetId) throw new Error('knowledge.import: media_asset_id missing');

  const { data: asset, error: aErr } = await supabase
    .from('media_assets')
    .select('id, farm_id, storage_bucket, storage_path, mime_type, media_type, metadata')
    .eq('id', mediaAssetId)
    .eq('farm_id', job.farm_id)
    .maybeSingle();
  if (aErr) throw aErr;
  if (!asset) return { imported: false, reason: 'asset_not_found' };

  const parsedText =
    (asset.metadata as Record<string, unknown> | null)?.parsed_text ??
    (asset.metadata as Record<string, unknown> | null)?.extracted_text;
  let text = typeof parsedText === 'string' ? parsedText : '';

  if (!text.trim() && asset.storage_bucket && asset.storage_path) {
    const { data: file, error: dlErr } = await supabase.storage
      .from(asset.storage_bucket as string)
      .download(asset.storage_path as string);
    if (dlErr) throw dlErr;
    if (file) {
      const bytes = Buffer.from(await file.arrayBuffer());
      text = extractDocumentText(bytes, (asset.mime_type as string) || 'application/octet-stream');
    }
  }

  if (!text.trim()) {
    return { imported: false, reason: 'no_extractable_text' };
  }

  const cycleId = payloadStr(job, 'cycle_id');
  const uploadedBy = payloadStr(job, 'uploaded_by');

  const { data: sopDefs } = await supabase
    .from('sop_definitions')
    .select('id, title')
    .eq('farm_id', job.farm_id)
    .limit(80);
  const drafts = await classifyGrowerDocument(text, {
    sopDefinitions: (sopDefs ?? []).map((s) => ({
      id: s.id as string,
      title: (s.title as string) || 'SOP',
    })),
  });

  const { data: source } = await supabase
    .from('knowledge_sources')
    .select('id')
    .eq('farm_id', job.farm_id)
    .eq('slug', 'farm-playbook')
    .maybeSingle();

  let sourceId = source?.id as string | undefined;
  if (!sourceId) {
    const { data: created, error: sErr } = await supabase
      .from('knowledge_sources')
      .insert({
        farm_id: job.farm_id,
        slug: 'farm-playbook',
        title: 'Farm playbook',
        source_type: 'internal',
        is_global: false,
      })
      .select('id')
      .single();
    if (sErr) throw sErr;
    sourceId = created!.id as string;
  }

  const counts = { playbook_rule: 0, sop_procedure: 0, playbook_threshold: 0, cycle_stage: 0 };
  const knowledgeIds: string[] = [];
  const thresholdIds: string[] = [];
  const sopRevisionIds: string[] = [];

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i]!;
    const persisted = await persistImportDraft(supabase, {
      draft,
      index: i,
      farmId: job.farm_id,
      sourceId: sourceId!,
      mediaAssetId,
      jobId: job.id,
      cycleId,
      uploadedBy,
    });
    if (persisted.kind === 'playbook_rule' || persisted.kind === 'cycle_stage') {
      counts[persisted.kind]++;
      if (persisted.knowledgeItemId) knowledgeIds.push(persisted.knowledgeItemId);
    } else if (persisted.kind === 'playbook_threshold' && persisted.thresholdId) {
      counts.playbook_threshold++;
      thresholdIds.push(persisted.thresholdId);
    } else if (persisted.kind === 'sop_procedure') {
      counts.sop_procedure++;
      if (persisted.sopRevisionId) sopRevisionIds.push(persisted.sopRevisionId);
      if (persisted.knowledgeItemId) knowledgeIds.push(persisted.knowledgeItemId);
    }
  }

  return {
    imported: true,
    draft_count: drafts.length,
    counts,
    knowledge_ids: knowledgeIds,
    threshold_ids: thresholdIds,
    sop_revision_ids: sopRevisionIds,
  };
}

async function persistImportDraft(
  supabase: SupabaseClient,
  ctx: {
    draft: ClassifiedImportDraft;
    index: number;
    farmId: string;
    sourceId: string;
    mediaAssetId: string;
    jobId: string;
    cycleId: string | null;
    uploadedBy: string | null;
  }
): Promise<{
  kind: ClassifiedImportDraft['kind'];
  knowledgeItemId?: string;
  thresholdId?: string;
  sopRevisionId?: string;
}> {
  let { draft, index, farmId, sourceId, mediaAssetId, jobId, cycleId, uploadedBy } = ctx;
  if (draft.kind === 'cycle_stage' && !cycleId) {
    draft = { ...draft, kind: 'playbook_rule' };
  }
  const baseMeta = {
    import_job_id: jobId,
    import_draft_kind: draft.kind,
    excerpt: draft.excerpt,
    media_asset_id: mediaAssetId,
    cycle_id: cycleId,
  };

  if (draft.kind === 'playbook_threshold') {
    const metric = draft.metric_code?.trim() || 'vpd_kpa';
    const { data: row, error } = await supabase
      .from('playbook_thresholds')
      .insert({
        farm_id: farmId,
        metric_code: metric,
        cycle_stage: draft.cycle_stage ?? null,
        min_value: draft.min_value ?? null,
        max_value: draft.max_value ?? null,
        status: 'draft',
        severity: 'medium',
        reason: `${draft.title}: ${draft.excerpt.slice(0, 400)}`,
      })
      .select('id')
      .single();
    if (error) throw error;
    return { kind: draft.kind, thresholdId: row!.id as string };
  }

  if (draft.kind === 'sop_procedure' && draft.sop_definition_id && uploadedBy) {
    try {
      const rev = await proposeSopRevision(supabase, {
        farmId,
        sopDefinitionId: draft.sop_definition_id,
        title: draft.title,
        bodyJson: { text: draft.body },
        instructionsJson: draft.body
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        reason: `Import from document (${draft.excerpt.slice(0, 120)})`,
        proposedBy: uploadedBy,
      });
      return { kind: draft.kind, sopRevisionId: rev.id as string };
    } catch {
      // fall through to knowledge draft if SOP link invalid
    }
  }

  const slug = `import-${mediaAssetId.slice(0, 8)}-${index + 1}`;
  const { data: item, error: iErr } = await supabase
    .from('knowledge_items')
    .insert({
      source_id: sourceId,
      farm_id: farmId,
      slug,
      title: draft.title,
      body: draft.body,
      status: 'draft',
      source_media_asset_id: mediaAssetId,
      metadata: {
        ...baseMeta,
        sop_definition_id: draft.sop_definition_id ?? null,
        stage: draft.stage ?? null,
        planned_start: draft.planned_start ?? null,
        planned_end: draft.planned_end ?? null,
      },
    })
    .select('id')
    .single();
  if (iErr) throw iErr;
  const knowledgeItemId = item!.id as string;

  const emb = await embedText(draft.body);
  const docPayload = {
    farm_id: farmId,
    doc_type: 'knowledge_item',
    source_id: knowledgeItemId,
    title: draft.title.slice(0, 120),
    body: draft.body,
    metadata: { status: 'draft', import_draft_kind: draft.kind },
    ...(emb ? { embedding_vector: emb } : {}),
  };
  const { data: existingDoc } = await supabase
    .from('searchable_documents')
    .select('id')
    .eq('farm_id', farmId)
    .eq('doc_type', 'knowledge_item')
    .eq('source_id', knowledgeItemId)
    .maybeSingle();
  if (existingDoc?.id) {
    await supabase.from('searchable_documents').update(docPayload).eq('id', existingDoc.id);
  } else {
    await supabase.from('searchable_documents').insert(docPayload);
  }

  return { kind: draft.kind, knowledgeItemId };
}

export async function processCycleLessonsDraftJob(
  supabase: SupabaseClient,
  job: BackgroundJobRow
): Promise<Record<string, unknown>> {
  const cycleId = payloadStr(job, 'cycle_id') ?? job.entity_id;
  if (!cycleId) throw new Error('cycle.lessons.draft: cycle_id missing');

  const { data: cycle, error: cErr } = await supabase
    .from('grow_cycles')
    .select('id, farm_id, name, batch_code, stage, status')
    .eq('id', cycleId)
    .eq('farm_id', job.farm_id)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!cycle) return { drafted: false, reason: 'cycle_not_found' };

  const { data: events } = await supabase
    .from('events')
    .select('event_type, title, body, occurred_at')
    .eq('cycle_id', cycleId)
    .order('occurred_at', { ascending: false })
    .limit(40);

  const lines = (events ?? []).map((e) => {
    const when = typeof e.occurred_at === 'string' ? e.occurred_at.slice(0, 10) : '';
    const title = (e.title as string | null) || (e.event_type as string);
    const bodyText = typeof e.body === 'string' ? e.body.slice(0, 180) : '';
    return `- ${when} ${title}${bodyText ? `: ${bodyText}` : ''}`;
  });

  const body = [
    `Cycle "${cycle.name}" (${cycle.batch_code ?? 'no batch'}), stage ${cycle.stage}, status ${cycle.status}.`,
    `Facts from the latest ${events?.length ?? 0} events. Approve before this becomes cross-cycle memory.`,
    ...lines,
  ].join('\n');

  const { data: mem, error: mErr } = await supabase
    .from('grow_memory_items')
    .insert({
      farm_id: job.farm_id,
      cycle_id: cycleId,
      memory_type: 'lesson',
      title: `Lessons: ${cycle.name}`,
      body,
      status: 'draft',
      metadata: { job_id: job.id, auto: true },
    })
    .select('id')
    .single();
  if (mErr) throw mErr;

  const emb = await embedText(body);
  const memDoc = {
    farm_id: job.farm_id,
    cycle_id: cycleId,
    doc_type: 'grow_memory_item',
    source_id: mem!.id as string,
    title: `Lessons: ${cycle.name}`,
    body,
    metadata: { status: 'draft', memory_type: 'lesson' },
    ...(emb ? { embedding_vector: emb } : {}),
  };
  const { data: existingMemDoc } = await supabase
    .from('searchable_documents')
    .select('id')
    .eq('farm_id', job.farm_id)
    .eq('doc_type', 'grow_memory_item')
    .eq('source_id', mem!.id)
    .maybeSingle();
  if (existingMemDoc?.id) {
    await supabase.from('searchable_documents').update(memDoc).eq('id', existingMemDoc.id);
  } else {
    await supabase.from('searchable_documents').insert(memDoc);
  }

  return { drafted: true, memory_id: mem!.id };
}
