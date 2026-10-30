import { CycleNewForm } from '@/components/cycle/CycleNewForm';
import { useMobileLocale } from '@/context/LocaleContext';
import { Stack, useRouter } from 'expo-router';

export default function CycleNewScreen() {
  const { strings } = useMobileLocale();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: strings.cycle.formTitleNew }} />
      <CycleNewForm
        onSubmitted={(cycleId) => {
          if (cycleId) {
            router.replace({ pathname: '/cycle/labels', params: { cycleId } });
            return;
          }
          router.back();
        }}
      />
    </>
  );
}
