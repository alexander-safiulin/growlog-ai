import { AdvisorChatEmpty } from '@/components/assistant/AdvisorChatEmpty';
import { AdvisorJournalVoiceCapture } from '@/components/assistant/AdvisorJournalVoiceCapture';
import { JournalVoiceSavedSheet } from '@/components/assistant/JournalVoiceSavedSheet';
import type { JournalVoiceSaveResult } from '@/components/assistant/journal-voice-save';
import { AssistantOrbitBar } from '@/components/assistant/AssistantOrbitBar';
import { AdvisorVoiceButton } from '@/components/assistant/AdvisorVoiceButton';
import { ProcedurePhotoPickerSheet } from '@/components/cycle/ProcedurePhotoPickerSheet';
import { AspectPhoto } from '@/components/media/AspectPhoto';
import { VoiceComposerRow } from '@/components/voice/VoiceComposerRow';
import { useMobileLocale } from '@/context/LocaleContext';
import { TrustPanel } from '@/components/trust/TrustPanel';
import { useTheme } from '@/context/ThemeContext';
import { useVisionCapture } from '@/context/VisionCaptureContext';
import { useVoiceCapture } from '@/context/VoiceCaptureContext';
import type { AskResponse, ChatTurn } from '@/lib/advisor-types';
import { preparePhotoForStorage } from '@/lib/prepare-photo';
import type { PhotoPickResult } from '@/lib/photo-upload';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { formatPhotoSizeLimit, getMaxPhotoBytesVisionClient, isLocalWorkspaceEntityId } from '@growlog/domain';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const ADVISOR_CONVERSATION_KEY = 'growlog_advisor_conversation_id';

