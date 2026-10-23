import { CycleLogForm } from '@/components/cycle/CycleLogForm';
import { useMobileLocale } from '@/context/LocaleContext';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

export default function CycleLogScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const entryKind = kind === 'feeding' ? 'feeding' : 'watering';
  const { strings } = useMobileLocale();
  const router = useRouter();
  const title = entryKind === 'feeding' ? strings.cycle.logTitleFeed : strings.cycle.logTitleWater;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <CycleLogForm entryKind={entryKind} onSubmitted={() => router.back()} />
    </>
  );
}
