import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioRecorder,
} from 'expo-audio';

export async function startVoiceRecording(): Promise<AudioRecorder> {
  const { granted } = await requestRecordingPermissionsAsync();
  if (!granted) {
    throw new Error('Microphone permission required');
  }
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
  await recorder.prepareToRecordAsync();
  recorder.record();
  return recorder;
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