async function getOrCreateConversationId(): Promise<string> {
  try {
    let id = await SecureStore.getItemAsync(ADVISOR_CONVERSATION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      await SecureStore.setItemAsync(ADVISOR_CONVERSATION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function AdvisorChat() {
  const { strings } = useMobileLocale();
  const a = strings.advisorScreen;
  const copy = strings.cycle;
  const photos = strings.photosScreen;
  const {
    supabase,
    farmId,
    farms,
    cycle,
    primaryScope,
    userId,
    loading,
    isLocalWorkspace,
    displayFarmTimezone,
    refetchAll,
  } = useFarmContext();
  const activeFarm = farms.find((f) => f.id === farmId) ?? null;
  const {
    recording,
    processing,
    recordingLevel,
    recordingElapsedSec,
    processingLabel,
    submitText,
    clearPending,
    requestStart,
    requestStop,
    requestCancel,
  } = useVoiceCapture();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [text, setText] = useState('');
  const [textOpen, setTextOpen] = useState(false);
  const [photoPick, setPhotoPick] = useState<PhotoPickResult | null>(null);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [journalVoiceSession, setJournalVoiceSession] = useState(false);
  const [journalSaveResult, setJournalSaveResult] = useState<JournalVoiceSaveResult | null>(null);
  const [journalUndoPending, setJournalUndoPending] = useState(false);
  const { setEyeMode } = useVisionCapture();
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const inputRef = useRef<TextInput>(null);
  const conversationRef = useRef<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const maxPhotoBytes = getMaxPhotoBytesVisionClient();
  const cloudEnabled = !isLocalWorkspace && !!userId;
  const voiceEnabled = cloudEnabled;
  const formBusy = processing || loading || journalVoiceSession;

  const loadHistory = useCallback(async () => {
    if (!farmId || isLocalWorkspace || isLocalWorkspaceEntityId(farmId)) return;
    if (!conversationRef.current) {
      conversationRef.current = await getOrCreateConversationId();
    }
    const { data, error: histErr } = await supabase
      .from('conversation_messages')
      .select('id, role, message_text, created_at')
      .eq('farm_id', farmId)
      .eq('conversation_id', conversationRef.current)
      .order('created_at', { ascending: true })
      .limit(40);
    if (histErr || !data?.length) return;

    const loaded: ChatTurn[] = [];
    for (const row of data) {
      const r = row as { id: string; role: string; message_text: string | null };
      if (!r.message_text) continue;
      loaded.push({
        id: r.id,
        role: r.role as 'user' | 'assistant',
        text: r.message_text,
      });
    }
    if (loaded.length) setTurns(loaded);
  }, [farmId, isLocalWorkspace, supabase]);

  useEffect(() => {
    if (farmId && !loading && !isLocalWorkspace) void loadHistory().catch(() => undefined);
  }, [farmId, isLocalWorkspace, loading, loadHistory]);

  useEffect(() => {
    if (!loading && !farmId) clearPending();
  }, [clearPending, farmId, loading]);

  useEffect(() => {
    if (turns.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [turns, processing]);

  async function applyPhotoPick(pick: PhotoPickResult) {
    setPhotoSheetOpen(false);
    try {
      const stored = await preparePhotoForStorage(pick);
      if (stored.fileSize > maxPhotoBytes) {
        setError(
          photos.tooLarge
            .replace('{size}', formatPhotoSizeLimit(stored.fileSize))
            .replace('{max}', formatPhotoSizeLimit(maxPhotoBytes))
        );
        return;
      }
      setPhotoPick(stored);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : photos.permissionRequired);
    }
  }

  function openText(prefill?: string) {
    if (prefill) setText(prefill);
    setTextOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function closeText() {
    setTextOpen(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
  }

  async function send() {
    const q = text.trim();
    if ((!q && !photoPick) || !farmId || processing || recording) return;
    setError(null);
    setText('');
    setTextOpen(false);
    try {
      await submitText(q);
    } catch (e: unknown) {
      setText(q);
      setTextOpen(true);
      setError(e instanceof Error ? e.message : 'Send failed');
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!farmId) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Select a farm in More → Settings.</Text>
      </View>
    );
  }

  const lastAssistant = [...turns].reverse().find((t) => t.role === 'assistant' && t.response);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {!cycle && (
        <Text style={styles.warn}>No active cycle — answers may be limited.</Text>
      )}

      <FlatList
        ref={listRef}
        style={styles.listFlex}
        data={turns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<AdvisorChatEmpty onPickPrompt={(prompt) => openText(prompt)} />}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={styles.role}>{item.role === 'user' ? 'You' : 'Assistant'}</Text>
            {item.photoUri ? (
              <Image source={{ uri: item.photoUri }} style={styles.bubblePhoto} resizeMode="cover" />
            ) : null}
            <Text style={styles.bubbleText}>{item.text}</Text>
          </View>
        )}
      />

      {lastAssistant?.response && <TrustPanel response={lastAssistant.response} />}

      <AdvisorJournalVoiceCapture
        active={journalVoiceSession}
        onError={(message) => {
          setJournalSaveResult(null);
          setError(message);
        }}
        onSaved={(result) => {
          setError(null);
          setJournalSaveResult(result);
        }}
        onIdle={() => setJournalVoiceSession(false)}
      />

      <AdvisorVoiceButton
        disabled={!voiceEnabled}
        captureActive={!journalVoiceSession}
        pendingPhoto={photoPick}
        onConsumedPhoto={() => setPhotoPick(null)}
        conversationIdRef={conversationRef}
        onError={setError}
        onUserTurn={(spoken, photoUri) => {
          setTurns((prev) => [
            ...prev,
            { id: `local-vu-${Date.now()}`, role: 'user', text: spoken, photoUri: photoUri ?? null },
          ]);
        }}
        onAskResult={(data: AskResponse) => {
          setTurns((prev) => [
            ...prev,
            {
              id: `local-va-${Date.now()}`,
              role: 'assistant',
              text: data.body,
              response: data,
            },
          ]);
        }}
      />

      <View style={[styles.composer, textOpen && styles.composerTextOpen]}>
        {photoPick ? (
          <View style={styles.previewWrap}>
            <AspectPhoto uri={photoPick.uri} maxHeight={160} radius={10} />
            <Pressable
              style={styles.removePhoto}
              onPress={() => setPhotoPick(null)}
              accessibilityRole="button"
              accessibilityLabel={a.removePhotoA11y}
            >
              <Text style={styles.removePhotoText}>{a.removePhoto}</Text>
            </Pressable>
          </View>
        ) : null}
        {textOpen ? (
          <View style={styles.textComposerWrap}>
            <View style={styles.textComposerTrack}>
              <Pressable
                style={styles.textDismissBtn}
                onPress={closeText}
                accessibilityRole="button"
                accessibilityLabel={a.closeTextComposerA11y}
                hitSlop={6}
              >
                <SymbolView
                  name={{ ios: 'xmark', android: 'close', web: 'close' }}
                  tintColor={colors.textMuted}
                  size={16}
                />
              </Pressable>
              <TextInput
                ref={inputRef}
                style={styles.textInputEmbedded}
                placeholder={a.inputPlaceholder}
                placeholderTextColor={colors.placeholder}
                keyboardAppearance={colors.keyboardAppearance}
                value={text}
                onChangeText={setText}
                multiline
                editable={!processing && !recording}
              />
            </View>
            <View style={styles.textFabSpacer} />
            <Pressable
              style={[
                styles.textSendCircle,
                (processing || recording || (!text.trim() && !photoPick)) && styles.textSendCircleDisabled,
              ]}
              onPress={() => void send()}
              disabled={processing || recording || (!text.trim() && !photoPick)}
              accessibilityRole="button"
              accessibilityLabel={a.send}
            >
              {processing ? (
                <ActivityIndicator color={colors.primaryText} size="small" />
              ) : (
                <SymbolView
                  name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }}
                  tintColor={colors.primaryText}
                  size={18}
                  weight="semibold"
                />
              )}
            </Pressable>
          </View>
        ) : null}
        {recording || processing ? (
          <VoiceComposerRow
            recording={recording}
            processing={processing}
            recordingLevel={recordingLevel}
            recordingElapsedSec={recordingElapsedSec}
            voiceEnabled={voiceEnabled}
            formBusy={formBusy}
            showMicButton={false}
            showPhotoButton={false}
            compactIdle
            transcribingLabel={processingLabel ?? copy.procedureTranscribing}
            photoA11y={a.photoA11y}
            voiceStartA11y={copy.procedureVoiceA11y}
            voiceSendA11y={copy.procedureVoiceSendA11y}
            voiceCancelA11y={copy.procedureVoiceCancelA11y}
            primaryColor={colors.primary}
            primaryTextColor={colors.primaryText}
            onOpenPhoto={() => undefined}
            onStartVoice={() => {
              setError(null);
              requestStart();
            }}
            onSendVoice={() => {
              setError(null);
              requestStop();
            }}
            onCancelVoice={() => {
              setError(null);
              requestCancel();
            }}
            onNeedSignIn={() => setError(copy.procedureVoiceNeedSignIn)}
          />
        ) : textOpen ? null : (
          <AssistantOrbitBar
            actions={{
              onPhoto: () => {
                if (!cloudEnabled) {
                  setError(copy.procedurePhotoNeedSignIn);
                  return;
                }
                setPhotoSheetOpen(true);
              },
              onLeaf: () => {
                if (!cloudEnabled) {
                  setError(copy.procedurePhotoNeedSignIn);
                  return;
                }
                if (!cycle?.id || !primaryScope?.id) {
                  setError(a.photoNeedCycle);
                  return;
                }
                router.push('/capture/leaf');
              },
              onKeyboard: () => openText(),
              onQr: () => setEyeMode(true),
              onPlus: () => {
                if (!cloudEnabled) {
                  setJournalSaveResult(null);
                  setError(copy.procedureVoiceNeedSignIn);
                  return;
                }
                if (!cycle?.id || !primaryScope?.id) {
                  setJournalSaveResult(null);
                  setError(a.photoNeedCycle);
                  return;
                }
                if (journalVoiceSession || formBusy) return;
                setError(null);
                setJournalSaveResult(null);
                setJournalVoiceSession(true);
              },
              eyeDisabled: true,
              photoDisabled: formBusy,
              leafDisabled: formBusy,
              keyboardDisabled: formBusy || textOpen,
              qrDisabled: true,
              plusDisabled: formBusy,
            }}
          />
        )}
      </View>

      <JournalVoiceSavedSheet
        visible={journalSaveResult != null}
        result={journalSaveResult}
        farmName={activeFarm?.name ?? null}
        cycle={cycle}
        scope={primaryScope}
        timeZone={displayFarmTimezone}
        cancelPending={journalUndoPending}
        onOk={() => setJournalSaveResult(null)}
        onCancel={() => {
          void (async () => {
            const eventId = journalSaveResult?.eventId;
            if (!eventId || !farmId) {
              setJournalSaveResult(null);
              return;
            }
            setJournalUndoPending(true);
            setError(null);
            try {
              const { error: deleteError } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId)
                .eq('farm_id', farmId);
              if (deleteError) throw deleteError;
              await refetchAll();
              setJournalSaveResult(null);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : 'Could not cancel entry');
            } finally {
              setJournalUndoPending(false);
            }
          })();
        }}
      />

      <ProcedurePhotoPickerSheet
        visible={photoSheetOpen}
        permissionRequiredLabel={photos.permissionRequired}
        takePhotoLabel={photos.takePhoto}
        chooseGalleryLabel={photos.chooseGallery}
        onClose={() => setPhotoSheetOpen(false)}
        onPick={(pick) => void applyPhotoPick(pick)}
        onError={(message) => setError(message)}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    listFlex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    warn: {
      marginHorizontal: 12,
      marginTop: 8,
      padding: 10,
      backgroundColor: c.warningSurface,
      borderWidth: 1,
      borderColor: c.warningBorder,
      color: c.text,
      borderRadius: 8,
      fontSize: 13,
    },
    list: { padding: 12, paddingBottom: 8, flexGrow: 1 },
    bubble: { borderRadius: 12, padding: 12, marginBottom: 10, maxWidth: '92%' },
    userBubble: { alignSelf: 'flex-end', backgroundColor: c.rowActiveBg },
    aiBubble: { alignSelf: 'flex-start', backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
    role: { fontSize: 10, fontWeight: '700', color: c.textMuted, marginBottom: 4, textTransform: 'uppercase' },
    bubblePhoto: { width: '100%', height: 140, borderRadius: 8, marginBottom: 8 },
    bubbleText: { fontSize: 15, color: c.text, lineHeight: 21 },
    composer: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4, gap: 8 },
    composerTextOpen: { paddingBottom: 10, paddingHorizontal: 10 },
    previewWrap: { gap: 6 },
    removePhoto: { alignSelf: 'flex-start' },
    removePhotoText: { color: c.dangerText, fontSize: 13, fontWeight: '600' },
    textComposerWrap: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
    },
    textComposerTrack: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
      backgroundColor: c.surfaceMuted,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingLeft: 6,
      paddingRight: 10,
      paddingVertical: 4,
      minHeight: 44,
    },
    textDismissBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    textInputEmbedded: {
      flex: 1,
      minHeight: 36,
      maxHeight: 120,
      paddingVertical: 8,
      paddingHorizontal: 2,
      fontSize: 16,
      lineHeight: 21,
      color: c.text,
      backgroundColor: 'transparent',
    },
    textFabSpacer: { width: 34 },
    textSendCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#1b4332',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 3,
      elevation: 2,
    },
    textSendCircleDisabled: { opacity: 0.42, shadowOpacity: 0 },
    error: { color: c.dangerText, padding: 12, fontSize: 14 },
    muted: { color: c.textMuted, textAlign: 'center', padding: 24 },
  });
}
