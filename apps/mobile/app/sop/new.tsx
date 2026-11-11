import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  createSopDefinitionWithAssignment,
  GROWER_STAGE_ORDER,
  growerStageLabel,
  linesForManualSchedules,
  SOP_RUNS_QUERY_KEY,
  clearSopMaterializeOnce,
  sopMaterializeScopeKey,
  schedulesFromManualForm,
  weekdayShortLabels,
  type GrowCycleStage,
  type SopManualScheduleFormState,
} from '@growlog/domain';
import { router, Stack } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
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

const SCHEDULE_KINDS = ['daily', 'weekdays', 'month_day', 'stage'] as const;

function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  );
}

const initialSchedule: SopManualScheduleFormState = {
  kind: 'daily',
  localTime: '09:00',
  weekdays: [1],
  monthDayText: '1',
  stage: 'flower',
  stageEnter: true,
  stageExit: false,
};

export default function SopNewScreen() {
  const { locale, strings } = useMobileLocale();
  const s = strings.sopNewScreen;
  const { supabase, farmId, cycle, primaryScope } = useFarmContext();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduleForm, setScheduleForm] = useState<SopManualScheduleFormState>(initialSchedule);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const weekdayLabels = weekdayShortLabels(locale);
  const schedules = useMemo(() => schedulesFromManualForm(scheduleForm), [scheduleForm]);
  const previewLines = useMemo(() => {
    if (!schedules?.length) return [];
    return linesForManualSchedules(schedules, {
      locale,
      stageName: (stageKey) =>
        GROWER_STAGE_ORDER.includes(stageKey as GrowCycleStage)
          ? growerStageLabel(stageKey as GrowCycleStage, locale)
          : stageKey,
      labels: {
        daily: (time) => fillTemplate(s.schedulePreviewDaily, { time }),
        weekdays: (days, time) => fillTemplate(s.schedulePreviewWeekdays, { days, time }),
        monthDay: (day, time) => fillTemplate(s.schedulePreviewMonthDay, { day, time }),
        stageEnter: (stage, time) => fillTemplate(s.schedulePreviewStageEnter, { stage, time }),
        stageExit: (stage, time) => fillTemplate(s.schedulePreviewStageExit, { stage, time }),
      },
    });
  }, [schedules, locale, s]);

  async function submit() {
    const next = schedules;
    if (!farmId || !cycle || !primaryScope || !title.trim() || !next) return;
    setError(null);
    setPending(true);
    try {
      await createSopDefinitionWithAssignment(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope.id,
        title: title.trim(),
        description: description.trim(),
        schedule: next,
        appliesToScope: primaryScope.scope_type,
      });
      clearSopMaterializeOnce(sopMaterializeScopeKey(farmId, cycle.id));
      await queryClient.invalidateQueries({ queryKey: ['sop-definitions', farmId] });
      await queryClient.invalidateQueries({ queryKey: [SOP_RUNS_QUERY_KEY, farmId] });
      router.replace('/(tabs)/sop');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : s.createFailed);
    } finally {
      setPending(false);
    }
  }

  if (!cycle || !primaryScope) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{s.needCycle}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: s.screenTitle }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
          <Text style={styles.intro}>{s.intro}</Text>

          <Text style={styles.label}>{s.titleLabel}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={s.titlePlaceholder}
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={colors.keyboardAppearance}
          />

          <Text style={styles.label}>{s.descriptionLabel}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder={s.descriptionPlaceholder}
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={colors.keyboardAppearance}
          />

          <View style={styles.scheduleCard}>
            <Text style={styles.label}>{s.scheduleLabel}</Text>
            <View style={styles.choiceCol}>
              {SCHEDULE_KINDS.map((option) => {
                const label =
                  option === 'daily'
                    ? s.scheduleDaily
                    : option === 'weekdays'
                      ? s.scheduleWeekdays
                      : option === 'month_day'
                        ? s.scheduleMonthDay
                        : s.stageLabel;
                const selected = scheduleForm.kind === option;
                return (
                  <Pressable
                    key={option}
                    style={[styles.choice, selected && styles.choiceOn]}
                    onPress={() => setScheduleForm((current) => ({ ...current, kind: option }))}
                  >
                    <Text style={[styles.choiceText, selected && styles.choiceTextOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {scheduleForm.kind === 'weekdays' && (
              <View style={styles.chipRow}>
                {weekdayLabels.map((label, index) => {
                  const day = index + 1;
                  const selected = scheduleForm.weekdays.includes(day);
                  return (
                    <Pressable
                      key={day}
                      style={[styles.chip, selected && styles.chipOn]}
                      onPress={() =>
                        setScheduleForm((current) => ({
                          ...current,
                          weekdays: selected
                            ? current.weekdays.filter((item) => item !== day)
                            : [...current.weekdays, day].sort(),
                        }))
                      }
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {scheduleForm.kind === 'month_day' && (
              <>
                <Text style={styles.label}>{s.monthDayLabel}</Text>
                <TextInput
                  style={styles.input}
                  value={scheduleForm.monthDayText}
                  onChangeText={(monthDayText) => setScheduleForm((current) => ({ ...current, monthDayText }))}
                  keyboardType="number-pad"
                  placeholder="1"
                  placeholderTextColor={colors.placeholder}
                  keyboardAppearance={colors.keyboardAppearance}
                />
              </>
            )}

            {scheduleForm.kind === 'stage' && (
              <>
                <Text style={styles.label}>{s.stageLabel}</Text>
                <View style={styles.chipRow}>
                  {GROWER_STAGE_ORDER.map((option) => {
                    const selected = scheduleForm.stage === option;
                    return (
                      <Pressable
                        key={option}
                        style={[styles.chip, selected && styles.chipOn]}
                        onPress={() => setScheduleForm((current) => ({ ...current, stage: option }))}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                          {growerStageLabel(option, locale)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.chipRow}>
                  <Pressable
                    style={[styles.chip, scheduleForm.stageEnter && styles.chipOn]}
                    onPress={() => setScheduleForm((current) => ({ ...current, stageEnter: !current.stageEnter }))}
                  >
                    <Text style={[styles.chipText, scheduleForm.stageEnter && styles.chipTextOn]}>
                      {s.scheduleStageEnter}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.chip, scheduleForm.stageExit && styles.chipOn]}
                    onPress={() => setScheduleForm((current) => ({ ...current, stageExit: !current.stageExit }))}
                  >
                    <Text style={[styles.chipText, scheduleForm.stageExit && styles.chipTextOn]}>
                      {s.scheduleStageExit}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            <Text style={styles.label}>{s.dueTimeLabel}</Text>
            <TextInput
              style={styles.input}
              value={scheduleForm.localTime}
              onChangeText={(localTime) => setScheduleForm((current) => ({ ...current, localTime }))}
              placeholder="09:00"
              placeholderTextColor={colors.placeholder}
              keyboardAppearance={colors.keyboardAppearance}
              autoCapitalize="none"
            />
            <Text style={styles.hint}>{s.timeHint}</Text>

            {previewLines.length > 0 ? (
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>{s.schedulePreviewTitle}</Text>
                {previewLines.map((line, index) => (
                  <Text key={index} style={styles.previewLine}>
                    {line}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.btn, pending && styles.btnDisabled]}
            onPress={() => void submit()}
            disabled={pending || !title.trim() || !schedules}
          >
            {pending ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={styles.btnText}>{s.create}</Text>
            )}
          </Pressable>

          <Pressable style={styles.cancel} onPress={() => router.back()}>
            <Text style={styles.cancelText}>{strings.commonMobile.cancel}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
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
    intro: { fontSize: 14, color: c.textMuted, marginBottom: 16, lineHeight: 20 },
    label: { fontSize: 14, fontWeight: '600', color: c.text, marginBottom: 6, marginTop: 12 },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    textArea: { minHeight: 96, textAlignVertical: 'top' },
    hint: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    scheduleCard: {
      marginTop: 4,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
    },
    previewBox: {
      marginTop: 14,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.primary,
    },
    previewTitle: { fontSize: 12, fontWeight: '600', color: c.textMuted, marginBottom: 4 },
    previewLine: { fontSize: 14, color: c.text, lineHeight: 20 },
    choiceCol: { gap: 8 },
    choice: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: c.inputBg,
    },
    choiceOn: { borderColor: c.primary, backgroundColor: c.primary },
    choiceText: { color: c.text, fontSize: 15 },
    choiceTextOn: { color: c.primaryText, fontWeight: '600' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chip: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: c.inputBg,
    },
    chipOn: { borderColor: c.primary, backgroundColor: c.primary },
    chipText: { color: c.text, fontSize: 13 },
    chipTextOn: { color: c.primaryText, fontWeight: '600' },
    btn: {
      marginTop: 24,
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: c.primaryText, fontWeight: '600', fontSize: 16 },
    cancel: { marginTop: 16, alignItems: 'center', padding: 12 },
    cancelText: { color: c.textMuted, fontSize: 16 },
    error: { color: c.dangerText, marginTop: 12 },
    muted: { color: c.textMuted },
  });
}
