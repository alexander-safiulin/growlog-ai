import { describe, expect, it } from 'vitest';
import {
  buildAuthCallbackUrl,
  mapSocialAuthorizeProbeError,
  mapSocialSignInError,
  mapWeb3SignInError,
  parseOAuthRedirectParams,
  resolveAuthNextPath,
  sanitizeAuthNextPath,
} from '@/lib/auth/provider-sign-in';

describe('provider sign-in', () => {
  it('sends signup to onboarding and sign-in to the dashboard', () => {
    expect(resolveAuthNextPath('signup')).toBe('/onboarding');
    expect(resolveAuthNextPath('signin')).toBe('/dashboard');
  });

  it('builds the callback url with an encoded next path', () => {
    expect(buildAuthCallbackUrl('https://growlog.ai/', '/onboarding')).toBe(
      'https://growlog.ai/auth/callback?next=%2Fonboarding'
    );
  });

  it('drops external next paths', () => {
    expect(sanitizeAuthNextPath('https://evil.example')).toBe('/dashboard');
    expect(sanitizeAuthNextPath('//evil.example')).toBe('/dashboard');
    expect(sanitizeAuthNextPath('/\\evil')).toBe('/dashboard');
    expect(sanitizeAuthNextPath('/onboarding')).toBe('/onboarding');
  });

  it('maps disabled providers and wallet failures', () => {
    expect(mapSocialSignInError('Unsupported provider: provider is not enabled')).toBe('providerDisabled');
    expect(mapSocialAuthorizeProbeError(400, 'provider is not enabled')).toBe('providerDisabled');
    expect(mapSocialAuthorizeProbeError(302, '')).toBeNull();
    expect(mapWeb3SignInError('Web3 provider is disabled')).toBe('providerDisabled');
    expect(mapWeb3SignInError('No compatible Ethereum wallet interface on the window object')).toBe(
      'noBrowserWallet'
    );
    expect(mapWeb3SignInError('User rejected the request')).toBe('cancelled');
    expect(mapWeb3SignInError('Unexpected error')).toBe('serverDisabled');
  });

  it('reads the OAuth code from the redirect query or hash', () => {
    expect(parseOAuthRedirectParams('growlog://auth/callback?code=abc')).toEqual({
      code: 'abc',
      accessToken: null,
      refreshToken: null,
      error: null,
    });
    expect(parseOAuthRedirectParams('growlog://auth/callback#error=access_denied')).toMatchObject({
      code: null,
      error: 'access_denied',
    });
  });
});
