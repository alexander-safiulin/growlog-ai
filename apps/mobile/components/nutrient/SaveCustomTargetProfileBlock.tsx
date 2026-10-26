import {
  hasUsableTargetPpm,
  targetPpmFromAchievedSolution,
} from '@growlog/web-lib/nutrient/save-custom-target-profile';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { MobileThemeColors } from '@/lib/mobile-theme';

export function SaveCustomTargetProfileBlock({
  achievedPpm,
  strings,
  colors,
  onSave,
  disabled,
  sectionTitle,
  hint,
  buttonVariant = 'filled',
  fullWidth = false,
}: {
  achievedPpm: Record<string, number> | null | undefined;
  strings: {
    hint?: string;
    namePlaceholder: string;
    action: string;
    done: string;
    needMix: string;
    error: string;
  };
  colors: MobileThemeColors;
  onSave: (name: string, targetPpm: Record<string, number>) => Promise<string | null>;
  disabled?: boolean;
  sectionTitle?: string;
  hint?: string;
  buttonVariant?: 'filled' | 'outline';
  fullWidth?: boolean;
}) {
  const styles = makeStyles(colors);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const targetPpm = achievedPpm ? targetPpmFromAchievedSolution(achievedPpm) : {};
  const canSave = !disabled && hasUsableTargetPpm(targetPpm) && name.trim().length > 0;

  if (!hasUsableTargetPpm(targetPpm)) {
    return (
      <View style={styles.wrap}>
        {sectionTitle ? <Text style={styles.sectionTitle}>{sectionTitle}</Text> : null}
        <Text style={styles.meta}>{strings.needMix}</Text>
      </View>
    );
  }

  const onPress = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setStatus(null);
    try {
      const slug = await onSave(name.trim(), targetPpm);
      setStatus(slug ? strings.done : strings.error);
    } catch {
      setStatus(strings.error);
    } finally {
      setSaving(false);
    }
  };

  const hintText = hint ?? strings.hint;

  return (
    <View style={styles.wrap}>
      {sectionTitle ? <Text style={styles.sectionTitle}>{sectionTitle}</Text> : null}
      {hintText ? <Text style={styles.meta}>{hintText}</Text> : null}
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={strings.namePlaceholder}
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Pressable
        style={[
          styles.btn,
          fullWidth && styles.btnFull,
          buttonVariant === 'outline' && styles.btnOutline,
          (!canSave || saving) && styles.btnDisabled,
        ]}
        disabled={!canSave || saving}
        onPress={() => void onPress()}
      >
        <Text
          style={[
            styles.btnText,
            buttonVariant === 'outline' && styles.btnOutlineText,
            (!canSave || saving) && buttonVariant === 'outline' && styles.btnOutlineTextDisabled,
          ]}
        >
          {strings.action}
        </Text>
      </Pressable>
      {status ? <Text style={styles.meta}>{status}</Text> : null}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: c.text },
    meta: { fontSize: 12, color: c.textMuted, lineHeight: 16 },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    btn: {
      alignSelf: 'flex-start',
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    btnFull: { alignSelf: 'stretch', alignItems: 'center' },
    btnOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: c.primary,
    },
    btnDisabled: { opacity: 0.45 },
    btnText: { color: c.primaryText, fontSize: 15, fontWeight: '600' },
    btnOutlineText: { color: c.primary },
    btnOutlineTextDisabled: { color: c.textMuted },
  });
}
