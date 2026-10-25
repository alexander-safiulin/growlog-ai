import SensorsScreen from '../(tabs)/more/sensors';
import { useFarmContext } from '@/providers/FarmProvider';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

/** Manual reading inside the capture sheet. Guests get the normal sign-in screen. */
export default function CaptureSensorScreen() {
  const { userId, authLoading } = useFarmContext();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !userId) {
      router.replace('/(auth)/login?reason=sensors&next=sensor');
    }
  }, [authLoading, userId, router]);

  if (authLoading || !userId) return null;
  return <SensorsScreen />;
}
