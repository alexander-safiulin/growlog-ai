import type { PhotoPickResult } from '@/lib/photo-upload';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  permissionRequiredLabel: string;
  onClose: () => void;
  onPick: (pick: PhotoPickResult) => void;
  onError: (message: string) => void;
};

async function uriToPhotoPick(uri: string, fileName: string, mimeType: string): Promise<PhotoPickResult> {
  let fileSize = 0;
  const probe = await fetch(uri);
  const buf = await probe.arrayBuffer();
  fileSize = buf.byteLength;
  return { uri, fileName, mimeType, fileSize };
}

export function ProcedurePhotoPickerSheet({
  visible,
  permissionRequiredLabel,
  onClose,
  onPick,
  onError,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = MediaLibrary.usePermissions({
    granularPermissions: ['photo'],
  });
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    try {
      let granted = libraryPermission?.granted ?? false;
      if (!granted) {
        const next = await requestLibraryPermission();
        granted = next.granted;
      }
      if (!granted) {
        onError(permissionRequiredLabel);
        onClose();
        return;
      }
      const page = await MediaLibrary.getAssetsAsync({
        first: 60,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      setAssets(page.assets);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : permissionRequiredLabel);
      onClose();
    } finally {
      setLoading(false);
    }
  }, [libraryPermission?.granted, onClose, onError, permissionRequiredLabel, requestLibraryPermission]);

  useEffect(() => {
    if (!visible) return;
    void loadGallery();
    if (!cameraPermission?.granted) {
      void requestCameraPermission();
    }
  }, [visible, loadGallery, cameraPermission?.granted, requestCameraPermission]);

  async function pickAsset(asset: MediaLibrary.Asset) {
    try {
      const info = await MediaLibrary.getAssetInfoAsync(asset);
      const uri = info.localUri ?? asset.uri;
      const fileName = asset.filename ?? `photo-${Date.now()}.jpg`;
      const mimeType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      onPick(await uriToPhotoPick(uri, fileName, mimeType));
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : permissionRequiredLabel);
    }
  }

  async function captureFromPreview() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      let granted = cameraPermission?.granted ?? false;
      if (!granted) {
        const next = await requestCameraPermission();
        granted = next.granted;
      }
      if (!granted) {
        onError(permissionRequiredLabel);
        return;
      }
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.85, exif: false });
      if (!shot?.uri) return;
      const fileName = `capture-${Date.now()}.jpg`;
      onPick(await uriToPhotoPick(shot.uri, fileName, 'image/jpeg'));
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : permissionRequiredLabel);
    } finally {
      setCapturing(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={12}>
            <Text style={styles.close}>{'×'}</Text>
          </Pressable>
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={assets}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <Pressable style={styles.cell} onPress={() => void pickAsset(item)}>
                <Image source={{ uri: item.uri }} style={styles.thumb} />
              </Pressable>
            )}
          />
        )}
        {cameraPermission?.granted ? (
          <Pressable
            style={styles.cameraPip}
            onPress={() => void captureFromPreview()}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
          >
            <CameraView ref={cameraRef} style={styles.cameraView} facing="back" />
            {capturing ? (
              <View style={styles.cameraBusy}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screen },
    header: { paddingHorizontal: 16, paddingVertical: 8 },
    close: { fontSize: 32, lineHeight: 36, color: c.text, fontWeight: '300' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    grid: { padding: 4, paddingBottom: 120 },
    cell: { flex: 1 / 3, aspectRatio: 1, padding: 2 },
    thumb: { width: '100%', height: '100%', borderRadius: 4, backgroundColor: c.surfaceMuted },
    cameraPip: {
      position: 'absolute',
      top: 56,
      right: 12,
      width: 112,
      height: 148,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: c.card,
      backgroundColor: c.text,
    },
    cameraView: { flex: 1 },
    cameraBusy: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
