import { Platform, Vibration } from 'react-native';

/** Short buzz when an action is ignored because another is in flight. */
export function lightTapIgnored() {
  if (Platform.OS === 'web') return;
  if (Platform.OS === 'ios') {
    Vibration.vibrate();
    return;
  }
  Vibration.vibrate(16);
}
