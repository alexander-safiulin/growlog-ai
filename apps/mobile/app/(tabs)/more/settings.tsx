import { useMobileLocale } from '@/context/LocaleContext';
import { OfflineQueuePanel } from '@/components/settings/OfflineQueuePanel';
import { LanguagePreferenceSection } from '@/components/settings/LanguagePreferenceSection';
import { ThemePreferenceSection } from '@/components/settings/ThemePreferenceSection';
import { WorkspaceSyncSection } from '@/components/settings/WorkspaceSyncSection';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { LOCAL_WORKSPACE_IDS } from '@growlog/domain';
import { useFarmContext } from '@/providers/FarmProvider';
import { registerForPushNotifications } from '@/lib/notifications';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function themedStyles(colors: MobileThemeColors) {
  return StyleSheet.create({
    container: { padding: 16, paddingBottom: 120, backgroundColor: colors.screen },
    section: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.sectionLabel,
      marginTop: 16,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      padding: 12,
      backgroundColor: colors.inputBg,
      color: colors.text,
      marginBottom: 8,
    },
    row: {
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowActive: { borderColor: colors.rowActiveBorder, backgroundColor: colors.rowActiveBg },
    card: { marginBottom: 8 },
    body: { fontSize: 15, color: colors.text, marginBottom: 4 },
    btn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    btnText: { color: colors.primaryText, fontWeight: '600' },
    muted: { color: colors.textMuted, fontSize: 14 },
    mutedSmall: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
    ok: { color: colors.okText, marginTop: 12 },
    logout: {
      marginTop: 32,
      padding: 14,
      alignItems: 'center',
      borderRadius: 10,
      backgroundColor: colors.dangerBg,
    },
    logoutText: { color: colors.dangerText, fontWeight: '600' },
  });
}

export default function SettingsScreen() {
  const { strings } = useMobileLocale();
  const ss = strings.settingsScreen;
  const cm = strings.commonMobile;
  const { colors } = useTheme();
  const styles = useMemo(() => themedStyles(colors), [colors]);
  const {
    supabase,
    farms,
    farmId,
    setFarmId,
    cycle,
    scopes,
    scopeId,
    setScopeId,
    refetchAll,
    isLocalWorkspace,
    userId,
  } = useFarmContext();
  const isCloudFarm = Boolean(farmId && farmId !== LOCAL_WORKSPACE_IDS.farm);
  const farm = farms.find((f) => f.id === farmId);
  const [name, setName] = useState(farm?.name ?? '');
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    if (farm) setName(farm.name);
  }, [farm]);

  async function saveFarmName() {
    if (!farmId) return;
    setPending(true);
    setMsg(null);
    try {
      const { error } = await supabase.from('farms').update({ name: name.trim() }).eq('id', farmId);
      if (error) throw error;
      await refetchAll();
      setMsg(cm.saved);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : cm.error);
    } finally {
      setPending(false);
    }
  }

  async function enablePush() {
    const token = await registerForPushNotifications(supabase);
    setPushToken(token);
    setMsg(token ? ss.pushEnabled : ss.pushDenied);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} style={{ backgroundColor: colors.screen }}>
      <ThemePreferenceSection />
      <LanguagePreferenceSection />
      <WorkspaceSyncSection />
      {!userId && (
        <Pressable
          style={styles.btn}
          onPress={() => router.push('/(auth)/login?reason=sync')}
        >
          <Text style={styles.btnText}>{strings.more.signIn}</Text>
        </Pressable>
      )}
      {isLocalWorkspace ? (
        <Text style={styles.muted}>{ss.localJournalHint}</Text>
      ) : null}
      {!isCloudFarm ? null : (
        <>
      <Text style={styles.section}>{ss.farm}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      <Pressable style={styles.btn} onPress={() => void saveFarmName()} disabled={pending}>
        <Text style={styles.btnText}>{pending ? cm.saving : ss.saveFarmName}</Text>
      </Pressable>

      {farms.length > 1 && (
        <>
          <Text style={styles.section}>{ss.activeFarm}</Text>
          {farms.map((f) => (
            <Pressable
              key={f.id}
              style={[styles.row, f.id === farmId && styles.rowActive]}
              onPress={() => setFarmId(f.id)}
            >
              <Text style={{ color: colors.text }}>{f.name}</Text>
            </Pressable>
          ))}
        </>
      )}

      {cycle && (
        <View style={styles.card}>
          <Text style={styles.section}>{ss.activeCycle}</Text>
          <Text style={styles.body}>
            {cycle.name} · {cycle.stage} · {ss.since} {cycle.start_date}
          </Text>
        </View>
      )}

      {scopes.length > 1 && (
        <>
          <Text style={styles.section}>{ss.scope}</Text>
          {scopes.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.row, s.id === scopeId && styles.rowActive]}
              onPress={() => setScopeId(s.id)}
            >
              <Text style={{ color: colors.text }}>{s.display_name || s.scope_type}</Text>
            </Pressable>
          ))}
        </>
      )}

      <Text style={styles.section}>{ss.offlineSync}</Text>
      <OfflineQueuePanel />

      <Text style={styles.section}>{ss.notifications}</Text>
      <Pressable style={styles.btn} onPress={() => void enablePush()}>
        <Text style={styles.btnText}>{ss.enablePush}</Text>
      </Pressable>
      {pushToken ? <Text style={styles.mutedSmall}>{ss.tokenRegistered}</Text> : null}

      {msg ? <Text style={styles.ok}>{msg}</Text> : null}
        </>
      )}

      {isLocalWorkspace && cycle ? (
        <View style={styles.card}>
          <Text style={styles.section}>{ss.onThisDevice}</Text>
          <Text style={styles.body}>
            {cycle.name} · {cycle.stage} · {ss.since} {cycle.start_date}
          </Text>
        </View>
      ) : null}

      {userId ? (
        <Pressable style={styles.logout} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logoutText}>{ss.logOut}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

