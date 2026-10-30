import {
  AudioModule,
  AudioQuality,
  IOSOutputFormat,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
} from 'expo-audio';
import { Platform } from 'react-native';

// Whisper accepts wav; iOS Simulator MPEG4AAC/.m4a is often rejected as invalid format.
const IOS_WHISPER_OPTIONS = {
  extension: '.wav',
  sampleRate: 16_000,
  numberOfChannels: 1,
  bitRate: 256_000,
  isMeteringEnabled: true,
  ios: {
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.MAX,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: RecordingPresets.HIGH_QUALITY.android,
  web: RecordingPresets.HIGH_QUALITY.web,
};

export function mimeTypeFromRecordingUri(uri: string): string {
  const path = uri.split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.wav')) return 'audio/wav';
  if (path.endsWith('.m4a') || path.endsWith('.mp4') || path.endsWith('.aac')) return 'audio/m4a';
  if (path.endsWith('.caf')) return 'audio/x-caf';
  if (path.endsWith('.webm')) return 'audio/webm';
  if (path.endsWith('.3gp') || path.endsWith('.3gpp')) return 'audio/3gpp';
  return Platform.OS === 'ios' ? 'audio/wav' : 'audio/m4a';
}

export async function startVoiceRecording(): Promise<AudioRecorder> {
  const { granted } = await requestRecordingPermissionsAsync();
  if (!granted) {
    throw new Error('Microphone permission required');
  }
  try {
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    const options =
      Platform.OS === 'ios'
        ? IOS_WHISPER_OPTIONS
        : { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };
    const recorder = new AudioModule.AudioRecorder(options);
    await recorder.prepareToRecordAsync();
    recorder.record();
    return recorder;
  } catch (e) {
    try {
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      // keep original start error
    }
    throw e;
  }
}

export async function stopVoiceRecording(recorder: AudioRecorder): Promise<string> {
  await recorder.stop();
  await setAudioModeAsync({ allowsRecording: false });
  const uri = recorder.uri;
  if (!uri) {
    throw new Error('No recording file');
  }
  return uri;
}

export async function discardVoiceRecording(recorder: AudioRecorder): Promise<void> {
  try {
    await recorder.stop();
  } catch {
    // already stopped
  }
  await setAudioModeAsync({ allowsRecording: false });
}
