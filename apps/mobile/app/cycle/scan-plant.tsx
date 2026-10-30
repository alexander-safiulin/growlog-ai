import { useVisionCapture } from '@/context/VisionCaptureContext';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

/** Deep link helper: opens the center-tab eye scanner overlay. */
export default function CycleScanPlantScreen() {
  const { setEyeMode } = useVisionCapture();
  const router = useRouter();

  useEffect(() => {
    setEyeMode(true);
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/assistant');
  }, [router, setEyeMode]);

  return <Stack.Screen options={{ headerShown: false }} />;
}
