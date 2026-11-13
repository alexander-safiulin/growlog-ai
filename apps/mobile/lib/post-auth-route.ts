export type PostAuthHref =
  | '/(onboarding)'
  | '/(tabs)'
  | '/(tabs)/assistant'
  | '/(tabs)/more/settings'
  | '/capture/sensor';

export function hrefAfterAuth(input: {
  cloudFarmCount: number | null;
  listFailed?: boolean;
  reason?: string;
  next?: string;
}): PostAuthHref | null {
  if (input.cloudFarmCount === null && !input.listFailed) return null;
  if (input.next === 'vpd') return '/(tabs)';
  if (input.next === 'sensor') return '/capture/sensor';
  if (input.cloudFarmCount === 0 && !input.listFailed) return '/(onboarding)';
  if (input.reason === 'sync' || input.reason === 'sensors') return '/(tabs)/more/settings';
  if (input.reason === 'assistant') return '/(tabs)/assistant';
  return '/(tabs)';
}
