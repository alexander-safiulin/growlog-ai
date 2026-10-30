import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export function TimelineAddMenu({
  visible,
  selectedDate,
  onClose,
}: {
  visible: boolean;
  selectedDate: string;
  onClose: () => void;
}) {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cycle;
  const tl = strings.timelineScreen;
  const router = useRouter();
  const { isLocalWorkspace } = useFarmContext();

  function go(path: string) {
    onClose();
    router.push(path as never);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{tl.addMenuTitle}</Text>
          <Pressable style={styles.row} onPress={() => go(`/cycle/log?kind=watering&date=${selectedDate}`)}>
            <Text style={styles.rowText}>{copy.logWatering}</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={() => go(`/cycle/log?kind=feeding&date=${selectedDate}`)}>
            <Text style={styles.rowText}>{copy.logFeeding}</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={() => go(`/cycle/log?kind=procedure&date=${selectedDate}`)}>
            <Text style={styles.rowText}>{copy.logProcedure}</Text>
          </Pressable>
          {isLocalWorkspace ? null : (
            <Pressable style={styles.row} onPress={() => go('/cycle/stage')}>
              <Text style={styles.rowText}>{tl.changeStage}</Text>
            </Pressable>
          )}
          {isLocalWorkspace ? null : (
            <Pressable style={styles.row} onPress={() => go('/cycle/new')}>
              <Text style={styles.rowText}>{copy.newCycle}</Text>
            </Pressable>
          )}
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>{strings.commonMobile.cancel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      paddingBottom: 28,
      gap: 4,
    },
    title: { fontSize: 13, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', marginBottom: 8 },
    row: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    rowText: { fontSize: 17, color: c.text, fontWeight: '500' },
    cancel: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
    cancelText: { fontSize: 17, color: c.primary, fontWeight: '600' },
  });
}
