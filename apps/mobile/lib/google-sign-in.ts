import {
  mapSocialSignInError,
  parseOAuthRedirectParams,
  type AuthProviderErrorCode,
} from '@growlog/web-lib/auth/provider-sign-in';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

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

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') return { error: 'cancelled' };
  if (result.type !== 'success') return { error: 'startFailed' };

  const parsed = parseOAuthRedirectParams(result.url);
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
