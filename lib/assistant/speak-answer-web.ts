let activeAudio: HTMLAudioElement | null = null;

export async function speakAdvisorAnswer(token: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed || typeof window === 'undefined') return;

  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }

  const res = await fetch('/api/voice/speak', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: trimmed }),
  });
  if (!res.ok) return;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  activeAudio = audio;
  audio.onended = () => {
    URL.revokeObjectURL(url);
    if (activeAudio === audio) activeAudio = null;
  };
  await audio.play();
}

export function stopAdvisorSpeech(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
}
