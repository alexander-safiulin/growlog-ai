'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import type { PendingFarmInvitation } from '@growlog/domain';
import { useCallback, useState } from 'react';

function inviteRoleKey(role: PendingFarmInvitation['role']): string {
  switch (role) {
    case 'admin':
      return 'farmMembers.roleAdmin';
    case 'manager':
      return 'farmMembers.roleManager';
    case 'grower':
      return 'farmMembers.roleGrower';
    case 'viewer':
      return 'farmMembers.roleViewer';
    default:
      return 'farmMembers.roleGrower';
  }
}

export function FarmPendingInvitationBanner({
  invitation,
  onDismiss,
}: {
  invitation: PendingFarmInvitation;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const { acceptFarmInvitationById } = useFarmContext();
  const [pending, setPending] = useState(false);
  const roleLabel = t(inviteRoleKey(invitation.role));

  const onAccept = useCallback(async () => {
    setPending(true);
    try {
      await acceptFarmInvitationById(invitation.id);
    } finally {
      setPending(false);
    }
  }, [acceptFarmInvitationById, invitation.id]);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-sm"
      role="status"
    >
      <span>
        {t('farmMembers.bannerPending', {
          farm: invitation.farm_name,
          role: roleLabel,
        })}
      </span>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => void onAccept()}>
          {t('farmMembers.bannerAccept')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          {t('farmMembers.bannerLater')}
        </Button>
      </div>
    </div>
  );
}
