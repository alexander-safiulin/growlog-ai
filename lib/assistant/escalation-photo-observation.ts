import type OpenAI from 'openai';
import type { ProductLocale } from '@/lib/i18n/locales';
import { assistantLanguageInstruction } from '@/lib/assistant/locale';
import type { AssistantModelResponse } from '@/lib/assistant/response-schema';
import type { AttachedMediaForAsk } from '@/lib/assistant/load-attached-media';

export type EscalationPhotoObservation = {
  visual_summary: string;
  hypotheses: string[];
  visual_facts: string[];
};

const PHOTO_SECTION_HEADING: Record<ProductLocale, string> = {
  en: '### Visible on the photo (observation only, no treatment advice)',
  ru: '### Что видно на фото (только наблюдение, без советов по лечению)',
  th: '### Visible on the photo (observation only, no treatment advice)',
  it: '### Visible on the photo (observation only, no treatment advice)',
  fr: '### Visible on the photo (observation only, no treatment advice)',
  es: '### Visible on the photo (observation only, no treatment advice)',
  de: '### Visible on the photo (observation only, no treatment advice)',
  vi: '### Visible on the photo (observation only, no treatment advice)',
  my: '### Visible on the photo (observation only, no treatment advice)',
};

function buildEscalationVisionSystem(locale: ProductLocale): string {
  return `You describe a farm/grow photo for Master Grower escalation review. The situation is NON-STANDARD — you must NOT recommend treatments, products, doses, or immediate actions.

Return JSON only:
{
  "visual_summary": "2-4 short sentences describing what is visible (colors, leaf surface, structure, equipment). Use hedged language.",
  "visual_facts": ["neutral observable items only, max 4"],
  "hypotheses": ["optional visual hypotheses, hedged, max 3"]
}

FORBIDDEN in all fields: treatment steps, product names, "you should", definitive diagnosis as fact.
${assistantLanguageInstruction(locale)}`;
}

function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, max);
}

export function parseEscalationPhotoObservationJson(raw: string): EscalationPhotoObservation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('invalid_escalation_photo_json');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('invalid_escalation_photo_json');
  }
  const o = parsed as Record<string, unknown>;
  const visual_summary =
    typeof o.visual_summary === 'string' && o.visual_summary.trim() ? o.visual_summary.trim() : null;
  if (!visual_summary) {
    throw new Error('missing_visual_summary');
  }
  return {
    visual_summary,
    visual_facts: stringList(o.visual_facts, 4),
    hypotheses: stringList(o.hypotheses, 3),
  };
}

export function mergeEscalationWithPhotoObservation(
  base: AssistantModelResponse,
  observation: EscalationPhotoObservation,
  mediaAssetId: string,
  locale: ProductLocale
): AssistantModelResponse {
  const heading = PHOTO_SECTION_HEADING[locale] ?? PHOTO_SECTION_HEADING.en;
  const body = `${base.body}\n\n${heading}\n\n${observation.visual_summary}`;
  const facts = [...base.facts, ...observation.visual_facts].slice(0, 8);
  const trust_flags = Array.from(
    new Set([...base.trust_flags, 'visual_interpretation_only', 'no_treatment_advice', 'low_confidence'])
  );
  const grounding = [...base.grounding];
  if (!grounding.some((g) => g.source_type === 'media_asset' && g.source_id === mediaAssetId)) {
    grounding.push({
      source_type: 'media_asset',
      source_id: mediaAssetId,
      excerpt: 'Фото для визуального наблюдения при эскалации',
    });
  }
  return {
    ...base,
    body,
    facts,
    interpretation: observation.visual_summary,
    hypotheses: observation.hypotheses,
    recommendation: null,
    confidence: { score: Math.min(base.confidence.score, 0.55), label: 'low' },
    trust_flags,
    grounding,
  };
}

export async function fetchEscalationPhotoObservation(
  openai: OpenAI,
  params: {
    model: string;
    photo: AttachedMediaForAsk;
    userQuestion: string;
    locale: ProductLocale;
  }
): Promise<EscalationPhotoObservation> {
  const completion = await openai.chat.completions.create({
    model: params.model,
    temperature: 0.15,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildEscalationVisionSystem(params.locale) },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `User question (escalated, do not answer with actions):\n${params.userQuestion}`,
          },
          { type: 'image_url', image_url: { url: params.photo.dataUrl, detail: 'high' } },
        ],
      },
    ],
  });
  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error('empty_escalation_photo_response');
  return parseEscalationPhotoObservationJson(raw);
}
