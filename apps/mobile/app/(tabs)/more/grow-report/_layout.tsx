import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { stackScreenOptions } from '@/lib/mobile-theme';
import { Stack, router } from 'expo-router';
import { Pressable, Text } from 'react-native';

function leaveGrowReportHub() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)/more');
}

export default function GrowReportLayout() {
  const { colors } = useTheme();
  const { strings } = useMobileLocale();
  const backLabel = strings.login.back;
  return (
    <Stack screenOptions={{ ...stackScreenOptions(colors), headerShown: true }}>
      <Stack.Screen
        name="index"
        options={{
          title: strings.growReport.title,
          headerBackVisible: false,
          headerLeft: ({ tintColor }) => (
            <Pressable
              onPress={leaveGrowReportHub}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={backLabel}
            >
              <Text style={{ color: tintColor ?? colors.primary, fontSize: 17 }}>{`‹ ${backLabel}`}</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="[id]" options={{ title: strings.growReport.title, headerBackTitle: backLabel }} />
    </Stack>
  );
}
