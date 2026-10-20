import { asksForProcedure } from '@/lib/growlog/routine-match';

const LOG_HINT =
  /(polil|poliva|подкорм|полил|замер|измерил|зафиксиров|сегодня в \d|fed|watered|watering|ph[\s=]|ec[\s=]|vpd[\s=]|transplant|harvested|срезал|увидел|заметил|клещ|вредител|issue_detected|note:)/i;

/** Code decides advisor vs journal — not the LLM (ADR-005 voice-first, ADR-004 confirm facts). */
export type AdvisorVoiceRoute = 'ask' | 'log_extract';

export function routeAdvisorTranscript(transcript: string): AdvisorVoiceRoute {
  const t = transcript.trim();
  if (!t) return 'ask';
  if (asksForProcedure(t)) return 'ask';
  if (LOG_HINT.test(t)) return 'log_extract';
  if (/\?\s*$/.test(t) || /^(what|how|why|when|where|как|что|почему|когда|где|какой)/i.test(t)) {
    return 'ask';
  }
  if (t.length < 120 && /\d/.test(t) && /(temp|rh|ph|ec|vpd|co2|°|%) /i.test(t)) {
    return 'log_extract';
  }
  return 'ask';
}
