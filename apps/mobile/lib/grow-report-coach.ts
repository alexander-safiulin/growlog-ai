import AsyncStorage from '@react-native-async-storage/async-storage';

const COACH_KEY = 'growlog.grow-report.editor-coach.v1';

export async function isGrowReportCoachDismissed(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(COACH_KEY);
  return raw === '1';
}

export async function dismissGrowReportCoach(): Promise<void> {
  await AsyncStorage.setItem(COACH_KEY, '1');
}
