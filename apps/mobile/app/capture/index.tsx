import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const INTENTS = [
  { href: '/capture/voice' as const, label: 'Voice log', icon: '🎤' },
  { href: '/capture/text' as const, label: 'Text log', icon: '✏️' },
  { href: '/capture/photo' as const, label: 'Photo', icon: '📷' },
  { href: '/capture/sensor' as const, label: 'Sensor', icon: '📊' },
];

export default function CaptureIndexScreen() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      {INTENTS.map((item) => (
        <Pressable key={item.href} style={styles.row} onPress={() => router.push(item.href)}>
          <Text style={styles.icon}>{item.icon}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </Pressable>
      ))}
      <Pressable style={styles.cancel} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, padding: 24, gap: 12, backgroundColor: c.screen },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      padding: 18,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    icon: { fontSize: 22 },
    label: { fontSize: 17, fontWeight: '600', color: c.text },
    cancel: { marginTop: 16, alignItems: 'center', padding: 12 },
    cancelText: { color: c.textMuted, fontSize: 16 },
  });
}
