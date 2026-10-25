import { useTheme } from '@/context/ThemeContext';
import { stackScreenOptions } from '@/lib/mobile-theme';
import { Stack } from 'expo-router';

export default function MoreLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="index" options={{ title: 'More' }} />
      <Stack.Screen name="photos" options={{ title: 'Photos' }} />
      <Stack.Screen name="sensors" options={{ title: 'Sensors' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="reports" options={{ headerShown: false }} />
      <Stack.Screen name="cycle" options={{ headerShown: true }} />
      <Stack.Screen name="cycle-new" options={{ headerShown: true }} />
      <Stack.Screen name="cycle-log" options={{ headerShown: true }} />
    </Stack>
  );
}
