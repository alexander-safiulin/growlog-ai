import { mapSocialSignInError, type AuthProviderErrorCode } from '@growlog/web-lib/auth/provider-sign-in';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

function configureGoogleSignIn(): AuthProviderErrorCode | null {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!webClientId || !iosClientId) return 'startFailed';
  GoogleSignin.configure({ webClientId, iosClientId });
  return null;
}

function isCancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String((error as { code: unknown }).code) === statusCodes.SIGN_IN_CANCELLED
  );
}

export async function signInWithGoogleOnDevice(
  supabase: SupabaseClient
): Promise<{ error: AuthProviderErrorCode | null; detail?: string }> {
  const configError = configureGoogleSignIn();
  if (configError) return { error: configError };

  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return { error: 'cancelled' };

    const idToken = response.data.idToken;
    if (!idToken) return { error: 'startFailed' };

    // The iOS SDK writes a nonce into the ID token and does not return it.
    // GoTrue accepts that token only when skip-nonce-check is on and the iOS
    // client id is in GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID. See the Supabase runbook.
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) return { error: mapSocialSignInError(error.message), detail: error.message };
    return { error: null };
  } catch (error: unknown) {
    if (isCancelled(error)) return { error: 'cancelled' };
    const detail = error instanceof Error ? error.message : 'Sign in failed';
    return { error: mapSocialSignInError(detail), detail };
  }
}
