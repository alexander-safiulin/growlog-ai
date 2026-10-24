import { signInWithGoogleOnDevice } from '@/lib/google-sign-in';
import { useFarmContext } from '@/providers/FarmProvider';
import type { AuthProviderErrorCode } from '@growlog/web-lib/auth/provider-sign-in';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const PROVIDER_ERROR: Record<AuthProviderErrorCode, string> = {
  providerDisabled: 'This sign-in method is not available yet. Use email, or try again later.',
  startFailed: 'Could not start sign-in. Please try again.',
  noEthereumWallet: 'No Ethereum wallet found. Install MetaMask or another browser wallet.',
  noSolanaWallet: 'No Solana wallet found. Install Phantom or another browser wallet.',
  noBrowserWallet: 'No browser wallet found. Install MetaMask (Ethereum) or Phantom (Solana).',
  cancelled: 'Sign-in was cancelled.',
  noAccount: 'Connect an account in your wallet, then try again.',
  walletLocked: 'Could not connect to your wallet. Unlock the wallet and try again.',
  badSignature: 'Wallet signature was not accepted. Try again or use email.',
  badDomain: 'This site URL is not allowed for wallet sign-in.',
  serverDisabled:
    'Wallet sign-in failed. If this keeps happening, wallet login may be turned off on the server. Use email or Google.',
  generic: 'Could not start wallet sign-in. Please try again.',
  callbackError: 'Sign-in could not be completed. Please try again.',
  nativeWallet:
    'On the phone, Ethereum and Solana sign-in needs a browser wallet. Open the web app, or continue with Google.',
};

const missingSupabaseEnv =
  !process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export default function LoginScreen() {
  const { supabase, userId, authLoading } = useFarmContext();
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [providerPending, setProviderPending] = useState(false);
  const busy = pending || providerPending;

  useEffect(() => {
    if (!authLoading && userId) {
      if (reason === 'sync' || reason === 'sensors') {
        router.replace('/(tabs)/more/settings');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [authLoading, userId, reason, router]);

  async function handleGoogle() {
    setError(null);
    setProviderPending(true);
    try {
      const { error: code, detail } = await signInWithGoogleOnDevice(supabase);
      if (code) {
        setError(detail ? `${PROVIDER_ERROR[code]} ${detail}` : PROVIDER_ERROR[code]);
        return;
      }
      if (reason === 'sync' || reason === 'sensors') router.replace('/(tabs)/more/settings');
      else router.replace('/(tabs)');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setProviderPending(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    setPending(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
      }
      if (reason === 'sync' || reason === 'sensors') router.replace('/(tabs)/more/settings');
      else router.replace('/(tabs)');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setPending(false);
    }
  }

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2d6a4f" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.brand}>Growlog • OG Lab</Text>
      <Text style={styles.subtitle}>
        {mode === 'signin' ? 'Sign in to sync or connect sensors' : 'Create an account'}
      </Text>

      <Pressable
        style={[styles.secondaryButton, busy && styles.buttonDisabled]}
        onPress={() => void handleGoogle()}
        disabled={busy}
      >
        <Text style={styles.secondaryButtonText}>
          {providerPending ? 'Please wait…' : 'Continue with Google'}
        </Text>
      </Pressable>

      <Text style={styles.or}>or</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={busy}
      >
        <Text style={styles.buttonText}>
          {pending ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </Text>
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        <Text style={styles.switchMode}>
          {mode === 'signin' ? 'No account? Sign up' : 'Have an account? Sign in'}
        </Text>
      </Pressable>

      {missingSupabaseEnv ? (
        <Text style={styles.hint}>
          Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env
        </Text>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f4faf5',
  },
  back: { marginBottom: 12 },
  backText: { color: '#52796f', fontSize: 16 },
  brand: { fontSize: 28, fontWeight: '700', color: '#1b4332', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#52796f', marginBottom: 24 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#b7d4bc',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2d6a4f',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#b7d4bc',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryButtonText: { color: '#1b4332', fontSize: 16, fontWeight: '600' },
  or: { textAlign: 'center', color: '#52796f', marginVertical: 8 },
  switchMode: {
    marginTop: 16,
    textAlign: 'center',
    color: '#52796f',
    textDecorationLine: 'underline',
  },
  error: { color: '#b91c1c', marginBottom: 8 },
  hint: { marginTop: 32, fontSize: 12, color: '#9ca3af', textAlign: 'center' },
});
