/** Map expo-audio recorder metering (typically dB, about -160…0) to 0…1. */
export function normalizeRecorderMeter(metering: number | undefined): number {
  if (metering == null || !Number.isFinite(metering)) return 0;
  const minDb = -60;
  const maxDb = 0;
  const clamped = Math.max(minDb, Math.min(maxDb, metering));
  return (clamped - minDb) / (maxDb - minDb);
}

export function formatRecordingClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}
