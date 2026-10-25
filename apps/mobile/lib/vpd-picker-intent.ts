export type VpdPickerIntent = 'air' | 'leaf' | 'rh';

const TTL_MS = 10 * 60 * 1000;

let pending: { mode: VpdPickerIntent; at: number } | null = null;

export function armVpdSensorPicker(mode: VpdPickerIntent): void {
  pending = { mode, at: Date.now() };
}

export function peekVpdSensorPicker(): VpdPickerIntent | null {
  if (!pending) return null;
  if (Date.now() - pending.at > TTL_MS) {
    pending = null;
    return null;
  }
  return pending.mode;
}

export function consumeVpdSensorPicker(): VpdPickerIntent | null {
  const mode = peekVpdSensorPicker();
  pending = null;
  return mode;
}
