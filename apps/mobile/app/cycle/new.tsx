import { CycleNewForm } from '@/components/cycle/CycleNewForm';
import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';
import { LOCAL_WORKSPACE_IDS } from '@growlog/domain';
import { Stack, useRouter } from 'expo-router';

export default function CycleNewScreen() {
  const { strings } = useMobileLocale();
  const router = useRouter();
  const { isLocalWorkspace } = useFarmContext();
  return (
    <>
      <Stack.Screen options={{ title: strings.cycle.formTitleNew }} />
      <CycleNewForm
        onSubmitted={(cycleId) => {
          if (isLocalWorkspace || cycleId === LOCAL_WORKSPACE_IDS.cycle) {
            router.back();
            return;
          }
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
