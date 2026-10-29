import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { LOCAL_WORKSPACE_IDS } from '@growlog/domain';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';

export function PlacePickerSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const df = strings.dailyFocus;
  const { farms, farmId, scopes, scopeId, primaryScope, setFarmId, setScopeId } = useFarmContext();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {farms.length > 0 ? <Text style={styles.section}>{df.placeFarms}</Text> : null}
          {farms.map((f) => (
            <Pressable
              key={f.id}
              style={styles.item}
              onPress={() => {
                if (f.id !== LOCAL_WORKSPACE_IDS.farm) setFarmId(f.id);
                onClose();
              }}
            >
              <Text style={styles.itemText}>
                {f.name}
                {f.id === farmId ? ' ✓' : ''}
              </Text>
            </Pressable>
          ))}
          {scopes.length > 0 ? <Text style={styles.section}>{df.placeRooms}</Text> : null}
          {scopes.map((s) => (
            <Pressable
              key={s.id}
              style={styles.item}
              onPress={() => {
                if (s.id !== LOCAL_WORKSPACE_IDS.scope) setScopeId(s.id);
                onClose();
              }}
            >
              <Text style={styles.itemText}>
                {s.display_name || s.scope_type}
                {s.id === (scopeId ?? primaryScope?.id) ? ' ✓' : ''}
              </Text>
            </Pressable>
          ))}
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
    },
    section: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textMuted,
      textTransform: 'uppercase',
      marginTop: 8,
      marginBottom: 4,
    },
    item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.divider },
    itemText: { fontSize: 16, color: c.text },
  });
}
