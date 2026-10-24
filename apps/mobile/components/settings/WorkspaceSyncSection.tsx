import { useMobileLocale } from '@/context/LocaleContext';
import { runFullLocalSync } from '@/lib/sync-local-to-cloud';
import { useFarmContext } from '@/providers/FarmProvider';
import { localJournalPendingSync } from '@growlog/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export function WorkspaceSyncSection() {
  const { strings } = useMobileLocale();
  const copy = strings.workspace;
  const {
    supabase,
    userId,
    farmId,
    cycle,
    primaryScope,
    isLocalWorkspace,
    localWorkspace,
    refetchAll,
  } = useFarmContext();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const hasLocalJournal = localWorkspace ? localJournalPendingSync(localWorkspace) : false;
  if (!isLocalWorkspace && !hasLocalJournal) return null;

  async function handleSync() {
    setMsg(null);
    if (!userId) {
      router.push('/(auth)/login?reason=sync');
      return;
    }
    if (!farmId || !cycle || !primaryScope) {
      router.push('/(onboarding)');
      return;
    }
    if (!localWorkspace) return;
    setPending(true);
    try {
      await runFullLocalSync(supabase, {
        localStore: localWorkspace,
        farmId,
        cycleId: cycle.id,
        scopeId: primaryScope.id,
        userId,
      });
      setMsg(copy.syncDone);
      refetchAll();
    } catch {
      setMsg(copy.syncFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{copy.syncTitle}</Text>
      <Text style={styles.body}>{copy.syncDesc}</Text>
      <Pressable style={styles.btn} onPress={() => void handleSync()} disabled={pending}>
        {pending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{copy.syncAction}</Text>
        )}
      </Pressable>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d8ead9',
    marginBottom: 12,
    gap: 8,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1b4332' },
  body: { fontSize: 14, color: '#52796f', lineHeight: 20 },
  btn: {
    backgroundColor: '#2d6a4f',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  msg: { fontSize: 13, color: '#166534' },
});
