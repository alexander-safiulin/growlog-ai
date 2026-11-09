import type { AnswerAssemblyContext } from '@/types/retrieval-assembly';
import { assembleAnswerContext } from '@/lib/growlog/retrieval/assemble-answer-context';
import { applyPromptCharBudget } from '@/lib/growlog/retrieval/context-manifest';
import type { SupabaseClient } from '@supabase/supabase-js';

export type { AnswerAssemblyContext as AssembledRetrievalContext } from '@/types/retrieval-assembly';

export { assembleAnswerContext };

/** @deprecated Используйте assembleAnswerContext с queryText и userId (ADR-003). */
export async function assembleRetrievalContext(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string | null;
    scopeId?: string | null;
    queryText?: string;
    userId?: string;
  }
) {
  return assembleAnswerContext(supabase, {
    farmId: params.farmId,
    userId: params.userId ?? '00000000-0000-0000-0000-000000000000',
    queryText: params.queryText ?? '',
    cycleId: params.cycleId,
    scopeId: params.scopeId ?? null,
  });
}

function lineBlock(title: string, lines: string[]): string[] {
  const out: string[] = ['', `--- ${title} ---`];
  if (!lines.length) {
    out.push('(пусто)');
  } else {
    out.push(...lines);
  }
  return out;
}

/**
 * Нормализованный контекст ADR-003 → текст для system/user prompt (не сырые SQL rows).
 */
