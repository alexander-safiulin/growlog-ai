import { useMobileLocale } from '@/context/LocaleContext';
import { useFarmContext } from '@/providers/FarmProvider';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Reason = 'sync' | 'sensors' | 'assistant' | 'sop' | 'reports';

export function CloudFeatureGate({
  reason,
  children,
}: {
  reason: Reason;
  children: React.ReactNode;
}) {
  const { isLocalWorkspace, userId } = useFarmContext();
  const { strings } = useMobileLocale();
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
          : reason === 'reports'
            ? copy.reports
            : copy.sync;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{copy.title}</Text>
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

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f4faf5',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1b4332' },
  body: { fontSize: 15, color: '#52796f', lineHeight: 22 },
  btn: {
    marginTop: 8,
    backgroundColor: '#2d6a4f',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
