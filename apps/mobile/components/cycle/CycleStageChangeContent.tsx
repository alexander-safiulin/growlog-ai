import {
  CycleFormCard,
  CycleFormErrors,
  CycleFormLabel,
  CycleFormPrimaryButton,
} from '@/components/cycle/cycle-form-ui';
import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  growerStageLabelRu,
  growerStageRank,
  immediateNextStage,
  mapGrowCycleRpcError,
  stageAdvanceLabel,
  stagesForStartMaterial,
  transitionGrowCycleStage,
  transitionLocalGrowCycleStage,
  type GrowCycleStage,
} from '@growlog/domain';
import { stageAdvanceSymbol } from '@/lib/stage-advance-symbol';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function CycleStageChangeContent({ onSuccess }: { onSuccess?: () => void }) {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cycle;
  const { supabase, farmId, cycle, scopeId, refetchAll, isLocalWorkspace, updateLocalWorkspace } =
    useFarmContext();
  const [pickStage, setPickStage] = useState<GrowCycleStage | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!cycle || !farmId || !scopeId) return null;

  const material = cycle.start_material === 'clone' ? 'clone' : 'seed';
  const currentStage = cycle.stage as GrowCycleStage;
  const nextStage = immediateNextStage(currentStage, material);
  const stageOptions = stagesForStartMaterial(material);
  const currentLabel = growerStageLabelRu(currentStage);
  const stepHint =
    currentStage === 'flower' ||
    currentStage === 'harvest' ||
    currentStage === 'drying' ||
    currentStage === 'trimming' ||
    currentStage === 'curing'
      ? copy.stageStepHint[currentStage]
      : null;

  const otherStages = useMemo(
    () =>
      stageOptions
        .filter((s) => s !== currentStage && s !== nextStage)
        .sort((a, b) => growerStageRank(a) - growerStageRank(b)),
    [stageOptions, currentStage, nextStage],
  );

  function advanceLabel(to: GrowCycleStage) {
    return stageAdvanceLabel(currentStage, to, { stageAdvance: copy.stageAdvance });
  }

  async function go(stage: GrowCycleStage) {
    setError(null);
    setPending(true);
    try {
      if (isLocalWorkspace) {
        await updateLocalWorkspace((store) =>
          transitionLocalGrowCycleStage(store, { newStage: stage, allowBackward: true }),
        );
      } else {
        await transitionGrowCycleStage(supabase, {
          farmId: farmId!,
          cycleId: cycle!.id,
          scopeId: scopeId!,
          newStage: stage,
          allowBackward: true,
        });
      }
      refetchAll();
      setPickStage('');
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
              label={advanceLabel(nextStage)}
              recommended
              disabled={pending}
              onPress={() => void go(nextStage)}
            />
          </View>
        ) : null}
        {stepHint ? <Text style={styles.stepHint}>{stepHint}</Text> : null}
        {otherStages.length > 0 ? (
          <>
            <Text style={styles.otherLabel}>{copy.stageOtherPick}</Text>
            <View style={styles.actions}>
              {otherStages.map((s) => (
                <StageActionRow
                  key={s}
                  stage={s}
                  label={growerStageLabelRu(s)}
                  selected={pickStage === s}
                  disabled={pending}
                  onPress={() => setPickStage(s)}
                />
              ))}
            </View>
            <CycleFormPrimaryButton
              label={copy.stageOtherApply}
              onPress={() => pickStage && void go(pickStage)}
              pending={pending}
              disabled={!pickStage || pending}
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
  label,
  recommended,
  selected,
  disabled,
  onPress,
}: {
  stage: GrowCycleStage;
  label: string;
  recommended?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const iconColor = selected || recommended ? colors.primaryText : colors.textMuted;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected || !!recommended, disabled: !!disabled }}
      style={[
        styles.row,
        recommended && styles.rowRecommended,
        selected && styles.rowSelected,
        disabled && styles.rowDisabled,
      ]}
    >
      <SymbolView
        name={stageAdvanceSymbol(stage)}
        tintColor={iconColor}
        size={18}
        weight="medium"
      />
      <Text style={[styles.rowLabel, (selected || recommended) && styles.rowLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    currentStage: { fontSize: 15, color: c.textMuted, marginTop: -4 },
    stepHint: { fontSize: 13, lineHeight: 18, color: c.textMuted },
    otherLabel: { fontSize: 13, fontWeight: '600', color: c.textMuted, marginTop: 4 },
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
    rowRecommended: { backgroundColor: c.primary },
    rowSelected: { backgroundColor: c.primary },
    rowDisabled: { opacity: 0.5 },
    rowLabel: { fontSize: 15, fontWeight: '500', color: c.text },
    rowLabelSelected: { color: c.primaryText },
  });
}
