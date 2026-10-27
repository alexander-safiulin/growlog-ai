'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  changeFarmMemberRole,
  createFarmInvitation,
  FARM_ROLES,
  fetchMyFarmMemberships,
  isValidFarmInviteEmail,
  listFarmInvitations,
  normalizeFarmInviteEmail,
  listFarmMembers,
  removeFarmMember,
  revokeFarmInvitation,
  type FarmInvitationRow,
  type FarmMemberRow,
  type FarmRole,
} from '@growlog/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

function roleLabel(t: (k: string) => string, role: FarmRole): string {
  switch (role) {
    case 'admin':
      return t('farmMembers.roleAdmin');
    case 'manager':
      return t('farmMembers.roleManager');
    case 'grower':
      return t('farmMembers.roleGrower');
    case 'viewer':
      return t('farmMembers.roleViewer');
    default:
      return role;
  }
}

export function FarmMembersCard() {
  const { t } = useTranslation();
  const { supabase, farmId, userId, refetchAll } = useFarmContext();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<FarmRole>('grower');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  const myRole = useMemo(() => {
    return (
      membershipQuery.data?.find((m) => m.farm_id === farmId)?.role ??
      membersQuery.data?.find((m) => m.user_id === userId)?.role ??
      null
    );
  }, [membershipQuery.data, membersQuery.data, farmId, userId]);

  const isAdmin = myRole === 'admin';
  const canSeeInvites = myRole === 'admin' || myRole === 'manager';

  const invitesQuery = useQuery({
    queryKey: ['farm-invitations', farmId],
    enabled: !!farmId && canSeeInvites,
    queryFn: () => listFarmInvitations(supabase, farmId!),
  });

  async function refreshMembers() {
    await queryClient.invalidateQueries({ queryKey: ['farm-members', farmId] });
    await queryClient.invalidateQueries({ queryKey: ['farm-invitations', farmId] });
    await refetchAll();
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!farmId || !isAdmin) return;
    setPending(true);
    setMsg(null);
    const normalized = normalizeFarmInviteEmail(email);
    setEmail(normalized);
    if (!isValidFarmInviteEmail(normalized)) {
      setMsg(t('farmMembers.invalidEmail'));
      setPending(false);
      return;
    }
    try {
      await createFarmInvitation(supabase, { farmId, email: normalized, role });
      setEmail('');
      setMsg(t('farmMembers.inviteSent'));
      await refreshMembers();
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      if (text.includes('already_member')) setMsg(t('farmMembers.alreadyMember'));
      else if (text.includes('invalid_email') || text.includes('Invalid email')) {
        setMsg(t('farmMembers.invalidEmail'));
      } else setMsg(text);
    } finally {
      setPending(false);
    }
  }

  async function onRoleChange(member: FarmMemberRow, nextRole: FarmRole) {
    if (!farmId || !isAdmin) return;
    try {
      await changeFarmMemberRole(supabase, { farmId, userId: member.user_id, role: nextRole });
      await refreshMembers();
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      if (text.includes('last_admin')) setMsg(t('farmMembers.lastAdminError'));
      else setMsg(text);
    }
  }

  async function onRemove(member: FarmMemberRow) {
    if (!farmId) return;
    const self = member.user_id === userId;
    const ok = window.confirm(self ? t('farmMembers.confirmLeave') : t('farmMembers.confirmRemove'));
    if (!ok) return;
    try {
      await removeFarmMember(supabase, { farmId, userId: member.user_id });
      await refreshMembers();
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      if (text.includes('last_admin')) setMsg(t('farmMembers.lastAdminError'));
      else setMsg(text);
    }
  }

  async function onRevoke(inv: FarmInvitationRow) {
    if (!isAdmin) return;
    try {
      await revokeFarmInvitation(supabase, inv.id);
      await refreshMembers();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  if (!farmId) return null;

  const pendingInvites =
    invitesQuery.data?.filter((i) => i.status === 'pending') ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('farmMembers.title')}</CardTitle>
        <CardDescription>{t('farmMembers.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <form onSubmit={onInvite} className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">{t('farmMembers.inviteByEmail')}</p>
            <Input
              type="text"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t('farmMembers.inviteeEmail')}
              value={email}
              onChange={(e) => setEmail(normalizeFarmInviteEmail(e.target.value))}
            />
            {email.length > 0 && !isValidFarmInviteEmail(email) ? (
              <p className="text-sm text-destructive">{t('farmMembers.invalidEmail')}</p>
            ) : null}
            <label className="text-sm font-medium">{t('farmMembers.role')}</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as FarmRole)}
            >
              {FARM_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(t, r)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{t('farmMembers.inviteSignInHint')}</p>
            <Button type="submit" size="sm" disabled={pending || !isValidFarmInviteEmail(email)}>
              {t('farmMembers.inviteSubmit')}
            </Button>
          </form>
        )}

        {canSeeInvites && pendingInvites.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('farmMembers.pendingStatus')}</p>
            <ul className="space-y-2 text-sm">
              {pendingInvites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                >
                  <span>
                    {inv.email_normalized} · {roleLabel(t, inv.role)}
                  </span>
                  {isAdmin && (
                    <Button type="button" size="sm" variant="outline" onClick={() => onRevoke(inv)}>
                      {t('farmMembers.revokeInvite')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">{t('farmMembers.membersList')}</p>
          {membersQuery.isError ? (
            <p className="text-sm text-destructive">
              {membersQuery.error instanceof Error ? membersQuery.error.message : t('common.error')}
            </p>
          ) : null}
          <ul className="space-y-2 text-sm">
            {(membersQuery.data ?? []).map((m) => (
              <li
                key={m.user_id}
                className="flex flex-col gap-2 rounded-md border px-2 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{m.display_name?.trim() || m.email || m.user_id}</p>
                  {m.email && m.display_name?.trim() && (
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t('farmMembers.joined')}: {new Date(m.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isAdmin && m.user_id !== userId ? (
                    <select
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={m.role}
                      onChange={(e) => onRoleChange(m, e.target.value as FarmRole)}
                    >
                      {FARM_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(t, r)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-muted-foreground">{roleLabel(t, m.role)}</span>
                  )}
                  {(isAdmin && m.user_id !== userId) || m.user_id === userId ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => onRemove(m)}>
                      {m.user_id === userId ? t('farmMembers.leaveFarm') : t('farmMembers.removeMember')}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </CardContent>
    </Card>
  );
}
