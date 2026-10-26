import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { stackScreenOptions } from '@/lib/mobile-theme';
import { Stack } from 'expo-router';

export default function MoreLayout() {
  const { colors } = useTheme();
  const { strings } = useMobileLocale();
  return (
    <Stack screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="index" options={{ title: strings.tabs.more }} />
      <Stack.Screen name="photos" options={{ title: strings.more.photos }} />
      <Stack.Screen name="sensors" options={{ title: strings.more.sensors }} />
      <Stack.Screen name="settings" options={{ title: strings.more.settings }} />
      <Stack.Screen name="reports" options={{ headerShown: false }} />
      <Stack.Screen name="handover" options={{ title: strings.more.handover }} />
      <Stack.Screen name="nutrient" options={{ title: strings.more.nutrient }} />
    </Stack>
  );
}
