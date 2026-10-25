import { useTheme } from '@/context/ThemeContext';
import { stackScreenOptions } from '@/lib/mobile-theme';
import { Stack } from 'expo-router';

export default function CaptureLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ ...stackScreenOptions(colors), headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Capture' }} />
      <Stack.Screen name="text" options={{ title: 'Text log' }} />
      <Stack.Screen name="voice" options={{ title: 'Voice log' }} />
      <Stack.Screen name="photo" options={{ title: 'Photo log' }} />
      <Stack.Screen name="sensor" options={{ title: 'Sensor reading' }} />
    </Stack>
  );
}
