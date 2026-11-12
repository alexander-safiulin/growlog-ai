import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  onVoiceLog: () => void;
  onTextLog: () => void;
};

export function AssistantJournalPlusSheet({ visible, onClose, onVoiceLog, onTextLog }: Props) {
  const { strings } = useMobileLocale();
  const copy = strings.advisorScreen.journalPlus;
  const cancel = strings.commonMobile.cancel;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text style={styles.title}>{copy.title}</Text>
        <Pressable style={styles.row} onPress={onVoiceLog} accessibilityRole="button">
          <SymbolView
            name={{ ios: 'mic.fill', android: 'mic', web: 'mic' }}
            tintColor={colors.primary}
            size={22}
          />
          <Text style={styles.rowLabel}>{copy.voice}</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={onTextLog} accessibilityRole="button">
          <SymbolView
            name={{ ios: 'square.and.pencil', android: 'edit', web: 'edit' }}
            tintColor={colors.primary}
            size={22}
          />
          <Text style={styles.rowLabel}>{copy.text}</Text>
        </Pressable>
        <Pressable style={styles.cancel} onPress={onClose} accessibilityRole="button">
          <Text style={styles.cancelText}>{cancel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 20,
      paddingTop: 16,
      gap: 10,
      borderTopWidth: 1,
      borderColor: c.border,
    },
    title: { fontSize: 17, fontWeight: '600', color: c.text, marginBottom: 4 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: c.surfaceMuted,
    },
    rowLabel: { fontSize: 16, fontWeight: '500', color: c.text },
    cancel: { alignItems: 'center', paddingVertical: 14 },
    cancelText: { fontSize: 16, color: c.textMuted },
  });
}
