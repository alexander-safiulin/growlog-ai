import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { uploadPhotoCapture, type PhotoPickResult } from '@/lib/photo-upload';
import { formatPhotoSizeLimit, getMaxPhotoBytesVisionClient } from '@growlog/domain';
import * as ImagePicker from 'expo-image-picker';
import { router, useSegments } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function PhotosScreen() {
  const { strings } = useMobileLocale();
  const p = strings.photosScreen;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const segments = useSegments();
  const fromCapture = segments[0] === 'capture';
  const { supabase, farmId, cycle, primaryScope, refetchAll, userId } = useFarmContext();
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const maxBytes = getMaxPhotoBytesVisionClient();

  async function pick(source: 'camera' | 'library') {
    if (!farmId || !cycle || !primaryScope) return;
    setError(null);
    setMsg(null);

    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(p.permissionRequired);
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.85, exif: false })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, exif: false });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    let fileSize = asset.fileSize ?? 0;
    if (fileSize <= 0) {
      const probe = await fetch(asset.uri);
      const probeBuf = await probe.arrayBuffer();
      fileSize = probeBuf.byteLength;
    }
    const pick: PhotoPickResult = {
      uri: asset.uri,
      fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileSize,
    };

    if (pick.fileSize > maxBytes) {
      setError(
        p.tooLarge
          .replace('{size}', formatPhotoSizeLimit(pick.fileSize))
          .replace('{max}', formatPhotoSizeLimit(maxBytes)),
      );
      return;
    }

    setPending(true);
    try {
      const outcome = await uploadPhotoCapture(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope.id,
        pick,
        caption: caption.trim() || undefined,
        userId,
      });
      setCaption('');
      await refetchAll();
      setMsg(outcome === 'queued' ? p.savedOffline : p.uploaded);
      if (fromCapture) {
        router.back();
        router.back();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : p.uploadFailed);
    } finally {
      setPending(false);
    }
  }

  if (!cycle || !primaryScope) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{p.needOnboarding}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.hint}>
        {p.maxSize} {formatPhotoSizeLimit(maxBytes)}
      </Text>

      <Text style={styles.label}>{p.captionLabel}</Text>
      <TextInput
        style={styles.input}
        value={caption}
        onChangeText={setCaption}
        placeholder={p.captionPlaceholder}
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />

      {pending && <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />}

      <Pressable style={styles.btn} onPress={() => void pick('camera')} disabled={pending}>
        <Text style={styles.btnText}>{p.takePhoto}</Text>
      </Pressable>
      <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => void pick('library')} disabled={pending}>
        <Text style={[styles.btnText, styles.btnTextSecondary]}>{p.chooseGallery}</Text>
      </Pressable>

      {msg ? <Text style={styles.ok}>{msg}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: c.screen,
    },
    screen: { backgroundColor: c.screen },
    container: { padding: 16, paddingBottom: 40, backgroundColor: c.screen },
    hint: { fontSize: 13, color: c.textMuted, marginBottom: 12 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: c.text },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
      backgroundColor: c.inputBg,
      color: c.text,
    },
    btn: {
      backgroundColor: c.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      marginBottom: 10,
    },
    btnSecondary: { backgroundColor: c.card, borderWidth: 1, borderColor: c.primary },
    btnText: { color: c.primaryText, fontWeight: '600', fontSize: 16 },
    btnTextSecondary: { color: c.primary },
    ok: { color: c.okText, marginTop: 12 },
    error: { color: c.dangerText, marginTop: 12 },
    muted: { color: c.textMuted },
  });
}
