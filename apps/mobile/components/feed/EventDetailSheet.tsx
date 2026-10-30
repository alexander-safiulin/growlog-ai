import { EventMediaThumb } from '@/components/feed/EventMediaThumb';
import { LeafDiagnosisPanel } from '@/components/feed/LeafDiagnosisPanel';
import { PhotoLightbox } from '@/components/media/PhotoLightbox';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import type { EventRow, LeafSkillResult } from '@growlog/domain';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function EventDetailSheet({
  event,
  photoAttachments,
  leafSkillByAssetId,
  typeLabel,
  onClose,
}: {
  event: EventRow | null;
  photoAttachments: Array<{ assetId: string; storagePath: string }>;
  leafSkillByAssetId: Record<string, LeafSkillResult>;
  typeLabel: string;
  onClose: () => void;
}) {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const time = event
    ? new Date(event.occurred_at).toLocaleString(undefined, {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  function closeSheet() {
    setPhotoUri(null);
    onClose();
  }

  return (
    <>
    <Modal visible={event != null} transparent animationType="slide" onRequestClose={closeSheet}>
      <Pressable style={styles.backdrop} onPress={closeSheet}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.type}>{typeLabel}</Text>
            <Pressable onPress={closeSheet} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.close}>{strings.timelineScreen.close}</Text>
            </Pressable>
          </View>
          {time ? <Text style={styles.time}>{time}</Text> : null}
          <ScrollView contentContainerStyle={styles.body} bounces={false}>
            {event?.title ? <Text style={styles.title}>{event.title}</Text> : null}
            {event?.body ? <Text style={styles.text}>{event.body}</Text> : null}
            {photoAttachments.map(({ assetId, storagePath }) => {
              const leaf = leafSkillByAssetId[assetId];
              return (
                <View key={storagePath}>
                  <EventMediaThumb
                    storagePath={storagePath}
                    maxHeight={null}
                    accessibilityLabel={strings.timelineScreen.viewPhotoA11y}
                    onPress={setPhotoUri}
                  />
                  {leaf ? <LeafDiagnosisPanel mediaAssetId={assetId} result={leaf} /> : null}
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
    <PhotoLightbox
      uri={event ? photoUri : null}
      closeLabel={strings.timelineScreen.close}
      onClose={() => setPhotoUri(null)}
    />
    </>
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
