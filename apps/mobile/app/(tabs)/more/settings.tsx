import { useMobileLocale } from '@/context/LocaleContext';
import { OfflineQueuePanel } from '@/components/settings/OfflineQueuePanel';
import { LanguagePreferenceSection } from '@/components/settings/LanguagePreferenceSection';
import { ThemePreferenceSection } from '@/components/settings/ThemePreferenceSection';
import { PushNotificationsSection } from '@/components/settings/PushNotificationsSection';
import { SETTINGS_FIELD_METRICS as M } from '@/components/settings/settings-field-metrics';
import { WorkspaceSyncSection } from '@/components/settings/WorkspaceSyncSection';
import { TuyaFarmLinksSection } from '@/components/settings/TuyaFarmLinksSection';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { LOCAL_WORKSPACE_IDS, removeFarmMember } from '@growlog/domain';
import { useFarmContext } from '@/providers/FarmProvider';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export const FARM_NAME_SAVE_MS = 600;

function messageOf(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err && 'message' in err && typeof err.message === 'string' && err.message) {
    return err.message;
  }
  return fallback;
}

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
      borderColor: colors.border,
      borderRadius: M.borderRadius,
      paddingHorizontal: M.paddingHorizontal,
      paddingVertical: M.paddingVertical,
      minHeight: M.minHeight,
      backgroundColor: colors.card,
      color: colors.text,
      fontSize: 16,
      marginBottom: M.marginBottom,
    },
    row: {
      backgroundColor: colors.card,
      paddingHorizontal: M.paddingHorizontal,
      paddingVertical: M.paddingVertical,
      minHeight: M.minHeight,
      justifyContent: 'center',
      borderRadius: M.borderRadius,
      marginBottom: M.marginBottom,
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
    hint: { color: colors.textMuted, fontSize: 12, marginTop: -4, marginBottom: 8 },
    fieldError: { color: colors.dangerText, fontSize: 12, marginTop: -4, marginBottom: 8 },
    logout: {
      marginTop: 32,
      paddingHorizontal: M.paddingHorizontal,
      paddingVertical: M.paddingVertical,
      minHeight: M.minHeight,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: M.borderRadius,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
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
    newlyAcceptedInvitations,
    dismissAcceptedInvitation,
  } = useFarmContext();
  const isCloudFarm = Boolean(farmId && farmId !== LOCAL_WORKSPACE_IDS.farm);
  const farm = farms.find((f) => f.id === farmId);
  const [draft, setDraft] = useState<string | null>(null);
  const [trackedFarmId, setTrackedFarmId] = useState(farmId);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const name = draft ?? farm?.name ?? '';
  const farmIdRef = useRef(farmId);
  const canSaveRef = useRef(isCloudFarm);
  const persistedName = useRef(farm?.name ?? '');
  const desiredName = useRef<string | null>(null);
  const targetFarmId = useRef<string | null>(null);
  const writing = useRef(false);
  const mountedRef = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseRef = useRef(supabase);
  const refetchRef = useRef(refetchAll);
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const switchedFarmSave = useRef<{ id: string; name: string } | null>(null);
  farmIdRef.current = farmId;
  canSaveRef.current = isCloudFarm;
  supabaseRef.current = supabase;
  refetchRef.current = refetchAll;

  if (farmId !== trackedFarmId) {
    const pendingName = desiredName.current?.trim() ?? '';
    const pendingId = targetFarmId.current;
    if (
      !writing.current &&
      pendingId &&
      pendingId === trackedFarmId &&
      pendingName &&
      pendingName !== persistedName.current
    ) {
      switchedFarmSave.current = { id: pendingId, name: pendingName };
    }
    setTrackedFarmId(farmId);
    setDraft(null);
    setSaveState('idle');
    setSaveError(null);
    desiredName.current = null;
    targetFarmId.current = null;
    persistedName.current = farm?.name ?? '';
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }

  useEffect(() => {
    const pending = switchedFarmSave.current;
    if (!pending) return;
    switchedFarmSave.current = null;
    void supabaseRef.current
      .from('farms')
      .update({ name: pending.name })
      .eq('id', pending.id)
      .then(({ error }) => {
        if (!error) refetchRef.current();
      });
  }, [trackedFarmId]);

  useEffect(() => {
    const serverName = farm?.name ?? '';
    if (!writing.current && desiredName.current == null) {
      persistedName.current = serverName;
    }
    setDraft((current) => (current != null && current.trim() === serverName ? null : current));
  }, [farm?.id, farm?.name]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const id = targetFarmId.current;
      const pendingName = desiredName.current?.trim();
      if (!id || !pendingName || pendingName === persistedName.current || writing.current) return;
      void supabaseRef.current
        .from('farms')
        .update({ name: pendingName })
        .eq('id', id)
        .then(({ error }) => {
          if (!error) refetchRef.current();
        });
    };
  }, []);

  // One farms write at a time. A newer name typed during the request is sent
  // after it finishes, so an older response cannot land last.
  flushRef.current = async () => {
    if (writing.current) return;
    const id = targetFarmId.current;
    const next = desiredName.current;
    if (!id || !next || next === persistedName.current) {
      desiredName.current = null;
      return;
    }
    writing.current = true;
    desiredName.current = null;
    if (mountedRef.current && farmIdRef.current === id) {
      setSaveState('saving');
      setSaveError(null);
    }
    try {
      const { error } = await supabaseRef.current.from('farms').update({ name: next }).eq('id', id);
      if (error) throw error;
      if (farmIdRef.current === id) persistedName.current = next;
      refetchRef.current();
      if (mountedRef.current && farmIdRef.current === id && !desiredName.current) {
        setSaveState('saved');
      }
    } catch (err: unknown) {
      if (desiredName.current && desiredName.current !== next) return;
      if (mountedRef.current && farmIdRef.current === id) {
        setSaveState('error');
        setSaveError(messageOf(err, cm.error));
      }
    } finally {
      writing.current = false;
      const pendingName = desiredName.current;
      if (pendingName && pendingName !== next && pendingName !== persistedName.current) {
        void flushRef.current();
      }
    }
  };

  function queueFarmName(raw: string, immediate = false) {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const id = farmIdRef.current;
    const next = raw.trim();
    if (!canSaveRef.current || !id || !next || next === persistedName.current) {
      desiredName.current = null;
      return;
    }
    desiredName.current = next;
    targetFarmId.current = id;
    if (immediate) {
      void flushRef.current();
      return;
    }
    saveTimer.current = setTimeout(() => {
      void flushRef.current();
    }, FARM_NAME_SAVE_MS);
  }

  function onChangeName(text: string) {
    setDraft(text);
    if (saveState !== 'idle') {
      setSaveState('idle');
      setSaveError(null);
    }
    queueFarmName(text);
  }

  function commitName() {
    const next = name.trim();
    if (!next || next === persistedName.current) {
      setDraft(null);
      desiredName.current = null;
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      if (!next || saveState === 'error') {
        setSaveState('idle');
        setSaveError(null);
      }
      return;
    }
    queueFarmName(next, true);
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
      {newlyAcceptedInvitations.map((inv) => (
        <View key={inv.farm_id} style={[styles.card, { padding: 12 }]}>
          <Text style={styles.body}>
            {strings.farmMembersScreen.bannerAdded.replace('{farm}', inv.farm_name)}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <Pressable
              style={styles.btn}
              onPress={() => {
                setFarmId(inv.farm_id);
                dismissAcceptedInvitation(inv.farm_id);
              }}
            >
              <Text style={styles.btnText}>{strings.farmMembersScreen.bannerOpen}</Text>
            </Pressable>
            <Pressable
              style={styles.btn}
              onPress={() => {
                if (!userId) return;
                void removeFarmMember(supabase, { farmId: inv.farm_id, userId }).then(() => {
                  dismissAcceptedInvitation(inv.farm_id);
                  refetchAll();
                });
              }}
            >
              <Text style={styles.btnText}>{strings.farmMembersScreen.bannerLeave}</Text>
            </Pressable>
            <Pressable onPress={() => dismissAcceptedInvitation(inv.farm_id)}>
              <Text style={styles.muted}>{strings.farmMembersScreen.bannerDismiss}</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Pressable style={styles.row} onPress={() => router.push('/(tabs)/more/members')}>
        <Text style={{ color: colors.text }}>{ss.membersLink}</Text>
      </Pressable>
      <Text style={styles.section}>{ss.farm}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={onChangeName}
        onBlur={commitName}
        onSubmitEditing={commitName}
        returnKeyType="done"
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
      />
      {saveState === 'saving' ? <Text style={styles.hint}>{cm.saving}</Text> : null}
      {saveState === 'saved' ? <Text style={styles.hint}>{cm.saved}</Text> : null}
      {saveState === 'error' ? <Text style={styles.fieldError}>{saveError}</Text> : null}

      <TuyaFarmLinksSection />

      {farms.length >= 1 && (
        <>
          {farms.length > 1 ? (
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
          ) : null}
          <Pressable style={styles.row} onPress={() => router.push('/(onboarding)')}>
            <Text style={{ color: colors.text }}>{ss.createOwnFarm}</Text>
          </Pressable>
        </>
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

      <PushNotificationsSection />

      <Text style={styles.section}>{ss.offlineSync}</Text>
      <OfflineQueuePanel />
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

