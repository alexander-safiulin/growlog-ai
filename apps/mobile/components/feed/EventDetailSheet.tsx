import { EventMediaThumb } from '@/components/feed/EventMediaThumb';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import type { EventRow } from '@growlog/domain';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function EventDetailSheet({
  event,
  storagePaths,
  typeLabel,
  onClose,
}: {
  event: EventRow | null;
  storagePaths: string[];
  typeLabel: string;
  onClose: () => void;
}) {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const time = event
    ? new Date(event.occurred_at).toLocaleString(undefined, {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <Modal visible={event != null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.type}>{typeLabel}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.close}>{strings.timelineScreen.close}</Text>
            </Pressable>
          </View>
          {time ? <Text style={styles.time}>{time}</Text> : null}
          <ScrollView contentContainerStyle={styles.body} bounces={false}>
            {event?.title ? <Text style={styles.title}>{event.title}</Text> : null}
            {event?.body ? <Text style={styles.text}>{event.body}</Text> : null}
            {storagePaths.map((path) => (
              <EventMediaThumb key={path} storagePath={path} height={280} />
            ))}
          </ScrollView>
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
      paddingTop: 16,
      paddingHorizontal: 16,
      maxHeight: '85%',
      gap: 8,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    type: { fontSize: 13, fontWeight: '700', color: c.primary, textTransform: 'uppercase', flex: 1 },
    close: { fontSize: 16, fontWeight: '600', color: c.primary },
    time: { fontSize: 13, color: c.textMuted },
    body: { gap: 8, paddingBottom: 8 },
    title: { fontSize: 18, fontWeight: '600', color: c.text },
    text: { fontSize: 16, lineHeight: 22, color: c.text },
  });
}
