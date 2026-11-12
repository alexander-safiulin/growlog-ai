import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import {
  LEAF_ANALYSIS_POLL_MAX_MS,
  LEAF_ANALYSIS_POLL_MS,
  queryLeafAnalysisPollState,
  type LeafAnalysisPollState,
} from '@/lib/poll-leaf-analysis';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { pickPhotoFromDevice, uploadPhotoCapture } from '@/lib/photo-upload';
import { setTimelineOpenIntent } from '@/lib/timeline-open-intent';
import { formatPhotoSizeLimit, getMaxPhotoBytesVisionClient } from '@growlog/domain';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type CaptureTarget = { eventId: string; mediaAssetId: string };

export default function LeafCaptureScreen() {
  const { strings } = useMobileLocale();
  const copy = strings.advisorScreen.leafCapture;
  const photos = strings.photosScreen;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { supabase, farmId, cycle, primaryScope, userId, refetchAll } = useFarmContext();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [captureTarget, setCaptureTarget] = useState<CaptureTarget | null>(null);
  const [pollState, setPollState] = useState<LeafAnalysisPollState | 'timeout' | null>(null);
  const [offlineQueued, setOfflineQueued] = useState(false);
  const started = useRef(false);
  const maxBytes = getMaxPhotoBytesVisionClient();

  const openJournalEntry = useCallback(
    (target: CaptureTarget) => {
      setTimelineOpenIntent({
        eventId: target.eventId,
        mediaAssetId: target.mediaAssetId,
        pollLeaf: true,
      });
      void refetchAll().finally(() => router.replace('/(tabs)/timeline'));
    },
    [refetchAll],
  );

  const runCamera = useCallback(async () => {
    if (!farmId || !cycle?.id || !primaryScope?.id) {
      setError(copy.needScope);
      return;
    }
    setUploading(true);
    setError(null);
    setCaptureTarget(null);
    setPollState(null);
    setOfflineQueued(false);
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
        leafCapture: true,
      });
      await refetchAll();
      if (outcome.status === 'queued') {
        setOfflineQueued(true);
        return;
      }
      setCaptureTarget({ eventId: outcome.eventId, mediaAssetId: outcome.mediaAssetId });
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'permission_required') {
        setError(photos.permissionRequired);
      } else {
        setError(e instanceof Error ? e.message : copy.failed);
      }
    } finally {
      setUploading(false);
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

  useEffect(() => {
    if (!captureTarget || !farmId) return;
    let cancelled = false;
    const startedAt = Date.now();

    const loop = async () => {
      while (!cancelled) {
        try {
          const next = await queryLeafAnalysisPollState(
            supabase,
            farmId,
            captureTarget.mediaAssetId,
          );
          if (cancelled) return;
          if (next.status === 'ready' || next.status === 'failed') {
            setPollState(next);
            return;
          }
        } catch {
          if (cancelled) return;
        }
        if (Date.now() - startedAt >= LEAF_ANALYSIS_POLL_MAX_MS) {
          setPollState('timeout');
          return;
        }
        await new Promise((r) => setTimeout(r, LEAF_ANALYSIS_POLL_MS));
      }
    };

    void loop();
    return () => {
      cancelled = true;
    };
  }, [captureTarget, farmId, supabase]);

  const analyzing = captureTarget != null && pollState == null;
  const showResult = captureTarget != null && pollState != null;

  let resultTitle = copy.readyTitle;
  let resultBody = copy.readyNoHypotheses;
  if (pollState === 'timeout') {
    resultBody = copy.analysisTakingLong;
  } else if (pollState?.status === 'failed') {
    resultBody = copy.analysisFailed;
  } else if (pollState?.status === 'ready') {
    resultBody =
      pollState.hypothesisCount > 0 ? copy.readyWithHypotheses : copy.readyNoHypotheses;
  }

  return (
    <View style={styles.center}>
      {uploading ? (
        <>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.muted}>{copy.uploading}</Text>
        </>
      ) : offlineQueued ? (
        <>
          <Text style={styles.title}>{copy.savedOffline}</Text>
          <Pressable style={styles.primary} onPress={() => router.replace('/(tabs)/timeline')}>
            <Text style={styles.primaryText}>{strings.tabs.timeline}</Text>
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.muted}>{strings.commonMobile.cancel}</Text>
          </Pressable>
        </>
      ) : analyzing && captureTarget ? (
        <>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.title}>{copy.analyzing}</Text>
          <Text style={styles.muted}>{copy.analyzingHint}</Text>
          <Pressable style={styles.secondary} onPress={() => openJournalEntry(captureTarget)}>
            <Text style={styles.secondaryText}>{copy.openJournal}</Text>
          </Pressable>
        </>
      ) : showResult && captureTarget ? (
        <>
          <Text style={styles.title}>{resultTitle}</Text>
          <Text style={styles.muted}>{resultBody}</Text>
          <Pressable style={styles.primary} onPress={() => openJournalEntry(captureTarget)}>
            <Text style={styles.primaryText}>{copy.openJournal}</Text>
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.muted}>{strings.commonMobile.cancel}</Text>
          </Pressable>
        </>
      ) : (
        <>
          {!error ? <Text style={styles.muted}>{copy.working}</Text> : null}
        </>
      )}
      {error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.primary} onPress={() => void runCamera()}>
            <Text style={styles.primaryText}>{copy.retry}</Text>
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
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 12,
      backgroundColor: c.screen,
    },
    title: { fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'center' },
    muted: { fontSize: 15, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
    error: { fontSize: 14, color: c.dangerText, textAlign: 'center' },
    primary: {
      backgroundColor: c.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 8,
    },
    primaryText: { color: c.primaryText, fontWeight: '600', fontSize: 15 },
    secondary: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 4,
    },
    secondaryText: { color: c.primary, fontWeight: '600', fontSize: 15 },
  });
}
