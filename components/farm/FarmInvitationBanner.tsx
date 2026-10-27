'use client';

import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import { Button } from '@/components/ui/button';
import { removeFarmMember, type AcceptedFarmInvitation } from '@growlog/domain';
import { useCallback, useState } from 'react';

export function FarmInvitationBanner({
  invitation,
  onDismiss,
}: {
  invitation: AcceptedFarmInvitation;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const { supabase, userId, setFarmId, refetchAll } = useFarmContext();
  const [leaving, setLeaving] = useState(false);

  const onOpen = useCallback(() => {
    setFarmId(invitation.farm_id);
    onDismiss();
  }, [invitation.farm_id, onDismiss, setFarmId]);

  const onLeave = useCallback(async () => {
    if (!userId) return;
    setLeaving(true);
    try {
      await removeFarmMember(supabase, { farmId: invitation.farm_id, userId });
      await refetchAll();
      onDismiss();
    } catch {
      /* surface via alert minimal */
    } finally {
      setLeaving(false);
    }
  }, [supabase, userId, invitation.farm_id, refetchAll, onDismiss]);

  return (
    <div
      className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm"
      role="status"
    >
      <span>{t('farmMembers.bannerAdded', { farm: invitation.farm_name })}</span>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onOpen}>
          {t('farmMembers.bannerOpen')}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={leaving} onClick={onLeave}>
          {t('farmMembers.bannerLeave')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          {t('farmMembers.bannerDismiss')}
        </Button>
      </div>
    </div>
  );
}
