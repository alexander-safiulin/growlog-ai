import type { SupabaseClient } from '@supabase/supabase-js';
import type { SopExecutionStatus, SopRunStatus } from '../types/sop';
import type { EventType } from '../types/domain';
import { canTransitionSopRun } from './sop-engine-pure';
import {
  assertCommitDrafts,
  instructionsJsonFromSteps,
  sanitizeSopImportDraft,
  type SopImportDefinitionDraft,
} from './sop-import-draft';
import { missingRequiredInputs, parseRequiredInputKeys } from './sop-required-inputs';

export async function createSopDefinitionWithAssignment(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string;
    title: string;
    description: string;
    localTime: string;
    appliesToScope: string;
  }
) {
  const { farmId, cycleId, scopeId, title, description, localTime, appliesToScope } = params;

  const { data: def, error: dErr } = await supabase
    .from('sop_definitions')
    .insert({
      farm_id: farmId,
      title: title.trim(),
      description: description.trim() || null,
      applies_to_scope: appliesToScope,
      instructions_json: {},
      required_inputs_after_execution: [],
    })
    .select()
    .single();
  if (dErr) throw dErr;

  const { data: tr, error: tErr } = await supabase
    .from('sop_triggers')
    .insert({
      farm_id: farmId,
      sop_definition_id: def.id,
      trigger_type: 'recurring_daily',
      trigger_config: { local_time: localTime },
      active: true,
    })
    .select()
    .single();
  if (tErr) throw tErr;

  const { data: asn, error: aErr } = await supabase
    .from('sop_assignments')
    .insert({
      farm_id: farmId,
      sop_definition_id: def.id,
      cycle_id: cycleId,
      scope_id: scopeId,
      assignment_status: 'active',
    })
    .select()
    .single();
  if (aErr) throw aErr;

  return { definition: def, trigger: tr, assignment: asn };
}

export async function commitSopDocumentImport(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string;
    sourceText: string;
    sourceTitle: string;
    sourceContentHash?: string | null;
    createdBy: string | null;
    drafts: SopImportDefinitionDraft[];
  }
) {
  const { farmId, cycleId, scopeId, sourceText, sourceTitle, createdBy, drafts } = params;
  if (!drafts.length) throw new Error('no_drafts');

  const sanitized = drafts
    .map((d) => sanitizeSopImportDraft(d))
    .filter((d): d is SopImportDefinitionDraft => d != null);
  if (!sanitized.length) throw new Error('validation_error');
  assertCommitDrafts(sanitized);

  const { data: doc, error: docErr } = await supabase
    .from('sop_documents')
    .insert({
      farm_id: farmId,
      title: sourceTitle.trim().slice(0, 200) || 'Imported SOP document',
      status: 'active',
      parsed_text: sourceText.slice(0, 500_000),
      created_by: createdBy,
      metadata: {
        intake: 'adr-016',
        content_hash: params.sourceContentHash ?? null,
      },
    })
    .select('id')
    .single();
  if (docErr) throw docErr;

  const documentId = doc.id as string;
  const created: Array<{ definitionId: string; title: string; triggerCount: number }> = [];
  const definitionIds: string[] = [];

  try {
    for (const draft of sanitized) {
      const { data: def, error: dErr } = await supabase
        .from('sop_definitions')
        .insert({
          farm_id: farmId,
          document_id: documentId,
          title: draft.title,
          description: draft.description,
          category: draft.category,
          criticality: draft.criticality,
          applies_to_scope: draft.applies_to_scope,
          severity_if_missed: draft.severity_if_missed,
          instructions_json: instructionsJsonFromSteps(draft.steps),
          required_inputs_after_execution: draft.required_inputs_after_execution,
          active: true,
        })
        .select('id')
        .single();
      if (dErr) throw dErr;
      const defId = def.id as string;
      definitionIds.push(defId);

      for (const tr of draft.triggers) {
        const { error: tErr } = await supabase.from('sop_triggers').insert({
          farm_id: farmId,
          sop_definition_id: defId,
          trigger_type: tr.trigger_type,
          trigger_config: tr.trigger_config,
          active: true,
        });
        if (tErr) throw tErr;
      }

      const { error: aErr } = await supabase.from('sop_assignments').insert({
        farm_id: farmId,
        sop_definition_id: defId,
        cycle_id: cycleId,
        scope_id: scopeId,
        assignment_status: 'active',
      });
      if (aErr) throw aErr;

      created.push({
        definitionId: defId,
        title: draft.title,
        triggerCount: draft.triggers.length,
      });
    }
  } catch (e) {
    if (definitionIds.length) {
      await supabase.from('sop_definitions').delete().in('id', definitionIds).eq('farm_id', farmId);
    }
    await supabase.from('sop_documents').delete().eq('id', documentId).eq('farm_id', farmId);
    throw e;
  }

  for (const defId of definitionIds) {
    const { error: jobErr } = await supabase.rpc('enqueue_background_job', {
      p_job_type: 'document.index',
      p_farm_id: farmId,
      p_priority: 'normal',
      p_cycle_id: cycleId,
      p_scope_id: scopeId,
      p_entity_type: 'sop_definition',
      p_entity_id: defId,
      p_dedup_key: `document.index:sop_definition:${defId}`,
      p_correlation_id: defId,
      p_payload_json: { doc_type: 'sop_definition', source_id: defId },
    });
    if (jobErr) throw jobErr;
  }

  return { documentId, created };
}

