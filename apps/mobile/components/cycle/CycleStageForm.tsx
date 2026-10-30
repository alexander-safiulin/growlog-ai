import { CycleFormMuted, CycleFormScreen } from '@/components/cycle/cycle-form-ui';
import { CycleStageChangeContent } from '@/components/cycle/CycleStageChangeContent';
import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';

export function CycleStageForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const { strings } = useMobileLocale();
  const copy = strings.cycle;
  const { cycle, isLocalWorkspace } = useFarmContext();

  if (isLocalWorkspace) {
    return <CycleFormMuted>{copy.noActive}</CycleFormMuted>;
  }

  if (!cycle) {
    return <CycleFormMuted>{copy.noActive}</CycleFormMuted>;
  }

  return (
    <CycleFormScreen>
      <CycleStageChangeContent onSuccess={onSubmitted} />
    </CycleFormScreen>
  );
}
