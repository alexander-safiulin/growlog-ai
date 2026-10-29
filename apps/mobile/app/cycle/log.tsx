import { CycleLogForm } from '@/components/cycle/CycleLogForm';
import { CycleProcedureForm } from '@/components/cycle/CycleProcedureForm';
import { useMobileLocale } from '@/context/LocaleContext';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

export default function CycleLogScreen() {
  const { kind, date } = useLocalSearchParams<{ kind?: string; date?: string }>();
  const prefillDate =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  const isProcedure = kind === 'procedure';
  const entryKind = kind === 'feeding' ? 'feeding' : 'watering';
  const { strings } = useMobileLocale();
  const router = useRouter();
  const title = isProcedure
    ? strings.cycle.logTitleProcedure
    : entryKind === 'feeding'
      ? strings.cycle.logTitleFeed
      : strings.cycle.logTitleWater;

  return (
    <>
      <Stack.Screen options={{ title }} />
      {isProcedure ? (
        <CycleProcedureForm prefillDate={prefillDate} onSubmitted={() => router.back()} />
      ) : (
        <CycleLogForm
          entryKind={entryKind}
          prefillDate={prefillDate}
          onSubmitted={() => router.back()}
        />
      )}
    </>
  );
}