export function formatRetrievalContextForPrompt(ctx: AnswerAssemblyContext): string {
  const lines: string[] = [];
  const sc = ctx.scope;

  lines.push(`Часовой пояс фермы: ${ctx.farmTimezone}`);
  lines.push(`Сбор контекста (UTC): ${ctx.assembledAtIso}`);
  lines.push(
    `retrieval_session: user_id=${ctx.retrievalSession.userId} · conversation_id=${ctx.retrievalSession.conversationId ?? 'null'}`
  );
  lines.push(
    `Intent: ${ctx.request.intentType}` +
      (ctx.request.subIntents.length
        ? ` · sub: ${ctx.request.subIntents.join(', ')}`
        : '') +
      ` · diagnostic_risk: ${ctx.request.diagnosticRiskLevel}`
  );
  lines.push(
    `Окно времени: ${sc.timeWindow.from} → ${sc.timeWindow.to} · source=${sc.timeWindowSource} · needs_clarification=${sc.needsClarification}`
  );
  if (ctx.scope.clarificationHint) {
    lines.push(`Подсказка scope: ${ctx.scope.clarificationHint}`);
  }

  lines.push('');
  lines.push('--- scope ---');
  lines.push(`farm_id=${sc.farmId}`);
  lines.push(`cycle_id=${sc.cycleId ?? 'null'}`);
  lines.push(`scope_id=${sc.scopeId ?? 'null'}`);
  if (ctx.scopeUi) {
    lines.push(
      `scope_ui: «${ctx.scopeUi.displayName}» (id=${ctx.scopeUi.id})`
    );
  }

  lines.push('');
  lines.push('--- current_state ---');
  lines.push(
    ctx.currentState.summary ??
      '(цикл не передан — только ферма/общие данные)'
  );
  if (ctx.currentState.cycleStage) {
    lines.push(`stage=${ctx.currentState.cycleStage} · status=${ctx.currentState.cycleStatus ?? '—'}`);
  }

  if (ctx.farmProfile) {
    const fp = ctx.farmProfile;
    lines.push('');
    lines.push('--- farm_profile ---');
    lines.push(`${fp.name} · ${[fp.city, fp.country].filter(Boolean).join(', ') || '—'} · tz=${fp.timezone}`);
    lines.push(
      `scopes: ${fp.scopes
        .slice(0, 12)
        .map((s) => `${s.displayName}(${s.id})`)
        .join('; ')}`
    );
    lines.push(
      `active_cycles: ${fp.activeCycles
        .map((c) => `${c.name}/${c.stage}`)
        .join('; ')}`
    );
  }

  if (ctx.feedingTrend7d) {
    const t = ctx.feedingTrend7d;
    lines.push('');
    lines.push('--- feeding_trend_7d ---');
    lines.push(
      `entries=${t.entryCount} vol_ml=${t.totalVolumeMl} avg_ph=${t.avgPh ?? '—'} avg_ec=${t.avgEcMs ?? '—'} ph_range=${t.phMin ?? '—'}…${t.phMax ?? '—'} ec_range=${t.ecMin ?? '—'}…${t.ecMax ?? '—'}`
    );
  }

  if (ctx.cycleBrief) {
    lines.push('');
    lines.push('--- cycle_brief (always when cycle selected) ---');
    const b = ctx.cycleBrief;
    if (b.cultivarSummary) lines.push(`cultivars: ${b.cultivarSummary}`);
    lines.push(`plant_count=${b.plantCount}`);
    if (b.plants.length) {
      lines.push(
        ...b.plants.slice(0, 15).map(
          (p) => `[plant id=${p.id}] ${p.plantCode} · ${p.cultivarName ?? '—'} · ${p.status}`
        )
      );
    }
    if (b.light) {
      lines.push(
        `light: ${b.light.lightHoursOn ?? '—'}h on / ${b.light.lightHoursOff ?? '—'}h off · lights_on_at=${b.light.lightsOnAt ?? '—'}`
      );
    }
    if (b.unloadedScopes.length) {
      const names = b.unloadedScopes.map((s) => `«${s.displayName}» (id=${s.id})`).join(', ');
      lines.push(
        `other_scopes_not_loaded: ${names}. Заметки и датчики этих комнат в этот ответ не загружены.`
      );
    }
    lines.push(
      ...lineBlock(
        'cycle_brief.recent_feedings',
        b.recentFeedings.map(formatFeedingBrief)
      )
    );
    lines.push(
      ...lineBlock(
        'cycle_brief.grower_journal',
        b.growerJournalEvents.map(formatGrowerJournal)
      )
    );
    lines.push(
      ...lineBlock(
        'cycle_brief.sensor_daily_stats',
        b.sensorDailyStats.map(
          (s) =>
            `${s.statDate} | ${s.metricName} (${s.metricCode}) min=${s.minValue} max=${s.maxValue} avg=${s.avgValue}${s.unit ? ` ${s.unit}` : ''} (n=${s.readingCount})`
        )
      )
    );
    lines.push(
      ...lineBlock(
        'cycle_brief.sensor_latest_by_metric',
        b.sensorLatestByMetric.map(
          (s) =>
            `${s.metricName} (${s.metricCode}) = ${s.valueNumeric}${s.unit ? ` ${s.unit}` : ''} @ ${s.capturedAt}`
        )
      )
    );
  }

  lines.push(...lineBlock('recent_events', ctx.recentEvents.map(formatEvent)));
  lines.push(...lineBlock('anomaly_context', ctx.anomalyContext.map(formatAnomaly)));
  lines.push(...lineBlock('sensor_context', ctx.sensorContext.map(formatSensor)));
  lines.push(...lineBlock('photo_context', ctx.photoContext.map(formatPhoto)));
  lines.push(
    ...lineBlock(
      'photo_timeline_signals (hypotheses, not causal proof)',
      ctx.photoTimelineSignals.map(formatPhotoTimeline)
    )
  );
  lines.push(...lineBlock('sop_context', ctx.sopContext.map(formatSop)));
  if (ctx.approvedProcedures?.length) {
    lines.push(
      ...lineBlock(
        'sop_context.approved_procedures',
        ctx.approvedProcedures.slice(0, 12).map(
          (p) => `[${p.sourceType} id=${p.id}] ${p.title} · ${p.textExcerpt}`
        )
      )
    );
  }
  lines.push(...lineBlock('causal_context (event_links)', ctx.causalContext.map(formatLink)));
  lines.push(
    ...lineBlock(
      'historical_context.past_cycles',
      ctx.historicalContext.pastCycles.map(
        (c) =>
          `${c.name} | ${c.stage} | ${c.startDate}–${c.endDate ?? '…'} | ${c.status} | id=${c.id}`
      )
    )
  );
  lines.push(
    ...lineBlock(
      'historical_context.pattern_insights',
      ctx.historicalContext.patternInsights.map(
        (i) => `[${i.id}] ${i.title ?? 'pattern'} · ${i.bodyExcerpt.slice(0, 200)}`
      )
    )
  );
  if (ctx.historicalContext.pastCycleSummaries?.length) {
    lines.push(
      ...lineBlock(
        'historical_context.past_cycle_summaries',
        ctx.historicalContext.pastCycleSummaries.map(
          (c) =>
            `${c.name} (${c.cultivarName ?? '—'}) ${c.startDate}–${c.endDate ?? '…'} anomalies=${JSON.stringify(c.anomalyCounts)} feedings=${c.feedingCount} harvest_kg=${c.harvestWetKg ?? '—'}`
        )
      )
    );
  }
  if (ctx.historicalContext.approvedLessons?.length) {
    lines.push(
      ...lineBlock(
        'historical_context.approved_lessons',
        ctx.historicalContext.approvedLessons.map(
          (l) => `[lesson id=${l.id}] ${l.title ?? '—'} · ${l.excerpt}`
        )
      )
    );
  }
  lines.push(...lineBlock('memory_context', ctx.memoryContext.map(formatMemory)));
  lines.push(...lineBlock('knowledge_context', ctx.knowledgeContext.map(formatKnowledge)));
  lines.push(...lineBlock('observations', ctx.observations.map(formatObs)));
  lines.push(...lineBlock('recent_actions', ctx.recentActions.map(formatAction)));
  lines.push(
    ...lineBlock(
      'daily_timelines',
      ctx.dailyTimelines.map(
        (d) =>
          `${d.timelineDate} | events=${d.eventCount} anomalies=${d.anomalyCount} · ${d.summaryText ?? '—'}`
      )
    )
  );
  lines.push(
    ...lineBlock(
      'conversation_history',
      ctx.conversationHistory.map(
        (m) => `[${m.role}] ${m.createdAt}: ${m.messageText.slice(0, 500)}`
      )
    )
  );
  if (ctx.cycleBrief?.sensorDailyStats.length) {
    lines.push('', '--- environmental_daily_stats ---');
    lines.push('(те же ряды в cycle_brief.sensor_daily_stats)');
  } else {
    lines.push(
      ...lineBlock(
        'environmental_daily_stats',
        ctx.environmentalStats.map(
          (s) =>
            `${s.statDate} | ${s.metricName} (${s.metricCode}) min=${s.minValue} max=${s.maxValue} avg=${s.avgValue}${s.unit ? ` ${s.unit}` : ''} (n=${s.readingCount})`
        )
      )
    );
  }

  lines.push('');
  lines.push('--- missing_data ---');
  if (!ctx.missingData.length) {
    lines.push('(нет явных пробелов по детерминированным правилам)');
  } else {
    for (const m of ctx.missingData) {
      lines.push(`- ${m}`);
    }
  }

  lines.push('');
  lines.push('--- guardrails ---');
  lines.push(`must_not_claim_without_evidence=${ctx.guardrails.mustNotClaimWithoutEvidence}`);
  lines.push(
    `must_ask_clarifying_question_if_scope_ambiguous=${ctx.guardrails.mustAskClarifyingQuestionIfScopeAmbiguous}`
  );
  lines.push(
    `block_strong_causal_or_action_without_signals=${ctx.guardrails.blockStrongCausalOrActionWithoutSignals}`
  );
  lines.push(
    `block_farm_action_advice_without_cycle=${ctx.guardrails.blockFarmActionAdviceWithoutCycle}`
  );

  return applyPromptCharBudget(lines.join('\n'));
}

