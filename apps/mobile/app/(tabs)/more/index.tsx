import { useTheme } from '@/context/ThemeContext';
import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useFarmContext } from '@/providers/FarmProvider';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useMemo } from 'react';
import { SymbolView } from 'expo-symbols';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const MORE_HUB_ICON_SIZE = 16;
const MORE_HUB_ICON_SLOT = 28;

type MoreHubIconName = { ios: string; android: string; web: string };

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
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setEmail(data.session?.user.email ?? null);
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

  const links: Array<{
    href:
      | '/(tabs)/sop'
      | '/(tabs)/more/photos'
      | '/(tabs)/more/sensors'
      | '/(tabs)/more/reports'
      | '/(tabs)/more/grow-report'
      | '/(tabs)/more/handover'
      | '/(tabs)/more/settings';
    label: string;
    icon: MoreHubIconName;
  }> = [
    {
      href: '/(tabs)/sop',
      label: strings.tabs.sop,
      icon: { ios: 'checklist', android: 'checklist', web: 'checklist' },
    },
    {
      href: '/(tabs)/more/photos',
      label: strings.more.photos,
      icon: { ios: 'photo', android: 'photo', web: 'photo' },
    },
    {
      href: '/(tabs)/more/sensors',
      label: strings.more.sensors,
      icon: { ios: 'sensor.tag.radiowaves.forward', android: 'sensors', web: 'sensors' },
    },
    {
      href: '/(tabs)/more/reports',
      label: strings.more.reports,
      icon: { ios: 'chart.bar.doc.horizontal', android: 'bar_chart', web: 'bar_chart' },
    },
    {
      href: '/(tabs)/more/grow-report',
      label: strings.more.growReport,
      icon: { ios: 'leaf', android: 'eco', web: 'eco' },
    },
    {
      href: '/(tabs)/more/handover',
      label: strings.more.handover,
      icon: { ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' },
    },
    {
      href: '/(tabs)/more/settings',
      label: strings.more.settings,
      icon: { ios: 'gearshape', android: 'settings', web: 'settings' },
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.groupCard}>
        {links.map((link, index) => (
          <View key={link.href}>
            <Pressable
              style={({ pressed }) => [styles.groupRow, pressed && styles.groupRowPressed]}
              onPress={() => router.push(link.href)}
            >
              <View style={styles.iconSlot}>
                <SymbolView
                  name={link.icon}
                  tintColor={colors.placeholder}
                  size={MORE_HUB_ICON_SIZE}
                />
              </View>
              <Text style={styles.label}>{link.label}</Text>
            </Pressable>
            {index < links.length - 1 ? <View style={styles.insetDivider} /> : null}
          </View>
        ))}
      </View>
      {authLoading ? null : userId ? (
        <Pressable style={styles.card} onPress={confirmSignOut}>
          <Text style={styles.signOut}>{strings.more.signOut}</Text>
          {email ? <Text style={styles.desc}>{email}</Text> : null}
        </Pressable>
      ) : (
        <Pressable style={styles.card} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.label}>{strings.more.signIn}</Text>
          <Text style={styles.desc}>{strings.more.signInHint}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function moreHubStyles(c: MobileThemeColors) {
  const softCardShadow = Platform.select({
    ios: {
      shadowColor: '#1b4332',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
    },
    android: { elevation: 1 },
    default: {},
  });

  return StyleSheet.create({
    container: { padding: 16, paddingBottom: 120, gap: 20 },
    groupCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      overflow: 'hidden',
      ...softCardShadow,
    },
    groupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
      minHeight: 50,
    },
    insetDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: 16 + MORE_HUB_ICON_SLOT + 12,
      marginRight: 16,
    },
    groupRowPressed: { backgroundColor: c.surfaceMuted },
    iconSlot: {
      width: MORE_HUB_ICON_SLOT,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 16,
      ...softCardShadow,
    },
    label: { flex: 1, fontSize: 16, fontWeight: '500', color: c.text, letterSpacing: -0.2 },
    signOut: { fontSize: 16, fontWeight: '500', color: c.dangerText },
    desc: { fontSize: 13, color: c.textMuted, marginTop: 4 },
  });
}
