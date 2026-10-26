import { useTheme } from '@/context/ThemeContext';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useFarmContext } from '@/providers/FarmProvider';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

export default function MoreHubScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => moreHubStyles(colors), [colors]);
  const { strings } = useMobileLocale();
  const { supabase, userId, authLoading } = useFarmContext();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setEmail(null);
      return;
    }
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setEmail(data.user?.email ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  function confirmSignOut() {
    Alert.alert(strings.more.signOutTitle, strings.more.signOutBody, [
      { text: strings.more.cancel, style: 'cancel' },
      {
        text: strings.more.signOut,
        style: 'destructive',
        onPress: () => {
          void supabase.auth.signOut().then(({ error }) => {
            if (error) Alert.alert(error.message);
          });
        },
      },
    ]);
  }

  const links = [
    { href: '/(tabs)/sop' as const, label: strings.tabs.sop },
    { href: '/(tabs)/more/photos' as const, label: strings.more.photos },
    { href: '/(tabs)/more/sensors' as const, label: strings.more.sensors },
    { href: '/(tabs)/more/reports' as const, label: strings.more.reports },
    { href: '/(tabs)/more/handover' as const, label: strings.more.handover },
    { href: '/(tabs)/more/settings' as const, label: strings.more.settings },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {links.map((link) => (
        <Pressable key={link.href} style={styles.row} onPress={() => router.push(link.href)}>
          <Text style={styles.label}>{link.label}</Text>
        </Pressable>
      ))}
      {authLoading ? null : userId ? (
        <Pressable style={[styles.row, styles.session]} onPress={confirmSignOut}>
          <Text style={styles.signOut}>{strings.more.signOut}</Text>
          {email ? <Text style={styles.desc}>{email}</Text> : null}
        </Pressable>
      ) : (
        <Pressable
          style={[styles.row, styles.session]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.label}>{strings.more.signIn}</Text>
          <Text style={styles.desc}>{strings.more.signInHint}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function moreHubStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    container: { padding: 16, paddingBottom: 120, gap: 10 },
    row: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    session: { marginTop: 18 },
    label: { fontSize: 17, fontWeight: '600', color: c.text },
    signOut: { fontSize: 17, fontWeight: '600', color: c.dangerText },
    desc: { fontSize: 13, color: c.sectionLabel, marginTop: 4 },
  });
}
