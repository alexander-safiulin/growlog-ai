import {
  MIN_AUDIO_BYTES,
  MIN_WAV_DATA_BYTES,
  detectAudioFormat,
  extensionForAudio,
  isWhisperSupportedFormat,
  mimeTypeForExtension,
  wavDataChunkSize,
  whisperLanguageFromLocale,
} from '@/lib/voice/detect-audio-format';

function stripAudioBase64(input: string): string {
  const trimmed = input.trim();
  const marker = 'base64,';
  const idx = trimmed.indexOf(marker);
  if (trimmed.startsWith('data:') && idx !== -1) {
    return trimmed.slice(idx + marker.length).replace(/\s+/g, '');
  }
  return trimmed.replace(/\s+/g, '');
}

function decodeAudioBase64(input: string): Uint8Array | null {
  const cleaned = stripAudioBase64(input);
  if (cleaned.length < 8 || /[^A-Za-z0-9+/=]/.test(cleaned)) return null;
  const unpadded = cleaned.replace(/=+$/, '');
  const expected = Math.floor((unpadded.length * 3) / 4);
  const decoded = Buffer.from(cleaned, 'base64');
  if (decoded.length === 0 || Math.abs(decoded.length - expected) > 2) return null;
  return decoded;
}

export { MIN_AUDIO_BYTES, MIN_WAV_DATA_BYTES };
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export type TranscribePrepareError =
  | 'missing_audio'
  | 'invalid_base64'
  | 'audio_too_short'
  | 'audio_too_large'
  | 'invalid_audio';

export type TranscribePrepareOk = {
  ok: true;
  bytes: Uint8Array;
  ext: string;
  fileType: string;
  language?: string;
};

export type TranscribePrepareResult = TranscribePrepareOk | { ok: false; error: TranscribePrepareError };

export function prepareTranscribeInput(body: {
  audioBase64?: unknown;
  mimeType?: unknown;
  language?: unknown;
}): TranscribePrepareResult {
  if (typeof body.audioBase64 !== 'string' || !body.audioBase64.trim()) {
    return { ok: false, error: 'missing_audio' };
  }

  const bytes = decodeAudioBase64(body.audioBase64);
  if (!bytes) return { ok: false, error: 'invalid_base64' };
  if (bytes.length < MIN_AUDIO_BYTES) return { ok: false, error: 'audio_too_short' };
  if (bytes.length > MAX_AUDIO_BYTES) return { ok: false, error: 'audio_too_large' };

  const mimeType = typeof body.mimeType === 'string' && body.mimeType ? body.mimeType : 'audio/webm';
  const format = detectAudioFormat(bytes);
  if (format && !isWhisperSupportedFormat(format)) {
    return { ok: false, error: 'invalid_audio' };
  }
  if (format === 'wav') {
    const dataBytes = wavDataChunkSize(bytes);
    if (dataBytes != null && dataBytes < MIN_WAV_DATA_BYTES) {
      return { ok: false, error: 'audio_too_short' };
    }
  }

  const ext = extensionForAudio(format, mimeType);
  if (ext === 'caf' || ext === 'aiff' || ext === '3gp') {
    return { ok: false, error: 'invalid_audio' };
  }

  const language =
    whisperLanguageFromLocale(typeof body.language === 'string' ? body.language : undefined) ?? 'ru';

  return {
    ok: true,
    bytes,
    ext,
    fileType: mimeTypeForExtension(ext),
    language,
  };
}
