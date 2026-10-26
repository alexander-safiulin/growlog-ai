import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { createSopDefinitionWithAssignment, SOP_RUNS_QUERY_KEY } from '@growlog/domain';
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

export default function SopNewScreen() {
  const { strings } = useMobileLocale();
  const s = strings.sopNewScreen;
  const { supabase, farmId, cycle, primaryScope } = useFarmContext();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [localTime, setLocalTime] = useState('09:00');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!farmId || !cycle || !primaryScope || !title.trim()) return;
    setError(null);
    setPending(true);
    try {
      await createSopDefinitionWithAssignment(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope.id,
        title: title.trim(),
        description: description.trim(),
        localTime,
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
          <Text style={styles.hint}>24-hour format, e.g. 09:00 or 14:30</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.btn, pending && styles.btnDisabled]}
            onPress={() => void submit()}
            disabled={pending || !title.trim()}
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
