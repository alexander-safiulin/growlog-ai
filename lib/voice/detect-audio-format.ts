export const MIN_AUDIO_BYTES = 800;
export const MIN_WAV_DATA_BYTES = 1600;

export type DetectedAudioFormat = 'wav' | 'm4a' | 'mp3' | 'webm' | 'ogg' | 'caf' | 'aiff' | '3gp';

const WHISPER_FORMATS = new Set<DetectedAudioFormat>(['wav', 'm4a', 'mp3', 'webm', 'ogg']);

const WHISPER_LANGUAGES = new Set([
  'en',
  'ru',
  'th',
  'it',
  'fr',
  'es',
  'de',
  'vi',
  'my',
  'uk',
  'zh',
  'nl',
  'cs',
]);

function ascii(bytes: Uint8Array, start: number, n: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + n));
}

export function detectAudioFormat(bytes: Uint8Array): DetectedAudioFormat | null {
  if (bytes.length < 12) return null;
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') return 'wav';
  if (ascii(bytes, 0, 4) === 'FORM' && (ascii(bytes, 8, 4) === 'AIFF' || ascii(bytes, 8, 4) === 'AIFC')) {
    return 'aiff';
  }
  if (ascii(bytes, 0, 4) === 'caff') return 'caf';
  if (ascii(bytes, 0, 4) === 'OggS') return 'ogg';
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4).toLowerCase();
    if (brand.startsWith('3gp') || brand.startsWith('3g2')) return '3gp';
    return 'm4a';
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return 'webm';
  }
  if (ascii(bytes, 0, 3) === 'ID3') return 'mp3';
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return 'mp3';
  return null;
}

export function isWhisperSupportedFormat(format: DetectedAudioFormat | null): boolean {
  return format != null && WHISPER_FORMATS.has(format);
}

export function extensionForAudio(format: DetectedAudioFormat | null, mimeType: string): string {
  if (format === 'ogg') return 'ogg';
  if (format && format !== 'caf' && format !== 'aiff' && format !== '3gp') return format;
  if (format === 'caf') return 'caf';
  if (format === 'aiff') return 'aiff';
  if (format === '3gp') return '3gp';
  const mt = mimeType.toLowerCase();
  if (mt.includes('m4a') || mt.includes('mp4') || mt.includes('aac')) return 'm4a';
  if (mt.includes('mpeg') || mt.includes('mp3')) return 'mp3';
  if (mt.includes('wav')) return 'wav';
  if (mt.includes('ogg')) return 'ogg';
  return 'webm';
}

export function mimeTypeForExtension(ext: string): string {
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'm4a') return 'audio/m4a';
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'ogg') return 'audio/ogg';
  return 'audio/webm';
}

export function wavDataChunkSize(bytes: Uint8Array): number | null {
  if (bytes.length < 12) return null;
  if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WAVE') return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = ascii(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    if (id === 'data') return size;
    const next = offset + 8 + size + (size % 2);
    if (next <= offset) break;
    if (next > bytes.length) return null;
    offset = next;
  }
  return bytes.length < 44 ? null : 0;
}

export function isBlankTranscript(text: string): boolean {
  return text.replace(/[\s.,!?…·•\-–—'"«»„“”]/g, '').length === 0;
}

export function whisperLanguageFromLocale(locale: string | undefined | null): string | undefined {
  if (!locale) return undefined;
  const code = locale.trim().toLowerCase().split(/[_-]/)[0] ?? '';
  return WHISPER_LANGUAGES.has(code) ? code : undefined;
}
