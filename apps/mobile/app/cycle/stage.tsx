import { CycleStageForm } from '@/components/cycle/CycleStageForm';
import { useMobileLocale } from '@/context/LocaleContext';
import { Stack, useRouter } from 'expo-router';

export default function CycleStageScreen() {
  const { strings } = useMobileLocale();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: strings.timelineScreen.changeStage }} />
      <CycleStageForm onSubmitted={() => router.back()} />
    </>
  );
}
