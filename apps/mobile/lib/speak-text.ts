import { speakVoice } from '@growlog/api-client';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';

let activePlayer: AudioPlayer | null = null;

export async function speakText(token: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

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

export async function stopSpeaking(): Promise<void> {
  if (!activePlayer) return;
  activePlayer.pause();
  activePlayer.remove();
  activePlayer = null;
}
