import type { SupabaseClient } from '@supabase/supabase-js';
import type { BackgroundJobRow } from '@/types/background-jobs';
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

  const chunks = text
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter((c) => c.length > 40)
    .slice(0, 20);

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

  const draftIds: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const slug = `import-${mediaAssetId.slice(0, 8)}-${i + 1}`;
    const { data: item, error: iErr } = await supabase
      .from('knowledge_items')
      .insert({
        source_id: sourceId,
        farm_id: job.farm_id,
        slug,
        title: chunk.slice(0, 80),
        body: chunk,
        status: 'draft',
        source_media_asset_id: mediaAssetId,
        metadata: { import_job_id: job.id },
      })
      .select('id')
      .single();
    if (iErr) throw iErr;
    draftIds.push(item!.id as string);

    const emb = await embedText(chunk);
    const docPayload = {
      farm_id: job.farm_id,
      doc_type: 'knowledge_item',
      source_id: item!.id as string,
      title: chunk.slice(0, 120),
      body: chunk,
      metadata: { status: 'draft' },
      ...(emb ? { embedding_vector: emb } : {}),
    };
    const { data: existingDoc } = await supabase
      .from('searchable_documents')
      .select('id')
      .eq('farm_id', job.farm_id)
      .eq('doc_type', 'knowledge_item')
      .eq('source_id', item!.id)
      .maybeSingle();
    if (existingDoc?.id) {
      await supabase.from('searchable_documents').update(docPayload).eq('id', existingDoc.id);
    } else {
      await supabase.from('searchable_documents').insert(docPayload);
    }
  }

  return { imported: true, draft_count: draftIds.length, draft_ids: draftIds };
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
