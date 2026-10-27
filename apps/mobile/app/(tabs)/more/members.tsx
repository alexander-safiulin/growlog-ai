import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useFarmContext } from '@/providers/FarmProvider';
import type { MobileStrings } from '@growlog/domain';
import {
  changeFarmMemberRole,
  createFarmInvitation,
  FARM_ROLES,
  fetchMyFarmMemberships,
  listFarmInvitations,
  listFarmMembers,
  removeFarmMember,
  revokeFarmInvitation,
  type FarmInvitationRow,
  type FarmMemberRow,
  type FarmRole,
} from '@growlog/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function emailFromInput(value: string): string {
  return value.replace(/[\r\n\u2028\u2029]/g, '');
}

function roleLabel(fm: MobileStrings['farmMembersScreen'], role: FarmRole): string {
  switch (role) {
    case 'admin':
      return fm.roleAdmin;
    case 'manager':
      return fm.roleManager;
    case 'grower':
      return fm.roleGrower;
    case 'viewer':
      return fm.roleViewer;
    default:
      return role;
  }
}

function themed(colors: MobileThemeColors) {
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
    card: {
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      color: colors.text,
      backgroundColor: colors.card,
    },
    btn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    btnOutline: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      alignItems: 'center',
      marginTop: 6,
    },
    roleChipActive: {
      borderColor: colors.rowActiveBorder,
      backgroundColor: colors.rowActiveBg,
    },
    btnText: { color: colors.primaryText, fontWeight: '600' },
    muted: { color: colors.textMuted, fontSize: 14 },
    body: { color: colors.text, fontSize: 15 },
  });
}

