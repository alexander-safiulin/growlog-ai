import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VpdSourceAssignment } from '@growlog/domain';

const PREFIX = 'growlog:vpd-sources:';

export async function loadVpdSourceAssignment(farmId: string): Promise<VpdSourceAssignment | null> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${farmId}`);
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

export async function saveVpdSourceAssignment(
  farmId: string,
  assignment: VpdSourceAssignment
): Promise<void> {
  try {
    await AsyncStorage.setItem(`${PREFIX}${farmId}`, JSON.stringify(assignment));
  } catch {
    /* storage full */
  }
}
