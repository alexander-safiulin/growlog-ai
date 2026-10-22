import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitizeAssignment, type VpdSourceAssignment } from '@growlog/domain';

const PREFIX = 'growlog:vpd-sources:';

export async function loadVpdSourceAssignment(farmId: string): Promise<VpdSourceAssignment | null> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${farmId}`);
    if (!raw) return null;
    return sanitizeAssignment(JSON.parse(raw));
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
