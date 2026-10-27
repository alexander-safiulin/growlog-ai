import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { signInWithGoogleOnDevice } from '@/lib/google-sign-in';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import {
  authNoticeIsInfo,
  formatAuthNotice,
  noticeFromAuthMessage,
  type AuthNotice,
} from '@growlog/web-lib/auth/auth-notice';
import Constants from 'expo-constants';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function appVersionLabel(): string {
  const raw = Constants.expoConfig?.version ?? '1.0.0';
  const [major, minor] = raw.split('.');
  if (!major) return '1.0';
  return `${major}.${minor ?? '0'}`;
}

const LOGIN_FOOTER = `OG Lab · ${new Date().getFullYear()} · ${appVersionLabel()}`;

const missingSupabaseEnv =
  !process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export default function LoginScreen() {
  const { strings } = useMobileLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { supabase, userId, authLoading } = useFarmContext();
  const router = useRouter();
  const { reason, next } = useLocalSearchParams<{ reason?: string; next?: string }>();
  const goAfterAuth = useCallback(() => {
    if (next === 'vpd') {
      router.replace('/(tabs)');
      return;
    }
    if (next === 'sensor') {
      router.replace('/capture/sensor');
      return;
    }
    if (reason === 'sync' || reason === 'sensors') {
      router.replace('/(tabs)/more/settings');
      return;
    }
    router.replace('/(tabs)');
  }, [next, reason, router]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const [pending, setPending] = useState(false);
  const [providerPending, setProviderPending] = useState(false);
  const busy = pending || providerPending;
  const gateCopy =
    next === 'vpd' || next === 'sensor' || reason === 'sensors'
      ? strings.cloudGate.sensors
      : reason === 'assistant'
        ? strings.cloudGate.assistant
        : reason === 'sop'
          ? strings.cloudGate.sop
          : reason === 'reports'
            ? strings.cloudGate.reports
            : reason === 'sync'
              ? strings.cloudGate.sync
              : null;
  const modeTitle = mode === 'signin' ? strings.login.signInTitle : strings.login.signUpTitle;
  const noticeText = notice ? formatAuthNotice(strings.login.notices[notice.id], notice) : null;

  const leaveLogin = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  }, [router]);

  useEffect(() => {
    if (!authLoading && userId) goAfterAuth();
  }, [authLoading, userId, goAfterAuth]);

  async function handleGoogle() {
    setNotice(null);
    setProviderPending(true);
    try {
      const failure = await signInWithGoogleOnDevice(supabase);
      if (failure) {
        setNotice(failure);
        return;
      }
      goAfterAuth();
    } catch (err: unknown) {
      setNotice(noticeFromAuthMessage(err instanceof Error ? err.message : '', 'google'));
    } finally {
      setProviderPending(false);
    }
  }

  async function handleSubmit() {
    setNotice(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setNotice({ id: 'missingFields' });
      return;
    }
    setPending(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (err) throw err;
        goAfterAuth();
        return;
      }
      const { data, error: err } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });
      if (err) throw err;
      if (!data.session) {
        setNotice({ id: 'checkInbox' });
        setMode('signin');
        return;
      }
      goAfterAuth();
    } catch (err: unknown) {
      setNotice(noticeFromAuthMessage(err instanceof Error ? err.message : '', mode));
    } finally {
      setPending(false);
    }
  }

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: modeTitle, headerBackVisible: false }} />
      <View style={styles.body}>
        <Pressable onPress={leaveLogin} style={styles.back}>
          <Text style={styles.backText}>{strings.login.back}</Text>
        </Pressable>
        <Text style={styles.brand}>Growlog</Text>
        <Text style={[styles.tagline, !gateCopy && styles.taglineLast]}>{strings.loginTagline}</Text>
        {gateCopy ? <Text style={styles.subtitle}>{gateCopy}</Text> : null}

        <Pressable
          style={[styles.secondaryButton, busy && styles.buttonDisabled]}
          onPress={() => void handleGoogle()}
          disabled={busy}
        >
          <Text style={styles.secondaryButtonText}>
            {providerPending ? strings.login.googlePending : strings.login.google}
          </Text>
        </Pressable>

        <Text style={styles.or}>{strings.login.or}</Text>

        <TextInput
          style={styles.input}
          placeholder={strings.login.email}
          placeholderTextColor={colors.placeholder}
          keyboardAppearance={colors.keyboardAppearance}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder={strings.login.password}
          placeholderTextColor={colors.placeholder}
          keyboardAppearance={colors.keyboardAppearance}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />

        {noticeText ? (
          <Text style={notice && authNoticeIsInfo(notice.id) ? styles.notice : styles.error}>{noticeText}</Text>
        ) : null}

        <Pressable
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={busy}
        >
          <Text style={styles.buttonText}>
            {pending ? strings.login.submitPending : modeTitle}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setNotice(null);
            setMode(mode === 'signin' ? 'signup' : 'signin');
          }}
        >
          <Text style={styles.switchMode}>
            {mode === 'signin' ? strings.login.noAccount : strings.login.hasAccount}
          </Text>
        </Pressable>

        {missingSupabaseEnv ? (
          <Text style={styles.hint}>
            Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env
          </Text>
        ) : null}
      </View>
      <Text style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>{LOGIN_FOOTER}</Text>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.screen },
    container: {
      flex: 1,
      backgroundColor: c.screen,
    },
    body: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    back: { marginBottom: 20 },
    backText: { color: c.textMuted, fontSize: 16 },
    brand: {
      fontSize: 40,
      fontWeight: '700',
      letterSpacing: -0.6,
      color: c.text,
      marginBottom: 8,
    },
    tagline: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '500',
      color: c.text,
      marginBottom: 10,
    },
    taglineLast: { marginBottom: 28 },
    subtitle: { fontSize: 15, lineHeight: 21, color: c.textMuted, marginBottom: 20 },
    footer: {
      textAlign: 'center',
      fontSize: 12,
      letterSpacing: 0.3,
      color: c.textMuted,
    },
    input: {
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
      fontSize: 16,
      color: c.text,
    },
    button: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: c.primaryText, fontSize: 16, fontWeight: '600' },
    secondaryButton: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 8,
    },
    secondaryButtonText: { color: c.text, fontSize: 16, fontWeight: '600' },
    or: { textAlign: 'center', color: c.textMuted, marginVertical: 8 },
    switchMode: {
      marginTop: 16,
      textAlign: 'center',
      color: c.textMuted,
      textDecorationLine: 'underline',
    },
    error: { color: c.dangerText, marginBottom: 8, fontSize: 15, lineHeight: 21 },
    notice: { color: c.text, marginBottom: 8, fontSize: 15, lineHeight: 21 },
    hint: { marginTop: 32, fontSize: 12, color: c.textMuted, textAlign: 'center' },
  });
}
