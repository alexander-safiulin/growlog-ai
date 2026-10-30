import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import type { ReactNode } from 'react';
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
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

export function CycleFormScreen({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function CycleFormCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CycleFormPrefillDate({ label }: { label: string }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.date}>{label}</Text>;
}

export function CycleFormLabel({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.label}>{children}</Text>;
}

export function CycleFormSectionTitle({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function CycleFormDivider() {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.divider} />;
}

export function CycleFormFieldInput(props: TextInputProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TextInput
      {...props}
      style={[styles.fieldInput, props.style]}
      placeholderTextColor={props.placeholderTextColor ?? colors.placeholder}
      keyboardAppearance={props.keyboardAppearance ?? colors.keyboardAppearance}
    />
  );
}

export function CycleFormMultilineInput(props: TextInputProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <TextInput
      {...props}
      multiline
      textAlignVertical="top"
      style={[styles.multilineInput, props.style]}
      placeholderTextColor={props.placeholderTextColor ?? colors.placeholder}
      keyboardAppearance={props.keyboardAppearance ?? colors.keyboardAppearance}
    />
  );
}

export function CycleFormChipRow({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.chipRow}>{children}</View>;
}

export function CycleFormChip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipActive, disabled && styles.chipDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextActive]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function CycleFormTextButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      style={[styles.textBtn, disabled && styles.chipDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Text style={styles.textBtnLabel}>{label}</Text>
    </Pressable>
  );
}

export function CycleFormPrimaryButton({
  label,
  onPress,
  pending,
  disabled,
}: {
  label: string;
  onPress: () => void;
  pending?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const busy = pending || disabled;
  return (
    <Pressable
      style={[styles.save, busy && styles.saveDisabled]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
    >
      {pending ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.saveText}>{label}</Text>}
    </Pressable>
  );
}

export function CycleFormErrors({
  fieldError,
  error,
}: {
  fieldError?: string | null;
  error?: string | null;
}) {
  const styles = useThemedStyles(makeStyles);
  if (!fieldError && !error) return null;
  return (
    <>
      {fieldError ? <Text style={styles.error}>{fieldError}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  );
}

export function CycleFormMuted({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.mutedStandalone}>{children}</Text>;
}

export function CycleFormCaption({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.caption}>{children}</Text>;
}

export function CycleFormBodyText({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.bodyText}>{children}</Text>;
}

export function CycleFormOkMessage({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.ok}>{children}</Text>;
}

export function CycleFormSecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      style={[styles.secondaryBtn, disabled && styles.chipDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function useCycleFormScrollContentStyle() {
  const styles = useThemedStyles(makeStyles);
  return styles.scrollContentBottom;
}

export function CycleFormFieldRow({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.fieldRow}>{children}</View>;
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    container: { padding: 16, gap: 12, backgroundColor: c.screen },
    scrollContentBottom: { padding: 16, gap: 12, backgroundColor: c.screen, paddingBottom: 32 },
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      gap: 10,
    },
    date: { fontSize: 13, fontWeight: '600', color: c.sectionLabel },
    label: { fontSize: 17, fontWeight: '600', color: c.text },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    divider: { height: 1, backgroundColor: c.divider, marginVertical: 2 },
    fieldInput: {
      fontSize: 16,
      lineHeight: 22,
      color: c.text,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
    },
    multilineInput: {
      minHeight: 96,
      padding: 0,
      fontSize: 16,
      lineHeight: 22,
      color: c.text,
      backgroundColor: 'transparent',
    },
    fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.surfaceMuted,
      borderWidth: 1,
      borderColor: c.chipBorder,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipDisabled: { opacity: 0.5 },
    chipText: { fontSize: 13, fontWeight: '500', color: c.text },
    chipTextActive: { color: c.primaryText },
    textBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
    textBtnLabel: { fontSize: 14, fontWeight: '600', color: c.primary },
    save: {
      backgroundColor: c.primary,
      borderRadius: 12,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    saveDisabled: { opacity: 0.55 },
    saveText: { color: c.primaryText, fontWeight: '600', fontSize: 16 },
    mutedStandalone: { padding: 16, color: c.textMuted },
    caption: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
    bodyText: { fontSize: 14, color: c.text, lineHeight: 20 },
    ok: { color: c.okText, fontSize: 13, paddingHorizontal: 4 },
    secondaryBtn: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    secondaryBtnText: { fontSize: 16, fontWeight: '600', color: c.text },
    error: { color: c.dangerText, fontSize: 13, paddingHorizontal: 4 },
  });
}
