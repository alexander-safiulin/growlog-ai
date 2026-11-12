import { speakVoice } from '@growlog/api-client';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

let activePlayer: AudioPlayer | null = null;

type SpeechModule = typeof import('expo-speech');
let speechModulePromise: Promise<SpeechModule | null> | null = null;

function loadSpeechModule(): Promise<SpeechModule | null> {
  if (!speechModulePromise) {
    speechModulePromise = import('expo-speech').catch(() => null);
  }
  return speechModulePromise;
}

function speakOnDevice(
  Speech: SpeechModule,
  text: string,
  language?: string
): Promise<void> {
  const maxLen =
    typeof Speech.maxSpeechInputLength === 'number'
      ? Math.min(Speech.maxSpeechInputLength, 4096)
      : 4096;
  const capped = text.slice(0, Math.min(text.length, maxLen));
  return new Promise((resolve, reject) => {
    Speech.speak(capped, {
      language,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: (err) => reject(err),
    });
  });
}

async function speakRemote(token: string, trimmed: string): Promise<void> {
  if (activePlayer) {
    activePlayer.pause();
    activePlayer.remove();
    activePlayer = null;
  }

  await setAudioModeAsync({ playsInSilentMode: true });

  const buffer = await speakVoice(token, trimmed);
  const file = new File(Paths.cache, `growlog-tts-${Date.now()}.mp3`);
  file.create();
  file.write(new Uint8Array(buffer));

  const player = createAudioPlayer({ uri: file.uri });
  activePlayer = player;
  player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) {
      player.remove();
      if (activePlayer === player) activePlayer = null;
      try {
        file.delete();
      } catch {
        // cache cleanup best-effort
      }
    }
  });
  player.play();
}

export async function speakText(
  token: string,
  text: string,
  options?: { language?: string }
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  const Speech = await loadSpeechModule();
  if (Speech) {
    try {
      await Speech.stop();
    } catch {
      // native module absent until dev client rebuild
    }
  }

  try {
    await speakRemote(token, trimmed);
  } catch {
    if (Speech) {
      try {
        await speakOnDevice(Speech, trimmed, options?.language);
      } catch {
        // no device TTS
      }
    }
  }
}

export async function stopSpeaking(): Promise<void> {
  if (activePlayer) {
    activePlayer.pause();
    activePlayer.remove();
    activePlayer = null;
  }
  const Speech = await loadSpeechModule();
  if (!Speech) return;
  try {
    await Speech.stop();
  } catch {
    // ignore
  }
}
