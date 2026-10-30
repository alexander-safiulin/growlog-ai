import { noticeFromUnknown, type AuthNotice } from '@growlog/web-lib/auth/auth-notice';
import type { SupabaseClient } from '@supabase/supabase-js';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let googleModulePromise: Promise<GoogleSignInModule | null> | undefined;

/** Native Google Sign-In is not available in Expo Go (dev client or store build only). */
export function isGoogleSignInNativeAvailable(): boolean {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  if (Constants.appOwnership === 'expo') return false;
  return true;
}

async function loadGoogleSignInModule(): Promise<GoogleSignInModule | null> {
  if (!isGoogleSignInNativeAvailable()) return null;
  if (!googleModulePromise) {
    googleModulePromise = import('@react-native-google-signin/google-signin').catch(() => null);
  }
  return googleModulePromise;
}

async function configureGoogleSignIn(mod: GoogleSignInModule): Promise<AuthNotice | null> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!webClientId || !iosClientId) return { id: 'googleUnavailable' };
  mod.GoogleSignin.configure({ webClientId, iosClientId });
  return null;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const code = (error as { code: unknown }).code;
  if (code == null) return undefined;
  return String(code);
}

function noticeFromGoogleException(error: unknown, statusCodes: GoogleSignInModule['statusCodes']): AuthNotice {
  const code = errorCode(error);
  if (code === String(statusCodes.SIGN_IN_CANCELLED)) return { id: 'googleCancelled' };
  if (code === String(statusCodes.IN_PROGRESS)) return { id: 'googleBusy' };
  if (code === String(statusCodes.PLAY_SERVICES_NOT_AVAILABLE)) return { id: 'playServices' };
  if (code === '10') return { id: 'googleUnavailable' };
  return noticeFromUnknown(error, 'google');
}

export async function signInWithGoogleOnDevice(supabase: SupabaseClient): Promise<AuthNotice | null> {
  const mod = await loadGoogleSignInModule();
  if (!mod) return { id: 'googleUnavailable' };

  const configError = await configureGoogleSignIn(mod);
  if (configError) return configError;

  const { GoogleSignin, statusCodes } = mod;

  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return { id: 'googleCancelled' };

    const idToken = response.data.idToken;
    if (!idToken) return { id: 'googleUnavailable' };

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) return noticeFromUnknown(error, 'google');
    return null;
  } catch (error: unknown) {
    return noticeFromGoogleException(error, statusCodes);
  }
}
