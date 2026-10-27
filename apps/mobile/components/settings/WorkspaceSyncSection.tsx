import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { runFullLocalSync } from '@/lib/sync-local-to-cloud';
import { useFarmContext } from '@/providers/FarmProvider';
import { localJournalPendingSync } from '@growlog/domain';
import { resolveGuestMergeTargetFarm } from '@/lib/sync-local-to-cloud';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export function WorkspaceSyncSection() {
  const { strings } = useMobileLocale();
  const { colors } = useTheme();
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
  const [guestTargetName, setGuestTargetName] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setGuestTargetName(null);
      return;
    }
    void resolveGuestMergeTargetFarm(supabase, { userId, activeFarmId: farmId }).then((t) => {
      setGuestTargetName(t?.farmName ?? null);
    });
  }, [supabase, userId, farmId]);

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
        activeFarmId: farmId,
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
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{copy.syncTitle}</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>{copy.syncDesc}</Text>
      {guestTargetName ? (
        <Text style={[styles.body, { color: colors.text }]}>
          {strings.farmMembersScreen.mergeTargetLabel.replace('{farm}', guestTargetName)}
        </Text>
      ) : null}
      <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => void handleSync()} disabled={pending}>
        {pending ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={[styles.btnText, { color: colors.primaryText }]}>{copy.syncAction}</Text>
        )}
      </Pressable>
      {msg ? <Text style={[styles.msg, { color: colors.okText }]}>{msg}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  title: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  btn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { fontWeight: '600' },
  msg: { fontSize: 13 },
});
