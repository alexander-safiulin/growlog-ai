const PREFIX = 'growlog_farm_invite_banner_dismiss_';

export function dismissFarmInvitationBanner(farmId: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${PREFIX}${farmId}`, '1');
  } catch {
    /* ignore */
  }
}

export function isFarmInvitationBannerDismissed(farmId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(`${PREFIX}${farmId}`) === '1';
  } catch {
    return false;
  }
}