export default function FarmMembersScreen() {
  const { strings } = useMobileLocale();
  const fm = strings.farmMembersScreen;
  const { colors } = useTheme();
  const styles = useMemo(() => themed(colors), [colors]);
  const { supabase, farmId, userId, refetchAll } = useFarmContext();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<FarmRole>('grower');
  const [msg, setMsg] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: ['farm-members', farmId],
    enabled: !!farmId,
    queryFn: () => listFarmMembers(supabase, farmId!),
  });

  const membershipQuery = useQuery({
    queryKey: ['my-farm-memberships', userId],
    enabled: !!userId,
    queryFn: () => fetchMyFarmMemberships(supabase, userId!),
  });

  const myRole =
    membershipQuery.data?.find((m) => m.farm_id === farmId)?.role ??
    membersQuery.data?.find((m) => m.user_id === userId)?.role ??
    null;
  const isAdmin = myRole === 'admin';
  const canSeeInvites = myRole === 'admin' || myRole === 'manager';

  const invitesQuery = useQuery({
    queryKey: ['farm-invitations', farmId],
    enabled: !!farmId && canSeeInvites,
    queryFn: () => listFarmInvitations(supabase, farmId!),
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['farm-members', farmId] });
    await queryClient.invalidateQueries({ queryKey: ['farm-invitations', farmId] });
    await refetchAll();
  }

  async function onInvite() {
    if (!farmId || !isAdmin) return;
    try {
      await createFarmInvitation(supabase, { farmId, email: email.trim(), role });
      setEmail('');
      setMsg(fm.inviteSent);
      await refresh();
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      setMsg(text.includes('already_member') ? fm.alreadyMember : text);
    }
  }

  function onRemove(member: FarmMemberRow) {
    if (!farmId) return;
    const self = member.user_id === userId;
    Alert.alert(
      self ? fm.leaveFarm : fm.removeMember,
      self ? fm.confirmLeave : fm.confirmRemove,
      [
        { text: strings.commonMobile.cancel, style: 'cancel' },
        {
          text: self ? fm.leaveFarm : fm.removeMember,
          style: 'destructive',
          onPress: () => {
            void removeFarmMember(supabase, { farmId, userId: member.user_id })
              .then(refresh)
              .catch((err: unknown) => {
                const text = err instanceof Error ? err.message : String(err);
                setMsg(text.includes('last_admin') ? fm.lastAdminError : text);
              });
          },
        },
      ],
    );
  }

  if (!farmId) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>{strings.commonMobile.loading}</Text>
      </View>
    );
  }

  const pending =
    invitesQuery.data?.filter((i: FarmInvitationRow) => i.status === 'pending') ?? [];

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.container}
    >
      <Text style={styles.muted}>{fm.desc}</Text>

      {membershipQuery.isLoading && !isAdmin ? (
        <Text style={styles.muted}>{strings.commonMobile.loading}</Text>
      ) : null}
      {membershipQuery.isError ? (
        <Text style={{ color: colors.dangerText, marginBottom: 8 }}>
          {membershipQuery.error instanceof Error
            ? membershipQuery.error.message
            : strings.commonMobile.error}
        </Text>
      ) : null}

      {isAdmin && (
        <View style={styles.card}>
          <Text style={styles.section}>{fm.inviteByEmail}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(value) => setEmail(emailFromInput(value))}
            placeholder={fm.inviteeEmail}
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            inputMode="email"
            multiline
            scrollEnabled={false}
            submitBehavior="blurAndSubmit"
          />
          <Text style={styles.body}>{fm.role}: {roleLabel(fm, role)}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
            {FARM_ROLES.map((r) => (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                style={[styles.btnOutline, r === role && styles.roleChipActive]}
              >
                <Text style={{ color: colors.text }}>{roleLabel(fm, r)}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.muted}>{fm.inviteSignInHint}</Text>
          <Pressable style={styles.btn} onPress={() => void onInvite()}>
            <Text style={styles.btnText}>{fm.inviteSubmit}</Text>
          </Pressable>
        </View>
      )}

      {canSeeInvites && pending.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.section}>{fm.pendingStatus}</Text>
          {pending.map((inv) => (
            <View key={inv.id} style={{ marginBottom: 8 }}>
              <Text style={styles.body}>
                {inv.email_normalized} · {roleLabel(fm, inv.role)}
              </Text>
              {isAdmin && (
                <Pressable
                  style={styles.btnOutline}
                  onPress={() => {
                    void revokeFarmInvitation(supabase, inv.id)
                      .then(refresh)
                      .catch((err: unknown) => {
                        const text = err instanceof Error ? err.message : String(err);
                        setMsg(text);
                      });
                  }}
                >
                  <Text style={{ color: colors.text }}>{fm.revokeInvite}</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      <Text style={styles.section}>{fm.membersList}</Text>
      {membersQuery.isLoading ? (
        <Text style={styles.muted}>{strings.commonMobile.loading}</Text>
      ) : null}
      {membersQuery.isError ? (
        <Text style={{ color: colors.dangerText, marginBottom: 8 }}>
          {membersQuery.error instanceof Error ? membersQuery.error.message : strings.commonMobile.error}
        </Text>
      ) : null}
      {(membersQuery.data ?? []).map((m) => (
        <View key={m.user_id} style={styles.card}>
          <Text style={styles.body}>{m.display_name?.trim() || m.email || m.user_id}</Text>
          <Text style={styles.muted}>
            {roleLabel(fm, m.role)} · {fm.joined}{' '}
            {new Date(m.created_at).toLocaleDateString()}
          </Text>
          {isAdmin && m.user_id !== userId && (
            <View style={{ marginTop: 8, gap: 6 }}>
              {FARM_ROLES.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.btnOutline, r === m.role && styles.roleChipActive]}
                  onPress={() =>
                    void changeFarmMemberRole(supabase, {
                      farmId,
                      userId: m.user_id,
                      role: r,
                    })
                      .then(refresh)
                      .catch((err: unknown) => {
                        const text = err instanceof Error ? err.message : String(err);
                        setMsg(text.includes('last_admin') ? fm.lastAdminError : text);
                      })
                  }
                >
                  <Text style={{ color: colors.text }}>{roleLabel(fm, r)}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {(isAdmin && m.user_id !== userId) || m.user_id === userId ? (
            <Pressable style={styles.btnOutline} onPress={() => onRemove(m)}>
              <Text style={{ color: colors.dangerText }}>
                {m.user_id === userId ? fm.leaveFarm : fm.removeMember}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {msg ? <Text style={styles.muted}>{msg}</Text> : null}
    </ScrollView>
  );
}
