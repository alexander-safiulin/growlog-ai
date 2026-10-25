import { useTheme } from '@/context/ThemeContext';
import { stackScreenOptions } from '@/lib/mobile-theme';
import { Stack } from 'expo-router';

export default function SopStackLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="new" options={{ title: 'New SOP' }} />
      <Stack.Screen name="run/[id]" options={{ title: 'SOP execution' }} />
    </Stack>
  );
}
