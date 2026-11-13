import { hrefAfterAuth } from '@/lib/post-auth-route';

describe('hrefAfterAuth', () => {
  it('sends a signed-in guest with no cloud farm to onboarding', () => {
    expect(hrefAfterAuth({ cloudFarmCount: 0, reason: 'assistant' })).toBe('/(onboarding)');
  });

  it('returns to the advisor after Google sign-in when a cloud farm exists', () => {
    expect(hrefAfterAuth({ cloudFarmCount: 1, reason: 'assistant' })).toBe('/(tabs)/assistant');
  });

  it('keeps sensor and sync destinations when a cloud farm exists', () => {
    expect(hrefAfterAuth({ cloudFarmCount: 2, next: 'sensor' })).toBe('/capture/sensor');
    expect(hrefAfterAuth({ cloudFarmCount: 2, reason: 'sync' })).toBe('/(tabs)/more/settings');
  });

  it('waits while the cloud farm list is still loading', () => {
    expect(hrefAfterAuth({ cloudFarmCount: null, reason: 'assistant' })).toBeNull();
  });

  it('does not open onboarding when the farm list failed to load', () => {
    expect(hrefAfterAuth({ cloudFarmCount: null, listFailed: true, reason: 'assistant' })).toBe(
      '/(tabs)/assistant',
    );
  });
});
