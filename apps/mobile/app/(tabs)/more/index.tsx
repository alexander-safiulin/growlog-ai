import { useMobileLocale } from '@/context/LocaleContext';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

export default function MoreHubScreen() {
  const { strings } = useMobileLocale();
  const links = [
    { href: '/(tabs)/more/photos' as const, label: strings.more.photos },
    { href: '/(tabs)/more/sensors' as const, label: strings.more.sensors },
    { href: '/(tabs)/more/nutrient' as const, label: strings.more.nutrient },
    { href: '/(tabs)/more/reports' as const, label: strings.more.reports },
    { href: '/(tabs)/more/handover' as const, label: strings.more.handover },
    { href: '/(tabs)/more/calendar' as const, label: strings.more.calendar },
    { href: '/(tabs)/more/settings' as const, label: strings.more.settings },
  ];
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {links.map((link) => (
        <Pressable key={link.href} style={styles.row} onPress={() => router.push(link.href)}>
          <Text style={styles.label}>{link.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 120, gap: 10 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d8ead9',
  },
  label: { fontSize: 17, fontWeight: '600', color: '#1b4332' },
  desc: { fontSize: 13, color: '#52796f', marginTop: 4 },
});
