import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { SopExecutionStatus } from '@growlog/domain';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { formatSopDueWhen, sopRunTitle } from '@/lib/sop-utils';
import {
  executeSopRun,
  fetchSopRunById,
  parseRequiredInputKeys,
  parseSopSteps,
  SOP_RUNS_QUERY_KEY,
  resolveSopExecutionStatus,
  sopStepProgress,
} from '@growlog/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const STATUS_VALUES: SopExecutionStatus[] = [
  'done',
  'delayed',
  'partially_done',
  'skipped',
  'blocked',
];

export default function SopRunScreen() {
  const { strings, locale } = useMobileLocale();
  const r = strings.sopRunScreen;
  const { id } = useLocalSearchParams<{ id: string }>();
  const runId = typeof id === 'string' ? id : '';
  const queryClient = useQueryClient();
  const { supabase, farmId, cycle, primaryScope, userId, displayFarmTimezone } = useFarmContext();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [pickedStatus, setPickedStatus] = useState<SopExecutionStatus | null>(null);
  const [checkedStepIds, setCheckedStepIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [measuredFields, setMeasuredFields] = useState<Record<string, string>>({});
  const [evidenceFields, setEvidenceFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const runQuery = useQuery({
    queryKey: ['sop-run', runId],
    queryFn: () => fetchSopRunById(supabase, runId),
    enabled: !!runId,
  });

  const run = runQuery.data;

  const requiredKeys = useMemo(() => {
    if (!run?.sop_definitions || typeof run.sop_definitions !== 'object') return [];
    const raw =
      'required_inputs_after_execution' in run.sop_definitions
        ? (run.sop_definitions as { required_inputs_after_execution: unknown })
            .required_inputs_after_execution
        : [];
    return parseRequiredInputKeys(raw);
  }, [run]);

  const steps = useMemo(() => parseSopSteps(run?.sop_definitions?.instructions_json), [run]);
  const stepProgress = useMemo(() => sopStepProgress(steps, checkedStepIds), [steps, checkedStepIds]);
  const executionStatus = resolveSopExecutionStatus(pickedStatus, stepProgress);

  function toggleStep(stepId: string) {
    setCheckedStepIds((ids) =>
      ids.includes(stepId) ? ids.filter((id) => id !== stepId) : [...ids, stepId]
    );
  }

  function isEvidenceKey(key: string): boolean {
    const k = key.toLowerCase();
    return k.includes('photo') || k.includes('evidence') || k.endsWith('_image');
  }

  async function submit() {
    if (!farmId || !cycle || !primaryScope || !run) return;
    if (executionStatus === 'done' && stepProgress.missingRequired.length > 0) {
      setError(r.missingSteps);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const measuredValues: Record<string, unknown> = {};
      const evidenceJson: Record<string, unknown> = {};
      for (const key of requiredKeys) {
        const val = isEvidenceKey(key)
          ? evidenceFields[key]?.trim()
          : measuredFields[key]?.trim();
        if (val) {
          if (isEvidenceKey(key)) evidenceJson[key] = val;
          else measuredValues[key] = val;
        }
      }
      await executeSopRun(supabase, {
        runId: run.id,
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope.id,
        executionStatus,
        notes,
        userId,
        measuredValues,
        evidenceJson,
        checkedStepIds,
      });
      await queryClient.invalidateQueries({ queryKey: [SOP_RUNS_QUERY_KEY] });
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : r.saveFailed);
    } finally {
      setPending(false);
    }
  }

  if (runQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!run) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{r.notFound}</Text>
      </View>
    );
  }

  const title = sopRunTitle(run);
  const description = run.sop_definitions?.description?.trim() ?? '';
  const dueDescription = run.due_at
    ? r.due.replace(
        '{when}',
        formatSopDueWhen(run.due_at, locale, displayFarmTimezone, strings.timelineScreen.today),
      )
    : r.noDueDate;

  if (!['open', 'acknowledged', 'overdue'].includes(run.status)) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{r.alreadyClosed}</Text>
        <Text style={styles.muted}>Status: {run.status}</Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>{r.back}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{dueDescription}</Text>

        {description ? <Text style={styles.description}>{description}</Text> : null}

        {steps.length > 0 && (
          <View style={styles.checklist}>
            <View style={styles.checklistHeader}>
              <Text style={styles.label}>{r.checklistTitle}</Text>
              <Text style={styles.progress}>
                {r.checklistProgress
                  .replace('{done}', String(stepProgress.checked))
                  .replace('{total}', String(stepProgress.total))}
              </Text>
            </View>
            {steps.map((step, index) => {
              const checked = checkedStepIds.includes(step.id);
              return (
                <Pressable
                  key={step.id}
                  style={[styles.stepRow, index > 0 && styles.stepRowDivider]}
                  onPress={() => toggleStep(step.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={step.text}
                >
                  <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                    {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                  <View style={styles.stepTextWrap}>
                    <Text style={[styles.stepText, checked && styles.stepTextDone]}>{step.text}</Text>
                    {!step.required ? <Text style={styles.stepOptional}>{r.stepOptional}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>{r.statusLabel}</Text>
        <View style={styles.chips}>
          {STATUS_VALUES.map((value) => (
            <Pressable
              key={value}
              style={[styles.chip, executionStatus === value && styles.chipActive]}
              onPress={() => setPickedStatus(value)}
            >
              <Text
                style={[styles.chipText, executionStatus === value && styles.chipTextActive]}
              >
                {r.statuses[value]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{r.notesLabel}</Text>
        <TextInput
          style={styles.input}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder={r.notesPlaceholder}
          placeholderTextColor={colors.placeholder}
          keyboardAppearance={colors.keyboardAppearance}
        />

        {requiredKeys.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{r.requiredInputs}</Text>
            {requiredKeys.map((key) => {
              const evidence = isEvidenceKey(key);
              return (
                <View key={key} style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{key}</Text>
                  <TextInput
                    style={styles.input}
                    value={evidence ? evidenceFields[key] ?? '' : measuredFields[key] ?? ''}
                    onChangeText={(v) => {
                      if (evidence) {
                        setEvidenceFields((prev) => ({ ...prev, [key]: v }));
                      } else {
                        setMeasuredFields((prev) => ({ ...prev, [key]: v }));
                      }
                    }}
                    placeholder={evidence ? 'Asset ID or reference' : 'Value'}
                    placeholderTextColor={colors.placeholder}
                    keyboardAppearance={colors.keyboardAppearance}
                  />
                </View>
              );
            })}
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, pending && styles.buttonDisabled]}
          onPress={() => void submit()}
          disabled={pending}
        >
          <Text style={styles.buttonText}>
            {pending ? strings.commonMobile.saving : r.submit}
          </Text>
        </Pressable>
        <Pressable style={styles.cancel} onPress={() => router.back()}>
          <Text style={styles.cancelText}>{strings.commonMobile.cancel}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: c.screen,
    },
    screen: { flex: 1, backgroundColor: c.screen },
    container: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 22, fontWeight: '700', color: c.text },
    subtitle: { fontSize: 14, color: c.textMuted, marginBottom: 20, marginTop: 4 },
    description: { fontSize: 15, color: c.text, lineHeight: 21, marginTop: -8, marginBottom: 20 },
    checklist: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      backgroundColor: c.inputBg,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 4,
      marginBottom: 20,
    },
    checklistHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    progress: { fontSize: 13, color: c.textMuted, fontVariant: ['tabular-nums'] },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
    stepRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.inputBorder },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: c.inputBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { borderColor: c.primary, backgroundColor: c.primary },
    checkmark: { color: c.primaryText, fontSize: 17, fontWeight: '700' },
    stepTextWrap: { flex: 1, paddingTop: 3 },
    stepText: { fontSize: 16, color: c.text, lineHeight: 22 },
    stepTextDone: { color: c.textMuted, textDecorationLine: 'line-through' },
    stepOptional: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: c.text },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.sectionLabel,
      textTransform: 'uppercase',
      marginTop: 16,
      marginBottom: 8,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surfaceMuted,
    },
    chipActive: { backgroundColor: c.primary },
    chipText: { fontSize: 13, color: c.text },
    chipTextActive: { color: c.primaryText },
    input: {
      minHeight: 80,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.inputBg,
      textAlignVertical: 'top',
    },
    fieldBlock: { marginBottom: 4 },
    fieldLabel: { fontSize: 13, color: c.sectionLabel, marginBottom: 4 },
    button: {
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: c.primaryText, fontWeight: '600', fontSize: 16 },
    cancel: { alignItems: 'center', padding: 14 },
    cancelText: { color: c.textMuted },
    error: { color: c.dangerText, marginBottom: 8 },
    muted: { color: c.textMuted, marginTop: 8 },
  });
}
