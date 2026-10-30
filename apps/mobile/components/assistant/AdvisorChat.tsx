import { AdvisorVoiceButton } from '@/components/assistant/AdvisorVoiceButton';
import { ProcedurePhotoPickerSheet } from '@/components/cycle/ProcedurePhotoPickerSheet';
import { AspectPhoto } from '@/components/media/AspectPhoto';
import { VoiceComposerRow } from '@/components/voice/VoiceComposerRow';
import { useMobileLocale } from '@/context/LocaleContext';
import { TrustPanel } from '@/components/trust/TrustPanel';
import { useTheme } from '@/context/ThemeContext';
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
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
  const { supabase, farmId, cycle, primaryScope, userId, loading, isLocalWorkspace } = useFarmContext();
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
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const inputRef = useRef<TextInput>(null);
  const conversationRef = useRef<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const maxPhotoBytes = getMaxPhotoBytesVisionClient();
  const cloudEnabled = !isLocalWorkspace && !!userId;
  const voiceEnabled = cloudEnabled;
  const formBusy = processing || loading;

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

  function openText() {
    setTextOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
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

  async function newConversation() {
    const id = crypto.randomUUID();
    await SecureStore.setItemAsync(ADVISOR_CONVERSATION_KEY, id);
    conversationRef.current = id;
    setTurns([]);
    setError(null);
    setPhotoPick(null);
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
      <View style={styles.banner}>
        <Text style={styles.bannerText}>Answers use farm facts + trust layer</Text>
        <View style={styles.bannerActions}>
          <Pressable onPress={() => void newConversation()}>
            <Text style={styles.link}>New chat</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/timeline')}>
            <Text style={styles.link}>Timeline</Text>
          </Pressable>
        </View>
      </View>

      {!cycle && (
        <Text style={styles.warn}>No active cycle — answers may be limited.</Text>
      )}

      <FlatList
        ref={listRef}
        style={styles.listFlex}
        data={turns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.muted}>{a.emptyHint}</Text>}
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

      <AdvisorVoiceButton
        disabled={!voiceEnabled}
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

      <View style={styles.composer}>
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
          <View style={styles.textRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={a.inputPlaceholder}
              placeholderTextColor={colors.placeholder}
              keyboardAppearance={colors.keyboardAppearance}
              value={text}
              onChangeText={setText}
              multiline
              editable={!processing && !recording}
            />
            <Pressable
              style={[styles.sendBtn, (processing || recording || (!text.trim() && !photoPick)) && styles.sendDisabled]}
              onPress={() => void send()}
              disabled={processing || recording || (!text.trim() && !photoPick)}
            >
              {processing ? (
                <ActivityIndicator color={colors.primaryText} size="small" />
              ) : (
                <Text style={styles.sendText}>{a.send}</Text>
              )}
            </Pressable>
          </View>
        ) : null}
        <VoiceComposerRow
          recording={recording}
          processing={processing}
          recordingLevel={recordingLevel}
          recordingElapsedSec={recordingElapsedSec}
          voiceEnabled={voiceEnabled}
          formBusy={formBusy}
          voiceHint={a.voiceHint}
          transcribingLabel={processingLabel ?? copy.procedureTranscribing}
          photoA11y={a.photoA11y}
          voiceStartA11y={copy.procedureVoiceA11y}
          voiceSendA11y={copy.procedureVoiceSendA11y}
          voiceCancelA11y={copy.procedureVoiceCancelA11y}
          primaryColor={colors.primary}
          primaryTextColor={colors.primaryText}
          photoIcon="photo"
          onOpenPhoto={() => {
            if (!cloudEnabled) {
              setError(copy.procedurePhotoNeedSignIn);
              return;
            }
            if (recording) return;
            setPhotoSheetOpen(true);
          }}
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
        {!textOpen ? (
          <Pressable onPress={openText} style={styles.textLink} accessibilityRole="button">
            <Text style={styles.textLinkLabel}>{a.text}</Text>
          </Pressable>
        ) : null}
      </View>

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
    banner: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      marginHorizontal: 12,
      marginTop: 8,
      backgroundColor: c.rowActiveBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    bannerText: { fontSize: 13, color: c.okText, flex: 1 },
    bannerActions: { flexDirection: 'row', gap: 16 },
    link: { fontSize: 13, color: c.primary, fontWeight: '600' },
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
    composer: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8, gap: 8 },
    previewWrap: { gap: 6 },
    removePhoto: { alignSelf: 'flex-start' },
    removePhotoText: { color: c.dangerText, fontSize: 13, fontWeight: '600' },
    textRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: c.inputBg,
      color: c.text,
      fontSize: 16,
    },
    sendBtn: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minWidth: 64,
      alignItems: 'center',
    },
    sendDisabled: { opacity: 0.5 },
    sendText: { color: c.primaryText, fontWeight: '600' },
    textLink: { alignSelf: 'center', paddingVertical: 4 },
    textLinkLabel: { fontSize: 14, color: c.primary, fontWeight: '600' },
    error: { color: c.dangerText, padding: 12, fontSize: 14 },
    muted: { color: c.textMuted, textAlign: 'center', padding: 24 },
  });
}
