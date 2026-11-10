import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  createSopDefinitionWithAssignment,
  GROWER_STAGE_ORDER,
  growerStageLabel,
  SOP_RUNS_QUERY_KEY,
  weekdayShortLabels,
  type GrowCycleStage,
  type SopManualSchedule,
} from '@growlog/domain';
import { router, Stack } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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

export default function SopNewScreen() {
  const { locale, strings } = useMobileLocale();
  const s = strings.sopNewScreen;
  const { supabase, farmId, cycle, primaryScope } = useFarmContext();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [localTime, setLocalTime] = useState('09:00');
  const [kind, setKind] = useState<(typeof SCHEDULE_KINDS)[number]>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([1]);
  const [monthDayText, setMonthDayText] = useState('1');
  const [stage, setStage] = useState<GrowCycleStage>('flower');
  const [stageEnter, setStageEnter] = useState(true);
  const [stageExit, setStageExit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const weekdayLabels = weekdayShortLabels(locale);

  function schedule(): SopManualSchedule[] | null {
    if (kind === 'weekdays') {
      if (!weekdays.length) return null;
      return [{ kind, localTime, weekdays }];
    }
    if (kind === 'month_day') {
      const monthDay = Number(monthDayText);
      if (!Number.isInteger(monthDay) || monthDay < 1 || monthDay > 31) return null;
      return [{ kind, localTime, monthDay }];
    }
    if (kind === 'stage') {
      const items: SopManualSchedule[] = [];
      if (stageEnter) items.push({ kind: 'stage_enter', localTime, stage });
      if (stageExit) items.push({ kind: 'stage_exit', localTime, stage });
      return items.length ? items : null;
    }
    return [{ kind: 'daily', localTime }];
  }

  async function submit() {
    const next = schedule();
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
        appliesToScope: 'tent',
      });
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
              const selected = kind === option;
              return (
                <Pressable
                  key={option}
                  style={[styles.choice, selected && styles.choiceOn]}
                  onPress={() => setKind(option)}
                >
                  <Text style={[styles.choiceText, selected && styles.choiceTextOn]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {kind === 'weekdays' && (
            <View style={styles.chipRow}>
              {weekdayLabels.map((label, index) => {
                const day = index + 1;
                const selected = weekdays.includes(day);
                return (
                  <Pressable
                    key={day}
                    style={[styles.chip, selected && styles.chipOn]}
                    onPress={() =>
                      setWeekdays((current) =>
                        current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort()
                      )
                    }
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {kind === 'month_day' && (
            <>
              <Text style={styles.label}>{s.monthDayLabel}</Text>
              <TextInput
                style={styles.input}
                value={monthDayText}
                onChangeText={setMonthDayText}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={colors.placeholder}
                keyboardAppearance={colors.keyboardAppearance}
              />
            </>
          )}

          {kind === 'stage' && (
            <>
              <Text style={styles.label}>{s.stageLabel}</Text>
              <View style={styles.chipRow}>
                {GROWER_STAGE_ORDER.map((option) => {
                  const selected = stage === option;
                  return (
                    <Pressable
                      key={option}
                      style={[styles.chip, selected && styles.chipOn]}
                      onPress={() => setStage(option)}
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
                  style={[styles.chip, stageEnter && styles.chipOn]}
                  onPress={() => setStageEnter((value) => !value)}
                >
                  <Text style={[styles.chipText, stageEnter && styles.chipTextOn]}>{s.scheduleStageEnter}</Text>
                </Pressable>
                <Pressable
                  style={[styles.chip, stageExit && styles.chipOn]}
                  onPress={() => setStageExit((value) => !value)}
                >
                  <Text style={[styles.chipText, stageExit && styles.chipTextOn]}>{s.scheduleStageExit}</Text>
                </Pressable>
              </View>
            </>
          )}

          <Text style={styles.label}>{s.dueTimeLabel}</Text>
          <TextInput
            style={styles.input}
            value={localTime}
            onChangeText={setLocalTime}
            placeholder="09:00"
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={colors.keyboardAppearance}
            autoCapitalize="none"
          />
          <Text style={styles.hint}>{s.timeHint}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.btn, pending && styles.btnDisabled]}
            onPress={() => void submit()}
            disabled={pending || !title.trim() || !schedule()}
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
