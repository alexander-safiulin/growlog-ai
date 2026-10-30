import { describe, expect, it } from 'vitest';
import {
  detectAudioFormat,
  extensionForAudio,
  isBlankTranscript,
  isWhisperSupportedFormat,
  wavDataChunkSize,
  whisperLanguageFromLocale,
} from '@/lib/voice/detect-audio-format';
import { classifyVoiceError } from '@/lib/voice/classify-voice-error';
import { prepareTranscribeInput } from '@/lib/voice/prepare-transcribe-input';

function bytes(hex: number[]): Uint8Array {
  return Uint8Array.from(hex);
}

function wavHeader(dataSize: number): Uint8Array {
  const header = new Uint8Array(44);
  header.set([0x52, 0x49, 0x46, 0x46], 0);
  header.set([0x57, 0x41, 0x56, 0x45], 8);
  header.set([0x64, 0x61, 0x74, 0x61], 36);
  const view = new DataView(header.buffer);
  view.setUint32(40, dataSize, true);
  return header;
}

describe('detectAudioFormat', () => {
  it('detects wav from RIFF/WAVE header', () => {
    expect(detectAudioFormat(wavHeader(100))).toBe('wav');
  });

  it('detects caf and aiff', () => {
    const caf = new Uint8Array(12);
    caf.set([0x63, 0x61, 0x66, 0x66], 0);
    expect(detectAudioFormat(caf)).toBe('caf');

    const aiff = new Uint8Array(12);
    aiff.set([0x46, 0x4f, 0x52, 0x4d], 0);
    aiff.set([0x41, 0x49, 0x46, 0x46], 8);
    expect(detectAudioFormat(aiff)).toBe('aiff');
  });

  it('detects m4a vs 3gp from ftyp brand', () => {
    const m4a = new Uint8Array(12);
    m4a.set([0x66, 0x74, 0x79, 0x70], 4);
    m4a.set([0x4d, 0x34, 0x41, 0x20], 8);
    expect(detectAudioFormat(m4a)).toBe('m4a');

    const threeGp = new Uint8Array(12);
    threeGp.set([0x66, 0x74, 0x79, 0x70], 4);
    threeGp.set([0x33, 0x67, 0x70, 0x34], 8);
    expect(detectAudioFormat(threeGp)).toBe('3gp');
  });

  it('returns null for tiny buffers', () => {
    expect(detectAudioFormat(bytes([1, 2, 3]))).toBeNull();
  });
});

describe('whisper format and language', () => {
  it('accepts wav/m4a and rejects caf/aiff/3gp', () => {
    expect(isWhisperSupportedFormat('wav')).toBe(true);
    expect(isWhisperSupportedFormat('m4a')).toBe(true);
    expect(isWhisperSupportedFormat('caf')).toBe(false);
    expect(isWhisperSupportedFormat('aiff')).toBe(false);
    expect(isWhisperSupportedFormat('3gp')).toBe(false);
  });

  it('maps product locales and ignores junk', () => {
    expect(whisperLanguageFromLocale('ru-RU')).toBe('ru');
    expect(whisperLanguageFromLocale('en')).toBe('en');
    expect(whisperLanguageFromLocale('xx')).toBeUndefined();
    expect(whisperLanguageFromLocale(undefined)).toBeUndefined();
  });

  it('treats punctuation-only transcripts as blank', () => {
    expect(isBlankTranscript('...')).toBe(true);
    expect(isBlankTranscript('  ')).toBe(true);
    expect(isBlankTranscript('полил')).toBe(false);
  });
});

describe('wavDataChunkSize', () => {
  it('reads the data chunk size', () => {
    expect(wavDataChunkSize(wavHeader(3200))).toBe(3200);
  });

  it('returns null for a truncated peek that never reaches data', () => {
    const truncated = new Uint8Array(20);
    truncated.set([0x52, 0x49, 0x46, 0x46], 0);
    truncated.set([0x57, 0x41, 0x56, 0x45], 8);
    expect(wavDataChunkSize(truncated)).toBeNull();
  });
});

describe('extensionForAudio', () => {
  it('prefers detected format over mime', () => {
    expect(extensionForAudio('wav', 'audio/m4a')).toBe('wav');
  });

  it('falls back to mime when magic is unknown', () => {
    expect(extensionForAudio(null, 'audio/wav')).toBe('wav');
    expect(extensionForAudio(null, 'audio/webm')).toBe('webm');
  });
});

function prepareError(body: Parameters<typeof prepareTranscribeInput>[0]) {
  const result = prepareTranscribeInput(body);
  return result.ok ? null : result.error;
}

describe('prepareTranscribeInput', () => {
  it('rejects missing, invalid, short, and caf payloads', () => {
    expect(prepareError({})).toBe('missing_audio');
    expect(prepareError({ audioBase64: '!!!!' })).toBe('invalid_base64');
    expect(prepareError({ audioBase64: Buffer.alloc(50, 1).toString('base64') })).toBe('audio_too_short');

    const caf = Buffer.alloc(900, 0);
    caf.set([0x63, 0x61, 0x66, 0x66], 0);
    expect(prepareError({ audioBase64: caf.toString('base64') })).toBe('invalid_audio');
  });

  it('accepts a data-URI wav with enough payload', () => {
    const wav = Buffer.alloc(4000, 0);
    wav.set([0x52, 0x49, 0x46, 0x46], 0);
    wav.set([0x57, 0x41, 0x56, 0x45], 8);
    wav.set([0x64, 0x61, 0x74, 0x61], 36);
    wav.writeUInt32LE(3900, 40);
    const wrapped = `data:audio/wav;base64,${wav.toString('base64')}`;
    const result = prepareTranscribeInput({ audioBase64: wrapped, mimeType: 'audio/m4a', language: 'en-US' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ext).toBe('wav');
      expect(result.language).toBe('en');
    }
  });

  it('rejects an empty wav data chunk', () => {
    const wav = Buffer.alloc(900, 0);
    wav.set([0x52, 0x49, 0x46, 0x46], 0);
    wav.set([0x57, 0x41, 0x56, 0x45], 8);
    wav.set([0x64, 0x61, 0x74, 0x61], 36);
    wav.writeUInt32LE(0, 40);
    expect(prepareError({ audioBase64: wav.toString('base64') })).toBe('audio_too_short');
  });
});

describe('classifyVoiceError', () => {
  it('classifies API codes and transport failures', () => {
    expect(classifyVoiceError('transcription_failed')).toBe('failed');
    expect(classifyVoiceError('audio_too_short')).toBe('too_short');
    expect(classifyVoiceError('400 Audio file is too short. Minimum audio length is 0.1 seconds.')).toBe(
      'too_short',
    );
    expect(classifyVoiceError('Network request failed')).toBe('network');
    expect(classifyVoiceError('Not signed in')).toBe('auth');
    expect(classifyVoiceError('Microphone permission required')).toBe('mic');
    expect(classifyVoiceError('EXPO_PUBLIC_API_BASE_URL is not configured')).toBe('unavailable');
    expect(classifyVoiceError('openai_not_configured')).toBe('unavailable');
  });
});
