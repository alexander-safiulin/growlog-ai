import OpenAI from 'openai';
import {
  parseSopImportModelJson,
  SOP_IMPORT_ENGINE_TRIGGER_TYPES,
  type SopImportPreviewResult,
} from '@growlog/domain/growlog/sop-import-draft';

const MODEL = 'gpt-4o-mini';

function buildSystemPrompt(): string {
  const types = SOP_IMPORT_ENGINE_TRIGGER_TYPES.join('|');
  return `You extract Standard Operating Procedures from grower documents for Growlog.
Return ONLY JSON: {"drafts":[...]}

Each draft object:
- title (string, required)
- description (string, optional)
- category (string, optional)
- criticality: low|normal|high|critical (default normal)
- severity_if_missed: low|normal|high|critical (default normal)
- applies_to_scope: farm|site|room|tent|zone|bed|reservoir|plant_group|plant (default tent)
- steps: string[] step-by-step instructions (required, at least one)
- required_inputs_after_execution: string[] machine keys e.g. runoff_ec, runoff_ph, evidence_photo
- triggers: array of { trigger_type, trigger_config }
- schedule_unparsed: string note if schedule could not be mapped to triggers

Allowed trigger_type values ONLY: ${types}

trigger_config examples:
- recurring_daily: {"local_time":"09:00"} optional window_end_local
- recurring_interval: {"interval_days":3,"local_time":"09:00"}
- date_based: {"dates":["2026-11-01"],"local_time":"09:00"}
- stage_based: {"stages":["flower"],"local_time":"09:00"}
- offset_based: {"offset_days":2,"local_time":"09:00"}
- time_based: {"local_time":"08:00","window_end_local":"10:00"}

Do not invent steps not supported by the document. Split distinct procedures into separate drafts.
Max 15 drafts.`;
}

export async function classifySopDocumentText(documentText: string): Promise<SopImportPreviewResult> {
  const key = process.env.OPENAI_API_KEY;
  const input = documentText.trim().slice(0, 120_000);
  if (input.length < 40) {
    return { drafts: [], dropped_trigger_count: 0 };
  }
  if (!key) {
    throw new Error('openai_not_configured');
  }

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.15,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: input },
    ],
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('empty_model_response');
  }
  return parseSopImportModelJson(raw);
}
