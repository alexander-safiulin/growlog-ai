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
}: {
  achievedPpm: Record<string, number> | null | undefined;
  strings: {
    hint: string;
    namePlaceholder: string;
    action: string;
    done: string;
    needMix: string;
    error: string;
  };
  colors: MobileThemeColors;
  onSave: (name: string, targetPpm: Record<string, number>) => Promise<string | null>;
  disabled?: boolean;
}) {
  const styles = makeStyles(colors);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const targetPpm = achievedPpm ? targetPpmFromAchievedSolution(achievedPpm) : {};
  const canSave = !disabled && hasUsableTargetPpm(targetPpm) && name.trim().length > 0;

  if (!hasUsableTargetPpm(targetPpm)) {
    return <Text style={styles.meta}>{strings.needMix}</Text>;
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

  return (
    <View style={styles.wrap}>
      <Text style={styles.meta}>{strings.hint}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={strings.namePlaceholder}
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Pressable
        style={[styles.btn, (!canSave || saving) && styles.btnDisabled]}
        disabled={!canSave || saving}
        onPress={() => void onPress()}
      >
        <Text style={styles.btnText}>{strings.action}</Text>
      </Pressable>
      {status ? <Text style={styles.meta}>{status}</Text> : null}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: { marginTop: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: 12 },
    meta: { fontSize: 12, color: c.textMuted, lineHeight: 16 },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.inputBg,
    },
    btn: {
      alignSelf: 'flex-start',
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    btnDisabled: { opacity: 0.45 },
    btnText: { color: c.primaryText, fontSize: 14, fontWeight: '600' },
  });
}
