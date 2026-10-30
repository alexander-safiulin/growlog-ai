import { useMobileLocale } from '@/context/LocaleContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Reason = 'sync' | 'sensors' | 'assistant' | 'sop' | 'reports' | 'photos' | 'handover';

export function CloudFeatureGate({
  reason,
  children,
}: {
  reason: Reason;
  children: React.ReactNode;
}) {
  const { isLocalWorkspace, userId } = useFarmContext();
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const copy = strings.cloudGate;

  if (!isLocalWorkspace && userId) {
    return <>{children}</>;
  }

  const message =
    reason === 'sensors'
      ? copy.sensors
      : reason === 'assistant'
        ? copy.assistant
        : reason === 'sop'
          ? copy.sop
          :     reason === 'reports'
            ? copy.reports
            : reason === 'photos'
              ? copy.photos
              : reason === 'handover'
                ? copy.handover
                : copy.sync;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.offlineNote}>{copy.offlineNote}</Text>
      <Text style={styles.body}>{message}</Text>
      <Pressable
        style={styles.btn}
        onPress={() => router.push(`/(auth)/login?reason=${reason}`)}
      >
        <Text style={styles.btnText}>{copy.signIn}</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      padding: 24,
      justifyContent: 'center',
      gap: 12,
      backgroundColor: c.screen,
    },
    title: { fontSize: 20, fontWeight: '700', color: c.text },
    offlineNote: { fontSize: 14, color: c.text, lineHeight: 20 },
    body: { fontSize: 15, color: c.textMuted, lineHeight: 22 },
    btn: {
      marginTop: 8,
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    btnText: { color: c.primaryText, fontWeight: '600', fontSize: 16 },
  });
}
