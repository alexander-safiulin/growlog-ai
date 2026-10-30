import { uriToBase64 } from '@/lib/uri-to-base64';
import { mimeTypeFromRecordingUri } from '@/lib/voice-recording';
import {
  MIN_AUDIO_BYTES,
  MIN_WAV_DATA_BYTES,
  detectAudioFormat,
  isBlankTranscript,
  isWhisperSupportedFormat,
  mimeTypeForExtension,
  wavDataChunkSize,
  whisperLanguageFromLocale,
} from '@growlog/web-lib/voice/detect-audio-format';
import { transcribeVoice } from '@growlog/api-client';

const MIN_DURATION_MS = 400;
const TRUST_DURATION_BELOW_BYTES = 8_000;

function peekBase64Bytes(base64: string, n: number): Uint8Array {
  const take = Math.ceil((n * 4) / 3) + 4;
  const raw = atob(base64.slice(0, take));
  const out = new Uint8Array(Math.min(n, raw.length));
  for (let i = 0; i < out.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function estimateDecodedBytes(base64: string): number {
  const cleaned = base64.replace(/\s+/g, '');
  const padding = cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((cleaned.length * 3) / 4) - padding);
}

export async function transcribeRecordingFile({
  uri,
  token,
  language,
  durationMs,
}: {
  uri: string;
  token: string;
  language?: string;
  durationMs?: number;
}): Promise<string> {
  const base64 = await uriToBase64(uri);
  const byteLength = estimateDecodedBytes(base64);
  const header = peekBase64Bytes(base64, 64);
  const format = detectAudioFormat(header);
  const mimeFromUri = mimeTypeFromRecordingUri(uri);

  if (byteLength < MIN_AUDIO_BYTES) throw new Error('audio_too_short');
  if (
    durationMs != null &&
    durationMs > 0 &&
    durationMs < MIN_DURATION_MS &&
    byteLength < TRUST_DURATION_BELOW_BYTES
  ) {
    throw new Error('audio_too_short');
  }
  if (format && !isWhisperSupportedFormat(format)) throw new Error('invalid_audio');
  if (mimeFromUri === 'audio/x-caf' || mimeFromUri === 'audio/3gpp') throw new Error('invalid_audio');
  if (format === 'wav') {
    const dataBytes = wavDataChunkSize(header);
    if (dataBytes === 0 || (dataBytes != null && dataBytes < MIN_WAV_DATA_BYTES && byteLength < 12_000)) {
      throw new Error('audio_too_short');
    }
  }

  const mimeType = format && isWhisperSupportedFormat(format) ? mimeTypeForExtension(format) : mimeFromUri;
  const tr = await transcribeVoice(token, {
    audioBase64: base64,
    mimeType,
    language: whisperLanguageFromLocale(language),
  });
  const text = tr.text?.trim() ?? '';
  if (!text || isBlankTranscript(text)) throw new Error('empty_transcription');
  return text;
}
