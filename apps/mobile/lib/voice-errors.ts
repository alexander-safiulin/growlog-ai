import { classifyVoiceError } from '@growlog/web-lib/voice/classify-voice-error';

export type VoiceErrorCopy = {
  procedureVoiceFailed: string;
  procedureVoiceTooShort: string;
  procedureVoiceEmpty: string;
  procedureVoiceBadAudio: string;
  procedureVoiceNeedSignIn: string;
  procedureVoiceNetwork: string;
  procedureVoiceMicDenied: string;
  procedureVoiceNoFile: string;
  procedureVoiceTooLarge: string;
  procedureVoiceUnavailable: string;
};

const FALLBACK: VoiceErrorCopy = {
  procedureVoiceFailed: 'Transcription failed. Try again.',
  procedureVoiceTooShort: 'Recording is too short. Speak for at least a second.',
  procedureVoiceEmpty: 'Could not hear speech. Try again closer to the mic.',
  procedureVoiceBadAudio: 'Could not read the recording. Try again.',
  procedureVoiceNeedSignIn: 'Sign in to use voice input.',
  procedureVoiceNetwork: 'No network. Check the connection and try again.',
  procedureVoiceMicDenied: 'Microphone permission is required.',
  procedureVoiceNoFile: 'Recording file is missing. Try again.',
  procedureVoiceTooLarge: 'Recording is too large. Keep it under two minutes.',
  procedureVoiceUnavailable: 'Voice transcription is unavailable right now.',
};

export function mapVoiceApiError(message: string, copy: VoiceErrorCopy = FALLBACK): string {
  switch (classifyVoiceError(message)) {
    case 'auth':
      return copy.procedureVoiceNeedSignIn;
    case 'too_short':
      return copy.procedureVoiceTooShort;
    case 'empty':
      return copy.procedureVoiceEmpty;
    case 'bad_audio':
      return copy.procedureVoiceBadAudio;
    case 'too_large':
      return copy.procedureVoiceTooLarge;
    case 'network':
      return copy.procedureVoiceNetwork;
    case 'mic':
      return copy.procedureVoiceMicDenied;
    case 'no_file':
      return copy.procedureVoiceNoFile;
    case 'unavailable':
      return copy.procedureVoiceUnavailable;
    case 'failed':
      return copy.procedureVoiceFailed;
    default:
      return message.trim() || copy.procedureVoiceFailed;
  }
}
