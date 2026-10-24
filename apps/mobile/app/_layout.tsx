import '@/lib/install-web-crypto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { LocaleProvider } from '@/context/LocaleContext';
import { FarmProvider, useFarmContext } from '@/providers/FarmProvider';
import { OfflineSyncProvider } from '@/providers/OfflineSyncProvider';
import { attachNotificationListeners, registerForPushNotifications } from '@/lib/notifications';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <FarmProvider>
          <OfflineSyncProvider>
            <AuthGate />
            <NotificationBootstrap />
            <RootStack />
          </OfflineSyncProvider>
        </FarmProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

function NotificationBootstrap() {
  const { userId, supabase } = useFarmContext();

  useEffect(() => {
    if (!userId) return;
    void registerForPushNotifications(supabase).catch(() => undefined);
    return attachNotificationListeners();
  }, [userId, supabase]);

  return null;
}

function AuthGate() {
  const { userId, authLoading, farmListReady, farms, isLocalWorkspace } = useFarmContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (userId && inAuth) {
      if (farmListReady && farms.length === 0 && !isLocalWorkspace) {
        router.replace('/(onboarding)');
      } else {
        router.replace('/(tabs)');
      }
      return;
    }

    if (userId && !inOnboarding && !inAuth && farmListReady && farms.length === 0 && !isLocalWorkspace) {
      router.replace('/(onboarding)');
    }
  }, [authLoading, userId, farmListReady, farms.length, isLocalWorkspace, segments, router]);

  return null;
}

function RootStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="capture" options={{ presentation: 'modal' }} />
      <Stack.Screen name="sop" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
