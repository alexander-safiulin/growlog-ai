import type { GuestMergeFailure } from '@growlog/domain';

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** User-facing merge error; raw technical detail is logged to console only. */
export function formatGuestMergeError(
  failure: GuestMergeFailure,
  t: Translate,
): string {
  console.error('[nutrient guest merge]', failure.kind, failure.guestId, failure.message);

  const code = failure.message.trim().toLowerCase();
  if (code === 'missing_solver_result') {
    return t('nutrient.guest.mergeError.missingSolverResult', { label: failure.label });
  }
  if (code === 'missing_farm_product_mapping') {
    return t('nutrient.guest.mergeError.missingFavoriteMapping', { label: failure.label });
  }
  if (code.includes('network') || code.includes('fetch') || code.includes('timeout')) {
    return t('nutrient.guest.mergeError.network', { label: failure.label });
  }
  if (code.includes('permission') || code.includes('rls') || code.includes('jwt')) {
    return t('nutrient.guest.mergeError.permission', { label: failure.label });
  }
  return t('nutrient.guest.mergeError.generic', { label: failure.label });
}