function formatFeedingBrief(
  f: NonNullable<AnswerAssemblyContext['cycleBrief']>['recentFeedings'][number]
): string {
  const head = `${f.occurredAt} | ${f.entryKind} | ${f.volumeMl} ml · pH=${f.ph ?? '—'} EC=${f.ecMs ?? '—'}`;
  const recipe = f.recipeName ? ` · recipe=${f.recipeName}` : '';
  const snap = f.solutionSnapshotSummary ? ` · ${f.solutionSnapshotSummary}` : '';
  return `[feeding_entry id=${f.id} event=${f.eventId}] ${head}${recipe}${snap}`;
}

function formatGrowerJournal(
  e: NonNullable<AnswerAssemblyContext['cycleBrief']>['growerJournalEvents'][number]
): string {
  const head = `${e.occurredAt} | ${e.eventType}${e.title ? ` | ${e.title}` : ''}`;
  const body = e.body ? ` · ${e.body}` : '';
  return `[event id=${e.id}] ${head}${body}`;
}

function formatEvent(
  e: AnswerAssemblyContext['recentEvents'][number]
): string {
  const head = `${e.occurredAt} | ${e.eventType}${e.title ? ` | ${e.title}` : ''}${e.severity ? ` | sev=${e.severity}` : ''}`;
  const body = e.body ? ` · ${e.body}` : '';
  return `[event id=${e.id} scope=${e.scopeId ?? '∅'}] ${head}${body}`;
}

