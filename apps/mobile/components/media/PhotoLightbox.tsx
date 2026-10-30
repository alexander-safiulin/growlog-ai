import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function PhotoLightbox({
  uri,
  closeLabel,
  onClose,
}: {
  uri: string | null;
  closeLabel: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  return (
    <Modal
      visible={uri != null}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {uri ? (
          <ScrollView
            style={styles.zoom}
            contentContainerStyle={styles.zoomContent}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            bouncesZoom
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={{ uri }}
              style={{ width, height: Math.max(height - insets.top, 1) }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </ScrollView>
        ) : null}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          hitSlop={12}
          style={[styles.close, { top: insets.top + 8 }]}
        >
          <Text style={styles.closeText}>{closeLabel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  zoom: { flex: 1 },
  zoomContent: { flexGrow: 1, justifyContent: 'center' },
  close: {
    position: 'absolute',
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