function eventTypeForExecution(status: SopExecutionStatus): EventType {
  if (status === 'skipped' || status === 'blocked') return 'sop_missed';
  return 'sop_executed';
}

function nextRunStatusAfterExecution(
  current: SopRunStatus,
  executionStatus: SopExecutionStatus,
  opts?: { partialIncomplete?: boolean }
): SopRunStatus {
  if (executionStatus === 'done') return 'completed';
  if (executionStatus === 'partially_done') {
    return opts?.partialIncomplete ? 'acknowledged' : 'completed';
  }
  if (executionStatus === 'delayed') return 'acknowledged';
  if (executionStatus === 'skipped') return 'skipped';
  if (executionStatus === 'blocked') return 'blocked';
  return current;
}

export async function executeSopRun(
  supabase: SupabaseClient,
  params: {
    runId: string;
    farmId: string;
    cycleId: string;
    scopeId: string;
    executionStatus: SopExecutionStatus;
    notes: string;
    userId: string | null;
    measuredValues?: Record<string, unknown>;
    evidenceJson?: Record<string, unknown>;
  }
) {
  const { runId, farmId, cycleId, scopeId, executionStatus, notes, userId } = params;
  const measuredValues = params.measuredValues ?? {};
  const evidenceJson = params.evidenceJson ?? {};

  const { data: run, error: runErr } = await supabase
    .from('sop_runs')
    .select('id, status, sop_definition_id, farm_id')
    .eq('id', runId)
    .eq('farm_id', farmId)
    .maybeSingle();
  if (runErr) throw runErr;
  if (!run) {
    throw new Error('Задача не найдена');
  }
  if (!['open', 'acknowledged', 'overdue'].includes(run.status)) {
    throw new Error('Этот SOP run уже закрыт');
  }

  const { data: def, error: defErr } = await supabase
    .from('sop_definitions')
    .select('required_inputs_after_execution')
    .eq('id', run.sop_definition_id)
    .single();
  if (defErr) throw defErr;

  const required = parseRequiredInputKeys(def?.required_inputs_after_execution);
  const miss =
    executionStatus === 'done' || executionStatus === 'partially_done'
      ? missingRequiredInputs(required, measuredValues, evidenceJson)
      : [];

  if (executionStatus === 'done' && miss.length > 0) {
    throw new Error(`Недостаточно обязательных полей: ${miss.join(', ')}`);
  }

  const partialIncomplete =
    executionStatus === 'partially_done' && required.length > 0 && miss.length > 0;

  const currentStatus = run.status as SopRunStatus;
  const nextStatus = nextRunStatusAfterExecution(currentStatus, executionStatus, { partialIncomplete });
  const delayedRepeat =
    executionStatus === 'delayed' && nextStatus === currentStatus && currentStatus === 'acknowledged';
  const partialStayAck =
    executionStatus === 'partially_done' &&
    nextStatus === currentStatus &&
    currentStatus === 'acknowledged' &&
    partialIncomplete;
  if (!delayedRepeat && !partialStayAck && !canTransitionSopRun(currentStatus, nextStatus)) {
    throw new Error('Недопустимый переход статуса SOP run');
  }

  const eventType = eventTypeForExecution(executionStatus);
  const body =
    notes.trim() ||
    `SOP: ${executionStatus.replace(/_/g, ' ')}`;

  const { data: ev, error: eErr } = await supabase
    .from('events')
    .insert({
      farm_id: farmId,
      cycle_id: cycleId,
      scope_id: scopeId,
      event_type: eventType,
      body,
      occurred_at: new Date().toISOString(),
      source_type: 'user_form',
      payload: {
        sop_run_id: runId,
        sop_definition_id: run.sop_definition_id,
        execution_status: executionStatus,
      },
      created_by: userId ?? null,
    })
    .select()
    .single();
  if (eErr) throw eErr;

  const { error: exErr } = await supabase.from('sop_executions').insert({
    farm_id: farmId,
    sop_run_id: runId,
    event_id: ev.id,
    scope_id: scopeId,
    executed_by: userId ?? null,
    execution_status: executionStatus,
    intent_status: executionStatus === 'delayed' ? 'will_do' : null,
    notes: notes.trim() || null,
    measured_values: measuredValues,
    evidence_json: evidenceJson,
    result_json: {},
  });
  if (exErr) throw exErr;

  const { error: uErr } = await supabase
    .from('sop_runs')
    .update({
      status: nextStatus,
      related_event_id: ev.id,
    })
    .eq('id', runId);
  if (uErr) throw uErr;

  const { error: jobErr } = await supabase.rpc('enqueue_standard_event_jobs_for_event', {
    p_event_id: ev.id,
  });
  if (jobErr) throw jobErr;

  return { event: ev };
}