function formatAnomaly(
  e: AnswerAssemblyContext['anomalyContext'][number]
): string {
  return `[anomaly id=${e.id}] ${e.occurredAt} | ${e.eventType} | ${e.severity ?? '—'} | ${e.title ?? ''}${e.body ? ` · ${e.body}` : ''}`;
}

function formatSensor(
  s: AnswerAssemblyContext['sensorContext'][number]
): string {
  return `[sensor_reading id=${s.id} scope=${s.scopeId ?? '∅'}] ${s.capturedAt} | ${s.metricName} (${s.metricCode}) = ${s.valueNumeric}${s.unit ? ` ${s.unit}` : ''}`;
}

function formatPhoto(
  p: AnswerAssemblyContext['photoContext'][number]
): string {
  const st = p.analysisStatus ? ` status=${p.analysisStatus}` : '';
  const conf =
    p.analysisConfidence != null ? ` conf=${p.analysisConfidence}` : '';
  const a = p.analysisSummary
    ? ` · analysis: ${p.analysisSummary}`
    : ' · (нет photo_analysis — не выдумывай визуальные детали)';
  const tg = p.tags?.length ? ` · tags: ${p.tags.join(', ')}` : '';
  const leaf = p.leafHypothesisSummary ? ` · leaf_skill: ${p.leafHypothesisSummary}` : '';
  return `[media id=${p.mediaAssetId}]${st}${conf} ${p.capturedAt ?? 'без даты'} | ${p.fileName ?? 'файл'}${a}${tg}${leaf}`;
}

function formatPhotoTimeline(
  s: AnswerAssemblyContext['photoTimelineSignals'][number]
): string {
  return (
    `[photo_timeline id=${s.id}] ${s.fromMediaAssetId} → ${s.toMediaAssetId} | ${s.signalType}` +
    (s.signalStrength != null ? ` | strength=${s.signalStrength}` : '') +
    (s.scopeId ? ` | scope=${s.scopeId}` : '') +
    (s.description ? ` | ${s.description}` : '')
  );
}

function formatSop(s: AnswerAssemblyContext['sopContext'][number]): string {
  return `[sop_run id=${s.runId} scope=${s.scopeId ?? '∅'}] ${s.definitionTitle} | ${s.status} | due=${s.dueAt ?? '—'}${s.reasonText ? ` | ${s.reasonText}` : ''}`;
}

function formatLink(l: AnswerAssemblyContext['causalContext'][number]): string {
  return `${l.relationType}: ${l.fromEventId} → ${l.toEventId} (link id=${l.id})`;
}

function formatMemory(
  m: AnswerAssemblyContext['memoryContext'][number]
): string {
  return `[${m.docType} id=${m.id}] ${m.title ?? '—'} · ${m.excerpt.slice(0, 320)}`;
}

function formatKnowledge(
  k: AnswerAssemblyContext['knowledgeContext'][number]
): string {
  return `[${k.docType} id=${k.id}] ${k.title ?? '—'} · ${k.excerpt.slice(0, 320)}`;
}

function formatObs(o: AnswerAssemblyContext['observations'][number]): string {
  return `[observation id=${o.id} event=${o.eventId}] ${o.observationType} | ${o.label ?? '—'} | ${o.valueText ?? '—'}`;
}

function formatAction(a: AnswerAssemblyContext['recentActions'][number]): string {
  return `[action id=${a.id} event=${a.eventId}] ${a.actionType} | done=${a.completedAt ?? '—'} | ${a.resultText ?? '—'}`;
}
