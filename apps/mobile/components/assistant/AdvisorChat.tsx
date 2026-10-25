import { AdvisorVoiceButton } from '@/components/assistant/AdvisorVoiceButton';
import { TrustPanel } from '@/components/trust/TrustPanel';
import { useTheme } from '@/context/ThemeContext';
import { useVoiceCapture } from '@/context/VoiceCaptureContext';
import type { AskResponse, ChatTurn } from '@/lib/advisor-types';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { uploadPhotoCapture, type PhotoPickResult } from '@/lib/photo-upload';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
  const { supabase, farmId, cycle, primaryScope, userId, loading, refetchAll } = useFarmContext();
  const { recording, processing, submitText, clearPending } = useVoiceCapture();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [text, setText] = useState('');
  const [textOpen, setTextOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [photoPending, setPhotoPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const inputRef = useRef<TextInput>(null);
  const conversationRef = useRef<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const loadHistory = useCallback(async () => {
    if (!farmId) return;
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
  }, [farmId, supabase]);

  useEffect(() => {
    if (farmId && !loading) void loadHistory();
  }, [farmId, loading, loadHistory]);

  useEffect(() => {
    if (!loading && !farmId) clearPending();
  }, [clearPending, farmId, loading]);

  useEffect(() => {
    if (turns.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [turns, processing, photoPending]);

  function openText() {
    setAddOpen(false);
    setTextOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function send() {
    const q = text.trim();
    if (!q || !farmId || processing || recording || photoPending) return;
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

  async function addPhoto(source: 'camera' | 'library') {
    setAddOpen(false);
    if (recording || processing) {
      setError('Stop the mic before adding a photo.');
      return;
    }
    if (!farmId || !cycle || !primaryScope) {
      setError('Select a farm and cycle first.');
      return;
    }
    setError(null);

    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Permission required');
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

    setPhotoPending(true);
    try {
      const outcome = await uploadPhotoCapture(supabase, {
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope.id,
        pick,
        userId,
      });
      await refetchAll();
      const note = outcome === 'queued' ? 'Photo saved offline' : 'Photo added';
      setTurns((prev) => [...prev, { id: `local-photo-${Date.now()}`, role: 'user', text: note }]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setPhotoPending(false);
    }
  }

  async function newConversation() {
    const id = crypto.randomUUID();
    await SecureStore.setItemAsync(ADVISOR_CONVERSATION_KEY, id);
    conversationRef.current = id;
    setTurns([]);
    setError(null);
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
        ListEmptyComponent={
          <Text style={styles.muted}>Tap the mic to log or ask. Use + for text or a photo.</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={styles.role}>{item.role === 'user' ? 'You' : 'Assistant'}</Text>
            <Text style={styles.bubbleText}>{item.text}</Text>
          </View>
        )}
      />

      {lastAssistant?.response && <TrustPanel response={lastAssistant.response} />}

      <AdvisorVoiceButton
        disabled={photoPending}
        onError={setError}
        onUserTurn={(spoken) => {
          setTurns((prev) => [...prev, { id: `local-vu-${Date.now()}`, role: 'user', text: spoken }]);
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
        {(recording || processing || photoPending) && (
          <Text style={styles.status}>
            {recording ? 'Recording… tap the mic to stop' : photoPending ? 'Adding photo…' : 'Working…'}
          </Text>
        )}
        {addOpen ? (
          <View style={styles.addMenu}>
            <Pressable style={styles.addItem} onPress={openText}>
              <Text style={styles.addItemText}>Text</Text>
            </Pressable>
            <Pressable style={styles.addItem} onPress={() => void addPhoto('camera')}>
              <Text style={styles.addItemText}>Take photo</Text>
            </Pressable>
            <Pressable style={styles.addItem} onPress={() => void addPhoto('library')}>
              <Text style={styles.addItemText}>Choose photo</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.inputRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add text or photo"
            style={[styles.plusBtn, (recording || processing) && styles.sendDisabled]}
            onPress={() => setAddOpen((open) => !open)}
            disabled={recording || processing}
          >
            <Text style={styles.plusText}>+</Text>
          </Pressable>
          {textOpen ? (
            <>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Log a fact or ask…"
                placeholderTextColor={colors.placeholder}
                keyboardAppearance={colors.keyboardAppearance}
                value={text}
                onChangeText={setText}
                multiline
                editable={!processing && !photoPending}
              />
              <Pressable
                style={[styles.sendBtn, (processing || photoPending || !text.trim()) && styles.sendDisabled]}
                onPress={() => void send()}
                disabled={processing || photoPending || !text.trim()}
              >
                {processing ? (
                  <ActivityIndicator color={colors.primaryText} size="small" />
                ) : (
                  <Text style={styles.sendText}>Send</Text>
                )}
              </Pressable>
            </>
          ) : (
            <Text style={styles.hint}>
              {recording ? 'Listening' : 'Mic logs and asks. + adds text or a photo.'}
            </Text>
          )}
        </View>
      </View>

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
    bubbleText: { fontSize: 15, color: c.text, lineHeight: 21 },
    composer: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
    status: { fontSize: 13, color: c.dangerText, fontWeight: '600', marginBottom: 6 },
    addMenu: {
      alignSelf: 'flex-start',
      marginBottom: 8,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      minWidth: 180,
    },
    addItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    addItemText: { fontSize: 16, color: c.text, fontWeight: '600' },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    plusBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plusText: { fontSize: 32, lineHeight: 36, color: c.text, fontWeight: '400' },
    hint: { flex: 1, color: c.textMuted, fontSize: 14, paddingBottom: 12 },
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
    error: { color: c.dangerText, padding: 12, fontSize: 14 },
    muted: { color: c.textMuted, textAlign: 'center', padding: 24 },
  });
}
