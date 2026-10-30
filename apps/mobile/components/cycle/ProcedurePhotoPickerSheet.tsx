import type { PhotoPickResult } from '@/lib/photo-upload';
import { pickPhotoFromDevice } from '@/lib/photo-upload';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { SymbolView } from 'expo-symbols';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  permissionRequiredLabel: string;
  takePhotoLabel: string;
  chooseGalleryLabel: string;
  onClose: () => void;
  onPick: (pick: PhotoPickResult) => void;
  onError: (message: string) => void;
};

async function uriToPhotoPick(uri: string, fileName: string, mimeType: string): Promise<PhotoPickResult> {
  const probe = await fetch(uri);
  const buf = await probe.arrayBuffer();
  return { uri, fileName, mimeType, fileSize: buf.byteLength };
}

async function galleryThumbUri(asset: MediaLibrary.Asset): Promise<string | null> {
  if (Platform.OS !== 'ios') return asset.uri;
  // asset.uri is ph://. Fabric's image-loader list does not include
  // MediaLibraryImageLoader, so RN Image paints an empty cell. localUri is a file URL.
  const local = await MediaLibrary.getAssetInfoAsync(asset.id, { shouldDownloadFromNetwork: false });
  if (local.localUri) return local.localUri;
  if (!local.isNetworkAsset) return null;
  const downloaded = await MediaLibrary.getAssetInfoAsync(asset.id);
  return downloaded.localUri ?? null;
}

type GridItem = { kind: 'camera' } | { kind: 'asset'; asset: MediaLibrary.Asset };

function CameraGridCell({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      style={styles.cell}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.cameraCell}>
        <SymbolView
          name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
          tintColor="#fff"
          size={28}
        />
      </View>
    </Pressable>
  );
}

function GalleryThumb({ asset, onPress }: { asset: MediaLibrary.Asset; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const [uri, setUri] = useState<string | null>(Platform.OS === 'ios' ? null : asset.uri);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    void galleryThumbUri(asset)
      .then((next) => {
        if (!cancelled) setUri(next);
      })
      .catch(() => {
        if (!cancelled) setUri(null);
      });
    return () => {
      cancelled = true;
    };
  }, [asset]);

  return (
    <Pressable style={styles.cell} onPress={onPress} accessibilityRole="button">
      {uri ? <Image source={{ uri }} style={styles.thumb} resizeMode="cover" /> : <View style={styles.thumb} />}
    </Pressable>
  );
}

export function ProcedurePhotoPickerSheet({
  visible,
  permissionRequiredLabel,
  takePhotoLabel,
  chooseGalleryLabel,
  onClose,
  onPick,
  onError,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [libraryPermission, requestLibraryPermission] = MediaLibrary.usePermissions({
    granularPermissions: ['photo'],
  });
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [galleryReady, setGalleryReady] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);

  const gridItems = useMemo<GridItem[]>(
    () => [{ kind: 'camera' }, ...assets.map((asset) => ({ kind: 'asset' as const, asset }))],
    [assets],
  );

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setGalleryReady(false);
    try {
      let granted = libraryPermission?.granted ?? false;
      if (!granted) {
        const next = await requestLibraryPermission();
        granted = next.granted;
      }
      if (!granted) {
        setGalleryReady(false);
        return;
      }
      const page = await MediaLibrary.getAssetsAsync({
        first: 60,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      setAssets(page.assets);
      setGalleryReady(page.assets.length > 0);
    } catch {
      setGalleryReady(false);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [libraryPermission?.granted, requestLibraryPermission]);

  useEffect(() => {
    if (!visible) return;
    void loadGallery();
  }, [visible, loadGallery]);

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

  async function pickViaSystem(source: 'camera' | 'library') {
    if (pickerBusy) return;
    setPickerBusy(true);
    try {
      const pick = await pickPhotoFromDevice(source);
      if (pick) onPick(pick);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'permission_required') {
        onError(permissionRequiredLabel);
        return;
      }
      onError(e instanceof Error ? e.message : permissionRequiredLabel);
    } finally {
      setPickerBusy(false);
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
        ) : galleryReady ? (
          <FlatList
            data={gridItems}
            keyExtractor={(item) => (item.kind === 'camera' ? 'camera' : item.asset.id)}
            numColumns={3}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) =>
              item.kind === 'camera' ? (
                <CameraGridCell
                  label={takePhotoLabel}
                  disabled={pickerBusy}
                  onPress={() => void pickViaSystem('camera')}
                />
              ) : (
                <GalleryThumb asset={item.asset} onPress={() => void pickAsset(item.asset)} />
              )
            }
          />
        ) : (
          <View style={styles.fallback}>
            <Pressable
              style={styles.fallbackBtn}
              onPress={() => void pickViaSystem('library')}
              disabled={pickerBusy}
            >
              <Text style={styles.fallbackText}>{chooseGalleryLabel}</Text>
            </Pressable>
            <Pressable
              style={styles.fallbackBtn}
              onPress={() => void pickViaSystem('camera')}
              disabled={pickerBusy}
            >
              <Text style={styles.fallbackText}>{takePhotoLabel}</Text>
            </Pressable>
          </View>
        )}
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
    grid: { padding: 4, paddingBottom: 24 },
    cell: { flex: 1 / 3, aspectRatio: 1, padding: 2 },
    thumb: { width: '100%', height: '100%', borderRadius: 4, backgroundColor: c.surfaceMuted },
    fallback: { flex: 1, justifyContent: 'center', gap: 12, padding: 24 },
    fallbackBtn: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
    },
    fallbackText: { fontSize: 16, fontWeight: '600', color: c.text },
    cameraCell: {
      width: '100%',
      height: '100%',
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1a1a1a',
    },
  });
}
