import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { pickPhotoFromDevice, uploadPhotoCapture } from '@/lib/photo-upload';
import { formatPhotoSizeLimit, getMaxPhotoBytesVisionClient } from '@growlog/domain';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export default function LeafCaptureScreen() {
  const { strings } = useMobileLocale();
  const copy = strings.advisorScreen.leafCapture;
  const photos = strings.photosScreen;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { supabase, farmId, cycle, primaryScope, userId, refetchAll } = useFarmContext();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const started = useRef(false);
  const maxBytes = getMaxPhotoBytesVisionClient();

  const runCamera = useCallback(async () => {
    if (!farmId || !cycle?.id || !primaryScope?.id) {
      setError(copy.needScope);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const raw = await pickPhotoFromDevice('camera');
      if (!raw) {
        router.back();
        return;
      }
      if (raw.fileSize > maxBytes) {
        setError(
          photos.tooLarge
            .replace('{size}', formatPhotoSizeLimit(raw.fileSize))
            .replace('{max}', formatPhotoSizeLimit(maxBytes)),
        );
        return;
      }
      const outcome = await uploadPhotoCapture(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope.id,
        pick: raw,
        caption: copy.defaultCaption,
        userId,
      });
      await refetchAll();
      if (outcome.status === 'uploaded') {
        router.replace('/(tabs)/timeline');
      } else {
        router.replace('/(tabs)/timeline');
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'permission_required') {
        setError(photos.permissionRequired);
      } else {
        setError(e instanceof Error ? e.message : copy.failed);
      }
    } finally {
      setPending(false);
    }
  }, [
    copy.defaultCaption,
    copy.failed,
    copy.needScope,
    cycle?.id,
    farmId,
    maxBytes,
    photos.permissionRequired,
    photos.tooLarge,
    primaryScope?.id,
    refetchAll,
    supabase,
    userId,
  ]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runCamera();
  }, [runCamera]);

  return (
    <View style={styles.center}>
      {pending ? <ActivityIndicator color={colors.primary} size="large" /> : null}
      <Text style={styles.muted}>{copy.working}</Text>
      {error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void runCamera()}>
            <Text style={styles.retryText}>{copy.retry}</Text>
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.muted}>{strings.commonMobile.cancel}</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: c.screen },
    muted: { fontSize: 15, color: c.textMuted, textAlign: 'center' },
    error: { fontSize: 14, color: c.dangerText, textAlign: 'center' },
    retry: {
      backgroundColor: c.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
    },
    retryText: { color: c.primaryText, fontWeight: '600' },
  });
}
