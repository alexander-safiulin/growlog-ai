import {
  mapSocialSignInError,
  parseOAuthRedirectParams,
  type AuthProviderErrorCode,
} from '@growlog/web-lib/auth/provider-sign-in';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { AppState } from 'react-native';

function isAuthCallback(url: string, redirectTo: string): boolean {
  const base = redirectTo.split('?')[0];
  return url.startsWith(base) || url.includes('auth/callback');
}

function openAuthAndWait(authUrl: string, redirectTo: string): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false;
    let leftApp = false;
    let returnTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (url: string | null) => {
      if (done) return;
      done = true;
      if (returnTimer) clearTimeout(returnTimer);
      linkSub.remove();
      appSub.remove();
      resolve(url);
    };

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      if (isAuthCallback(url, redirectTo)) finish(url);
    });

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') leftApp = true;
      if (state === 'active' && leftApp) {
        returnTimer = setTimeout(() => finish(null), 1500);
      }
    });

    Linking.openURL(authUrl).catch(() => finish(null));
  });
}

export async function signInWithGoogleOnDevice(
  supabase: SupabaseClient
): Promise<{ error: AuthProviderErrorCode | null }> {
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error: mapSocialSignInError(error.message) };
  if (!data.url) return { error: 'startFailed' };

  const redirectUrl = await openAuthAndWait(data.url, redirectTo);
  if (!redirectUrl) return { error: 'cancelled' };

  const parsed = parseOAuthRedirectParams(redirectUrl);
  if (parsed.error) return { error: mapSocialSignInError(parsed.error) };

  if (parsed.code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(parsed.code);
    if (exchangeError) return { error: mapSocialSignInError(exchangeError.message) };
    return { error: null };
  }

  if (parsed.accessToken && parsed.refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: parsed.accessToken,
      refresh_token: parsed.refreshToken,
    });
    if (sessionError) return { error: mapSocialSignInError(sessionError.message) };
    return { error: null };
  }

  return { error: 'callbackError' };
}
