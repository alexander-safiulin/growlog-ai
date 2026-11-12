import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { stackScreenOptions } from '@/lib/mobile-theme';
import { Stack } from 'expo-router';

export default function GrowReportLayout() {
  const { colors } = useTheme();
  const { strings } = useMobileLocale();
  return (
    <Stack screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="index" options={{ title: strings.growReport.title }} />
      <Stack.Screen name="[id]" options={{ title: strings.growReport.title }} />
    </Stack>
  );
}
