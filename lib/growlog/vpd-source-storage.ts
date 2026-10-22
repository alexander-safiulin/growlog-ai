import type { VpdSourceAssignment } from '@growlog/domain';

const PREFIX = 'growlog:vpd-sources:';

export function loadVpdSourceAssignment(farmId: string): VpdSourceAssignment | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${farmId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VpdSourceAssignment;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      airTemp: parsed.airTemp ?? null,
      leafTemp: parsed.leafTemp ?? null,
      rh: parsed.rh ?? null,
    };
  } catch {
    return null;
  }
}

export function saveVpdSourceAssignment(farmId: string, assignment: VpdSourceAssignment): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${PREFIX}${farmId}`, JSON.stringify(assignment));
  } catch {
    /* quota / private mode */
  }
}
