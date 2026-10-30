import {
  CycleFormCard,
  CycleFormErrors,
  CycleFormLabel,
  CycleFormPrimaryButton,
  CycleFormTextButton,
} from '@/components/cycle/cycle-form-ui';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  growerStageLabelRu,
  immediateNextStage,
  mapGrowCycleRpcError,
  stageAdvanceLabel,
  stagesForStartMaterial,
  transitionGrowCycleStage,
  type GrowCycleStage,
} from '@growlog/domain';
import { harvestAdvanceSymbol, stageAdvanceSymbol } from '@/lib/stage-advance-symbol';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  const currentStage = cycle.stage as GrowCycleStage;
  const nextStage = immediateNextStage(currentStage, material);
  const stageOptions = stagesForStartMaterial(material);
  const currentLabel = growerStageLabelRu(currentStage);
  const stepHint =
    currentStage === 'flower' || currentStage === 'drying' || currentStage === 'curing'
      ? copy.stageStepHint[currentStage]
      : null;

  function advanceLabel(to: GrowCycleStage) {
    return stageAdvanceLabel(currentStage, to, {
      stageAdvance: copy.stageAdvance,
      stageAdvanceHarvest: copy.stageAdvanceHarvest,
    });
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

  if (!nextStage && cycle.stage === 'completed') {
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
        {nextStage ? (
          <View style={styles.actions}>
            <StageActionRow
              stage={nextStage}
              harvestStep={currentStage === 'flower' && nextStage === 'drying'}
              label={advanceLabel(nextStage)}
              disabled={pending}
              onPress={() => void go(nextStage)}
            />
          </View>
        ) : null}
        {stepHint ? <Text style={styles.stepHint}>{stepHint}</Text> : null}
        <CycleFormTextButton label={copy.fixStage} onPress={() => setFixOpen((v) => !v)} disabled={pending} />
        {fixOpen ? (
          <>
            <View style={styles.actions}>
              {stageOptions.map((s) => (
                <StageActionRow
                  key={s}
                  stage={s}
                  label={growerStageLabelRu(s)}
                  selected={fixStage === s}
                  disabled={pending}
                  onPress={() => setFixStage(s)}
                />
              ))}
            </View>
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

function StageActionRow({
  stage,
  harvestStep,
  label,
  selected,
  disabled,
  onPress,
}: {
  stage: GrowCycleStage;
  harvestStep?: boolean;
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const iconColor = selected ? colors.primaryText : colors.textMuted;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      style={[styles.row, selected && styles.rowSelected, disabled && styles.rowDisabled]}
    >
      <SymbolView
        name={harvestStep ? harvestAdvanceSymbol() : stageAdvanceSymbol(stage)}
        tintColor={iconColor}
        size={18}
        weight="medium"
      />
      <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    currentStage: { fontSize: 15, color: c.textMuted, marginTop: -4 },
    stepHint: { fontSize: 13, lineHeight: 18, color: c.textMuted },
    actions: { gap: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.surfaceMuted,
    },
    rowSelected: { backgroundColor: c.primary },
    rowDisabled: { opacity: 0.5 },
    rowLabel: { fontSize: 15, fontWeight: '500', color: c.text },
    rowLabelSelected: { color: c.primaryText },
  });
}
