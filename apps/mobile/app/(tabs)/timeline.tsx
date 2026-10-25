import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { FlatList, StyleSheet, Text, View } from 'react-native';

export default function TimelineScreen() {
  const { recentEvents, loading } = useFarmContext();
  const styles = useThemedStyles(makeStyles);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading timeline…</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={recentEvents}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <Text style={styles.muted}>No events yet. Tap the mic to add your first entry.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.type}>{item.event_type}</Text>
          <Text style={styles.body}>{item.body ?? '—'}</Text>
          <Text style={styles.time}>{new Date(item.occurred_at).toLocaleString()}</Text>
        </View>
      )}
    />
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.screen },
    screen: { flex: 1, backgroundColor: c.screen },
    list: { padding: 16, paddingBottom: 24, gap: 10 },
    row: {
      backgroundColor: c.card,
      borderRadius: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 10,
    },
    type: { fontSize: 12, fontWeight: '700', color: c.primary, textTransform: 'uppercase' },
    body: { fontSize: 15, color: c.text, marginTop: 4 },
    time: { fontSize: 12, color: c.textMuted, marginTop: 6 },
    muted: { color: c.textMuted, textAlign: 'center', padding: 24 },
  });
}
