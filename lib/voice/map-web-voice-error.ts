import { classifyVoiceError } from '@/lib/voice/classify-voice-error';

export function mapWebVoiceError(message: string, t: (key: string) => string): string {
  switch (classifyVoiceError(message)) {
    case 'auth':
      return t('voice.noSession');
    case 'too_short':
    case 'empty':
      return t('voice.emptyTranscript');
    case 'mic':
      return t('voice.micDenied');
    case 'network':
      return t('common.network');
    case 'bad_audio':
    case 'too_large':
    case 'no_file':
    case 'unavailable':
    case 'failed':
      return t('voice.transcribeFailed');
    default:
      return message.trim() || t('voice.transcribeFailed');
  }
}
