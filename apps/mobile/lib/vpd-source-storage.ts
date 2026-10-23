import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  sanitizeAssignment,
  type VpdLeafMode,
  type VpdPersistedSources,
  type VpdSourceAssignment,
} from '@growlog/domain';

const PREFIX = 'growlog:vpd-sources:v2:';

export type VpdStorageScope = {
  farmId: string;
  cycleId: string | null;
  zoneId: string | null;
};

function scopeKey(scope: VpdStorageScope): string {
  return `${PREFIX}${scope.farmId}:${scope.cycleId ?? ''}:${scope.zoneId ?? ''}`;
}

export function parseVpdLocalPayload(raw: string): VpdPersistedSources | null {
  try {
    const parsed = JSON.parse(raw) as { assignment?: unknown; leafMode?: VpdLeafMode };
    const assignment = sanitizeAssignment(parsed.assignment);
    if (!assignment) return null;
    const leafMode =
      parsed.leafMode === 'sensor' || parsed.leafMode === 'estimated' || parsed.leafMode === 'none'
        ? parsed.leafMode
        : 'none';
    return { assignment, leafMode };
  } catch {
    return null;
  }
}

export async function loadVpdSourceAssignment(
  scope: VpdStorageScope
): Promise<VpdPersistedSources | null> {
  try {
    const raw = await AsyncStorage.getItem(scopeKey(scope));
    if (!raw) return null;
    return parseVpdLocalPayload(raw);
  } catch {
    return null;
  }
}

export async function saveVpdSourceAssignment(
  scope: VpdStorageScope,
  sources: VpdPersistedSources
): Promise<void> {
  try {
    await AsyncStorage.setItem(scopeKey(scope), JSON.stringify(sources));
  } catch {
    /* storage full */
  }
}

/** @deprecated */
export async function loadVpdSourceAssignmentLegacy(farmId: string): Promise<VpdSourceAssignment | null> {
  const scoped = await loadVpdSourceAssignment({ farmId, cycleId: null, zoneId: null });
  return scoped?.assignment ?? null;
}
