const SESSION_DISMISS_PREFIX = 'growlog_nutrient_merge_dismiss_';

export function dismissGuestMergeForSession(farmId: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${SESSION_DISMISS_PREFIX}${farmId}`, '1');
  } catch {
    /* ignore */
  }
}

export function isGuestMergeDismissedForSession(farmId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(`${SESSION_DISMISS_PREFIX}${farmId}`) === '1';
  } catch {
    return false;
  }
}

export function clearGuestMergeSessionDismissals(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(SESSION_DISMISS_PREFIX)) keys.push(key);
    }
    for (const key of keys) sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
