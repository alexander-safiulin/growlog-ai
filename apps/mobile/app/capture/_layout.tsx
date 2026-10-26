import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { stackScreenOptions } from '@/lib/mobile-theme';
import { Stack, router } from 'expo-router';
import { Pressable, Text } from 'react-native';

function leaveCaptureModal() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/(tabs)');
}

export default function CaptureLayout() {
  const { colors } = useTheme();
  const { strings } = useMobileLocale();
  const cancelLabel = strings.commonMobile.cancel;

  return (
    <Stack screenOptions={{ ...stackScreenOptions(colors), headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Capture' }} />
      <Stack.Screen name="text" options={{ title: 'Text log' }} />
      <Stack.Screen name="voice" options={{ title: 'Voice log' }} />
      <Stack.Screen name="photo" options={{ title: 'Photo log' }} />
      <Stack.Screen
        name="sensor"
        options={({ navigation }) => {
          // Direct /capture/sensor is the first route, so the native chevron is omitted.
          // headerBackVisible has no effect there, and canGoBack() stays true via the parent modal.
          const atStackRoot = navigation.getState().index === 0;
          return {
            title: 'Sensor reading',
            ...(atStackRoot
              ? {
                  headerLeft: ({ tintColor }) => (
                    <Pressable onPress={leaveCaptureModal} hitSlop={12} accessibilityRole="button">
                      <Text style={{ color: tintColor ?? colors.primary, fontSize: 17 }}>{cancelLabel}</Text>
                    </Pressable>
                  ),
                }
              : {}),
          };
        }}
      />
    </Stack>
  );
}
