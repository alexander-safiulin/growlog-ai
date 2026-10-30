export type VoiceErrorKind =
  | 'auth'
  | 'too_short'
  | 'empty'
  | 'bad_audio'
  | 'too_large'
  | 'network'
  | 'mic'
  | 'no_file'
  | 'unavailable'
  | 'failed'
  | 'other';

export function classifyVoiceError(message: string): VoiceErrorKind {
  const key = message.trim().toLowerCase();
  if (
    key === 'not signed in' ||
    key === 'unauthorized' ||
    key === 'missing_authorization' ||
    key.includes('not authenticated') ||
    key.includes('jwt')
  ) {
    return 'auth';
  }
  if (key === 'audio_too_short' || key.includes('too short')) return 'too_short';
  if (key === 'empty_transcription' || key === 'empty transcript') return 'empty';
  if (
    key === 'invalid_audio' ||
    key === 'invalid_base64' ||
    key === 'caf_not_supported' ||
    key === 'missing_audio' ||
    key.includes('invalid file format')
  ) {
    return 'bad_audio';
  }
  if (key === 'audio_too_large' || key.includes('413')) return 'too_large';
  if (
    key.includes('network request failed') ||
    key.includes('failed to fetch') ||
    key === 'common.network' ||
    key.endsWith('network error')
  ) {
    return 'network';
  }
  if (key.includes('microphone permission') || key.includes('mic')) {
    if (key.includes('permission') || key.includes('denied') || key.includes('access')) return 'mic';
  }
  if (key === 'no recording file' || key === 'no recording') return 'no_file';
  if (
    key === 'openai_not_configured' ||
    key.includes('expo_public_api_base_url') ||
    key.includes('api_base_url is not configured')
  ) {
    return 'unavailable';
  }
  if (key === 'transcription_failed' || key === 'voice failed' || key === 'transcribe failed') {
    return 'failed';
  }
  return 'other';
}
