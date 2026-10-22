import { sanitizeAssignment, type VpdSourceAssignment } from '@growlog/domain';

const PREFIX = 'growlog:vpd-sources:';

export function loadVpdSourceAssignment(farmId: string): VpdSourceAssignment | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${farmId}`);
    if (!raw) return null;
    return sanitizeAssignment(JSON.parse(raw));
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