export async function acknowledgeSopRun(
  supabase: SupabaseClient,
  params: { runId: string; farmId: string; cycleId: string; scopeId: string; userId: string | null }
) {
  const { data: run, error: runErr } = await supabase
    .from('sop_runs')
    .select('id, status, sop_definition_id')
    .eq('id', params.runId)
    .eq('farm_id', params.farmId)
    .maybeSingle();
  if (runErr) throw runErr;
  if (!run) {
    throw new Error('Задача не найдена');
  }
  const current = run.status as SopRunStatus;
  if (!canTransitionSopRun(current, 'acknowledged')) {
    throw new Error('Подтверждение недоступно для этого статуса');
  }

  const { data: ackEv, error: eErr } = await supabase
    .from('events')
    .insert({
      farm_id: params.farmId,
      cycle_id: params.cycleId,
      scope_id: params.scopeId,
      event_type: 'note',
      body: 'SOP: подтверждено к исполнению',
      occurred_at: new Date().toISOString(),
      source_type: 'user_form',
      payload: {
        sop_run_id: params.runId,
        sop_definition_id: run.sop_definition_id,
        kind: 'sop_acknowledgement',
      },
      created_by: params.userId,
    })
    .select('id')
    .single();
  if (eErr) throw eErr;

  const { error: jobErr } = await supabase.rpc('enqueue_standard_event_jobs_for_event', {
    p_event_id: ackEv.id,
  });
  if (jobErr) throw jobErr;

  const { error: uErr } = await supabase
    .from('sop_runs')
    .update({ status: 'acknowledged' })
    .eq('id', params.runId);
  if (uErr) throw uErr;
}
