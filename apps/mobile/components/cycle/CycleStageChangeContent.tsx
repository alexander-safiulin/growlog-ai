import {
  CycleFormCard,
  CycleFormChip,
  CycleFormChipRow,
  CycleFormErrors,
  CycleFormLabel,
  CycleFormPrimaryButton,
  CycleFormTextButton,
} from '@/components/cycle/cycle-form-ui';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  forwardStagesFrom,
  growerStageLabelRu,
  mapGrowCycleRpcError,
  stagesForStartMaterial,
  transitionGrowCycleStage,
  type GrowCycleStage,
} from '@growlog/domain';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function CycleStageChangeContent({ onSuccess }: { onSuccess?: () => void }) {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cycle;
  const { supabase, farmId, cycle, scopeId, refetchAll, isLocalWorkspace } = useFarmContext();
  const [fixOpen, setFixOpen] = useState(false);
  const [fixStage, setFixStage] = useState<GrowCycleStage | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!cycle || !farmId || !scopeId || isLocalWorkspace) return null;

  const material = cycle.start_material === 'clone' ? 'clone' : 'seed';
  const forward = forwardStagesFrom(cycle.stage as GrowCycleStage, material);
  const stageOptions = stagesForStartMaterial(material);
  const currentLabel = growerStageLabelRu(cycle.stage as GrowCycleStage);

  function stageLabel(s: GrowCycleStage) {
    return copy.stageAdvance[s];
  }

  async function go(stage: GrowCycleStage, allowBackward = false) {
    setError(null);
    setPending(true);
    try {
      await transitionGrowCycleStage(supabase, {
        farmId: farmId!,
        cycleId: cycle!.id,
        scopeId: scopeId!,
        newStage: stage,
        allowBackward,
      });
      refetchAll();
      setFixOpen(false);
      setFixStage('');
      onSuccess?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : strings.manualReading.saveFailed;
      setError(mapGrowCycleRpcError(msg));
    } finally {
      setPending(false);
    }
  }

  if (!forward.length && cycle.stage === 'completed') {
    return (
      <CycleFormCard>
        <CycleFormLabel>{copy.stageActionsTitle}</CycleFormLabel>
        <Text style={styles.currentStage}>{currentLabel}</Text>
      </CycleFormCard>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <CycleFormCard>
        <CycleFormLabel>{copy.stageActionsTitle}</CycleFormLabel>
        <Text style={styles.currentStage}>{currentLabel}</Text>
        {forward.length ? (
          <>
            <CycleFormChipRow>
              {forward.map((s) => (
                <CycleFormChip
                  key={s}
                  label={stageLabel(s)}
                  selected={false}
                  disabled={pending}
                  onPress={() => void go(s)}
                />
              ))}
            </CycleFormChipRow>
          </>
        ) : null}
        <CycleFormTextButton label={copy.fixStage} onPress={() => setFixOpen((v) => !v)} disabled={pending} />
        {fixOpen ? (
          <>
            <CycleFormChipRow>
              {stageOptions.map((s) => (
                <CycleFormChip
                  key={s}
                  label={growerStageLabelRu(s)}
                  selected={fixStage === s}
                  disabled={pending}
                  onPress={() => setFixStage(s)}
                />
              ))}
            </CycleFormChipRow>
            <CycleFormPrimaryButton
              label={copy.fixStageApply}
              onPress={() => fixStage && void go(fixStage, true)}
              pending={pending}
              disabled={!fixStage || pending}
            />
          </>
        ) : null}
      </CycleFormCard>
      <CycleFormErrors error={error} />
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    currentStage: { fontSize: 15, color: c.textMuted, marginTop: -4 },
  });
}
