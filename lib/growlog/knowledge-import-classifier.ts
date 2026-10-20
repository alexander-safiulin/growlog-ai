import OpenAI from 'openai';
import {
  parseClassifiedImportJson,
  type ClassifiedImportDraft,
} from '@/lib/growlog/knowledge-import-schema';

const MODEL = 'gpt-4o-mini';

function buildSystem(sopTitles: Array<{ id: string; title: string }>): string {
  const sopList =
    sopTitles.length > 0
      ? sopTitles.map((s) => `${s.id}: ${s.title}`).join('\n')
      : '(no existing SOP definitions — omit sop_definition_id for new procedures)';
  return `You classify grower documents into Growlog draft types. Return ONLY JSON:
{"drafts":[{"kind":"playbook_rule|sop_procedure|playbook_threshold|cycle_stage", ...}]}

Kinds:
- playbook_rule: general farm rule, policy, explanation (not step-by-step SOP)
- sop_procedure: step-by-step procedure; set sop_definition_id if it clearly matches an existing SOP id below
- playbook_threshold: numeric target (metric_code: vpd_kpa, ec_mS_cm, ph, air_temp_c, air_rh_pct, co2_ppm); min_value/max_value; cycle_stage optional (propagation, veg, flower, drying, curing)
- cycle_stage: calendar stage plan with stage, planned_start, planned_end (ISO dates YYYY-MM-DD)

Each draft needs: title, excerpt (quote from source), body (full text for approval).
Do not invent facts not in the document. Max 25 drafts.

Existing SOP definitions (farm):
${sopList}`;
}

export async function classifyGrowerDocument(
  documentText: string,
  context: { sopDefinitions: Array<{ id: string; title: string }> }
): Promise<ClassifiedImportDraft[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fallbackChunk(documentText);

  const input = documentText.trim().slice(0, 120_000);
  if (input.length < 80) return [];

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.15,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystem(context.sopDefinitions) },
      { role: 'user', content: input },
    ],
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) return fallbackChunk(documentText);
  try {
    const drafts = parseClassifiedImportJson(raw);
    return drafts.length > 0 ? drafts : fallbackChunk(documentText);
  } catch {
    return fallbackChunk(documentText);
  }
}

function fallbackChunk(text: string): ClassifiedImportDraft[] {
  return text
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter((c) => c.length > 40)
    .slice(0, 15)
    .map((chunk, i) => ({
      kind: 'playbook_rule' as const,
      title: chunk.slice(0, 80) || `Import ${i + 1}`,
      excerpt: chunk.slice(0, 400),
      body: chunk.slice(0, 8000),
    }));
}
