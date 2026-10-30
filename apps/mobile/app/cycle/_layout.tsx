import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { stackScreenOptions } from '@/lib/mobile-theme';
import { Stack } from 'expo-router';

export default function CycleLayout() {
  const { colors } = useTheme();
  const { strings } = useMobileLocale();
  return (
    <Stack screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="log" options={{ title: strings.cycle.logTitleWater }} />
      <Stack.Screen name="new" options={{ title: strings.cycle.formTitleNew }} />
      <Stack.Screen name="stage" options={{ title: strings.timelineScreen.changeStage }} />
      <Stack.Screen name="labels" options={{ title: strings.cycle.plantLabelsTitle }} />
      <Stack.Screen name="scan-plant" options={{ title: strings.cycle.scanPlantTitle }} />
    </Stack>
  );
}
