import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { getBearerToken, getUserFromBearer } from '@/lib/api/auth-from-request';
import { assistantPhotoOnlyDefaultQuestion, normalizeProductLocale } from '@/lib/assistant/locale';
import { buildAssistantSystem } from '@/lib/assistant/prompts';
import {
  parseAssistantModelJson,
  type AssistantModelResponse,
} from '@/lib/assistant/response-schema';
import { applyTrustLayer } from '@/lib/assistant/trust-layer';
import {
  buildEmptyRetrievalResponse,
  buildEscalationResponse,
  buildScopeClarificationResponse,
  shouldSkipLlmForAdvice,
} from '@/lib/assistant/deterministic-insight';
import { loadAttachedMediaForAsk } from '@/lib/assistant/load-attached-media';
import {
  fetchEscalationPhotoObservation,
  mergeEscalationWithPhotoObservation,
} from '@/lib/assistant/escalation-photo-observation';
import { createServiceRoleSupabase } from '@/lib/growlog/background-worker-core';
import { notifyEscalation } from '@/lib/growlog/push-notifications';
import { formatProcedureBlock, loadApprovedProcedures } from '@/lib/growlog/procedure-catalog';
import { asksForProcedure, matchApprovedProcedure } from '@/lib/growlog/routine-match';
import { insertInsightWithGrounding } from '@/lib/assistant/persist-insight';
import { persistConversationTurn } from '@/lib/assistant/conversation-messages';
import {
  assembleAnswerContext,
  formatRetrievalContextForPrompt,
} from '@/lib/growlog/assemble-retrieval-context';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = 'gpt-4o-mini';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { user, error: authError } = await getUserFromBearer(req);
  if (!user || authError) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  const body = req.body as {
    message?: string;
    farmId?: string;
    cycleId?: string | null;
    scopeId?: string | null;
    conversationId?: string | null;
    requestedTimeWindow?: { from?: string; to?: string } | null;
    locale?: string | null;
    mediaAssetId?: string | null;
  };

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const mediaAssetId =
    body.mediaAssetId === null || body.mediaAssetId === undefined || body.mediaAssetId === ''
      ? null
      : body.mediaAssetId;
  if (!message && !mediaAssetId) {
    return res.status(400).json({ error: 'missing_message' });
  }
  if (!body.farmId || typeof body.farmId !== 'string') {
    return res.status(400).json({ error: 'missing_farm_id' });
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const productLocale = normalizeProductLocale(body.locale);
  const effectiveMessage =
    message || assistantPhotoOnlyDefaultQuestion(productLocale);

  const cycleId =
    body.cycleId === null || body.cycleId === undefined || body.cycleId === ''
      ? null
      : body.cycleId;
  const scopeId =
    body.scopeId === null || body.scopeId === undefined || body.scopeId === ''
      ? null
      : body.scopeId;

  const conversationId =
    body.conversationId === null ||
    body.conversationId === undefined ||
    body.conversationId === ''
      ? null
      : body.conversationId;

  const requestedTimeWindow =
    body.requestedTimeWindow === null || body.requestedTimeWindow === undefined
      ? undefined
      : body.requestedTimeWindow;

  let pack;
  try {
    pack = await assembleAnswerContext(supabase, {
      farmId: body.farmId,
      userId: user.id,
      queryText: effectiveMessage,
      cycleId,
      scopeId,
      conversationId,
      requestedTimeWindow,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'retrieval_failed';
    return res.status(500).json({ error: 'retrieval_failed', detail: msg });
  }

  let procedures: Awaited<ReturnType<typeof loadApprovedProcedures>> = [];
  let proceduresAvailable = true;
  try {
    procedures = await loadApprovedProcedures(supabase, body.farmId);
  } catch (e: unknown) {
    const msg =
      e instanceof Error
        ? e.message
        : e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : '';
    if (!/sop_revisions|playbook_thresholds|does not exist|schema cache|PGRST/i.test(msg)) {
      return res.status(500).json({ error: 'procedure_lookup_failed', detail: msg });
    }
    proceduresAvailable = false;
  }
  const procedureHit = matchApprovedProcedure(effectiveMessage, procedures);
  const escalate =
    proceduresAvailable &&
    asksForProcedure(effectiveMessage) &&
    !procedureHit &&
    !pack.scope.needsClarification;

  let attachedPhoto: Awaited<ReturnType<typeof loadAttachedMediaForAsk>> = null;
  if (mediaAssetId) {
    try {
      attachedPhoto = await loadAttachedMediaForAsk(supabase, {
        farmId: body.farmId,
        mediaAssetId,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'attached_photo_failed';
      if (msg === 'attached_photo_too_large') {
        return res.status(413).json({ error: 'attached_photo_too_large' });
      }
      return res.status(400).json({ error: 'attached_photo_invalid', detail: msg });
    }
    if (!attachedPhoto) {
      return res.status(404).json({ error: 'attached_photo_not_found' });
    }
  }

  const hasAttachedPhoto = attachedPhoto != null;
  const skipLlm = shouldSkipLlmForAdvice(pack, { escalate, hasAttachedPhoto });

  if (!skipLlm && !process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'openai_not_configured' });
  }

  let parsed: AssistantModelResponse;
  let modelUsed: string;

  if (pack.scope.needsClarification && !hasAttachedPhoto) {
    parsed = buildScopeClarificationResponse(pack, effectiveMessage);
    modelUsed = 'deterministic_scope_clarification';
  } else if (escalate) {
    parsed = buildEscalationResponse(productLocale);
    modelUsed = 'deterministic_escalation';
    if (attachedPhoto && process.env.OPENAI_API_KEY) {
      try {
        const observation = await fetchEscalationPhotoObservation(openai, {
          model: MODEL,
          photo: attachedPhoto,
          userQuestion: effectiveMessage,
          locale: productLocale,
        });
        parsed = mergeEscalationWithPhotoObservation(
          parsed,
          observation,
          attachedPhoto.mediaAssetId,
          productLocale
        );
        modelUsed = `${MODEL}_escalation_vision_observation`;
      } catch {
        parsed.body = `${parsed.body}\n\n_(К запросу прикреплено фото: media_asset ${attachedPhoto.mediaAssetId} — Master Grower может открыть его в журнале.)_`;
        parsed.grounding.push({
          source_type: 'media_asset',
          source_id: attachedPhoto.mediaAssetId,
          excerpt: 'Фото, прикреплённое к эскалированному запросу',
        });
      }
    } else if (attachedPhoto) {
      parsed.body = `${parsed.body}\n\n_(К запросу прикреплено фото: media_asset ${attachedPhoto.mediaAssetId} — Master Grower может открыть его в журнале.)_`;
      parsed.grounding.push({
        source_type: 'media_asset',
        source_id: attachedPhoto.mediaAssetId,
        excerpt: 'Фото, прикреплённое к эскалированному запросу',
      });
    }
    try {
      const service = createServiceRoleSupabase();
      await notifyEscalation(service, {
        farmId: body.farmId,
        severity: 'high',
        title: 'Non-standard situation',
        body: effectiveMessage.slice(0, 180),
      });
    } catch {
      /* push is best-effort; the reply still escalates */
    }
  } else if (skipLlm) {
    parsed = buildEmptyRetrievalResponse(pack);
    modelUsed = 'deterministic_empty_context';
  } else {
    const contextBlock = formatRetrievalContextForPrompt(pack);
    const historyBlock =
      pack.conversationHistory.length > 0
        ? `\n\n--- prior_turns ---\n${pack.conversationHistory
            .map((m) => `[${m.role}] ${m.messageText}`)
            .join('\n')}\n`
        : '';
    const procedureBlock = formatProcedureBlock(procedures);
    const scopeClarifyBlock = pack.scope.needsClarification
      ? `\n\n--- scope_clarification_required ---\n` +
        `insight_type MUST be clarification_request. Не давай agronomic recommendation.\n` +
        `Сначала попроси уточнить scope/зону. ${pack.scope.clarificationHint?.trim() ?? ''}\n` +
        `Можешь кратко описать, что видишь на фото, только в interpretation/hypotheses.\n`
      : '';
    const photoBlock = attachedPhoto
      ? `\n\n--- attached_photo ---\n[media_asset id=${attachedPhoto.mediaAssetId}]` +
        `${attachedPhoto.capturedAt ? ` captured_at=${attachedPhoto.capturedAt}` : ''}` +
        `${attachedPhoto.fileName ? ` file=${attachedPhoto.fileName}` : ''}\n` +
        `Пиксели на изображении — наблюдение этого хода. Не выдавай визуальные выводы как facts; используй interpretation и hypotheses. В facts допустимо: наличие фото, время, scope.\n`
      : '';
    const userText = `Контекст фермы:\n${contextBlock}${
      procedureBlock ? `\n\n--- approved_procedures ---\n${procedureBlock}\n` : ''
    }${historyBlock}${scopeClarifyBlock}${photoBlock}\n\n---\nВопрос пользователя:\n${effectiveMessage}`;

    const userMessageContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = attachedPhoto
      ? [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: attachedPhoto.dataUrl, detail: 'high' } },
        ]
      : [{ type: 'text', text: userText }];

    let raw: string;
    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildAssistantSystem(productLocale) },
          { role: 'user', content: userMessageContent },
        ],
      });
      raw = completion.choices[0]?.message?.content ?? '';
      if (!raw) {
        return res.status(502).json({ error: 'empty_model_response' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'model_failed';
      return res.status(502).json({ error: 'model_failed', detail: msg });
    }

    try {
      parsed = parseAssistantModelJson(raw);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'parse_failed';
      return res.status(422).json({ error: 'invalid_model_json', detail: msg });
    }
    if (attachedPhoto) {
      const hasGrounding = parsed.grounding.some(
        (g) => g.source_type === 'media_asset' && g.source_id === attachedPhoto.mediaAssetId
      );
      if (!hasGrounding) {
        parsed.grounding.push({
          source_type: 'media_asset',
          source_id: attachedPhoto.mediaAssetId,
          excerpt: 'Фото, прикреплённое к этому вопросу',
        });
      }
    }
    modelUsed = MODEL;
  }

  const trust = applyTrustLayer(parsed, pack);
  const out = trust.response;

  const interpretationJson =
    out.interpretation && out.interpretation.trim()
      ? { text: out.interpretation.trim() }
      : {};
  const recommendationJson =
    out.recommendation && out.recommendation.trim()
      ? { text: out.recommendation.trim() }
      : {};

  if (!trust.persistInsight) {
    if (conversationId) {
      try {
        await persistConversationTurn(supabase, {
          farmId: body.farmId,
          conversationId,
          cycleId,
          scopeId,
          userId: user.id,
          userMessage: effectiveMessage,
          assistantMessage: out.body,
        });
      } catch {
        /* non-fatal */
      }
    }
    return res.status(200).json({
      insightId: null,
      persisted: false,
      persistenceReason: trust.persistenceReason,
      model: modelUsed,
      retrievalPath: skipLlm ? 'deterministic' : 'llm',
      ...out,
    });
  }

  const insertResult = await insertInsightWithGrounding(supabase, {
    farm_id: body.farmId,
    cycle_id: cycleId,
    scope_id: scopeId,
    insight_type: out.insight_type,
    title: out.title,
    body: out.body,
    user_query: effectiveMessage,
    facts_json: out.facts,
    interpretation_json: interpretationJson,
    recommendation_json: recommendationJson,
    hypotheses_json: out.hypotheses,
    confidence: out.confidence.score,
    confidence_label: out.confidence.label,
    missing_data_json: out.missing_data,
    trust_flags_json: out.trust_flags,
    model_name: modelUsed,
    created_by: user.id,
    grounding: out.grounding,
  });

  if (insertResult.error || !insertResult.insightId) {
    if (conversationId) {
      try {
        await persistConversationTurn(supabase, {
          farmId: body.farmId,
          conversationId,
          cycleId,
          scopeId,
          userId: user.id,
          userMessage: effectiveMessage,
          assistantMessage: out.body,
        });
      } catch {
        /* non-fatal */
      }
    }
    return res.status(200).json({
      insightId: null,
      persisted: false,
      persistenceReason: insertResult.groundingFailed
        ? ('grounding_attach_failed' as const)
        : ('persist_insert_failed' as const),
      persistDetail: insertResult.error ?? 'insert',
      model: modelUsed,
      retrievalPath: skipLlm ? 'deterministic' : 'llm',
      persistRpc: insertResult.usedRpc,
      ...out,
    });
  }

  if (conversationId) {
    try {
      await persistConversationTurn(supabase, {
        farmId: body.farmId,
        conversationId,
        cycleId,
        scopeId,
        userId: user.id,
        userMessage: effectiveMessage,
        assistantMessage: out.body,
        insightId: insertResult.insightId,
      });
    } catch {
      /* non-fatal */
    }
  }

  return res.status(200).json({
    insightId: insertResult.insightId,
    persisted: true as const,
    persistenceReason: trust.persistenceReason,
    model: modelUsed,
    retrievalPath: skipLlm ? 'deterministic' : 'llm',
    persistRpc: insertResult.usedRpc,
    groundingPersisted: out.grounding.length > 0,
    ...out,
  });
}
