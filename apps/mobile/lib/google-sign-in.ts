import { noticeFromAuthMessage, type AuthNotice } from '@growlog/web-lib/auth/auth-notice';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

function configureGoogleSignIn(): AuthNotice | null {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!webClientId || !iosClientId) return { id: 'googleUnavailable' };
  GoogleSignin.configure({ webClientId, iosClientId });
  return null;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const code = (error as { code: unknown }).code;
  if (code == null) return undefined;
  return String(code);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

function noticeFromGoogleException(error: unknown): AuthNotice {
  const code = errorCode(error);
  if (code === String(statusCodes.SIGN_IN_CANCELLED)) return { id: 'googleCancelled' };
  if (code === String(statusCodes.IN_PROGRESS)) return { id: 'googleBusy' };
  if (code === String(statusCodes.PLAY_SERVICES_NOT_AVAILABLE)) return { id: 'playServices' };
  return noticeFromAuthMessage(errorMessage(error), 'google');
}

export async function signInWithGoogleOnDevice(supabase: SupabaseClient): Promise<AuthNotice | null> {
  const configError = configureGoogleSignIn();
  if (configError) return configError;

  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return { id: 'googleCancelled' };

    const idToken = response.data.idToken;
    if (!idToken) return { id: 'googleRejected' };

    // The iOS SDK writes a nonce into the ID token and does not return it.
    // GoTrue accepts that token only when skip-nonce-check is on and the iOS
    // client id is in GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID. See the Supabase runbook.
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) return noticeFromAuthMessage(error.message, 'google');
    return null;
  } catch (error: unknown) {
    return noticeFromGoogleException(error);
  }
}
