import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useFarmContext } from '@/providers/FarmProvider';
import { StyleSheet, Text, View } from 'react-native';

export function ScopeBar() {
  const { farms, farmId, cycle, primaryScope, loading, isLocalWorkspace } = useFarmContext();
  const styles = useThemedStyles(makeStyles);
  const farm = farms.find((f) => f.id === farmId);

  if (loading) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.muted}>Loading context…</Text>
      </View>
    );
  }

  if (!farm || !cycle) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.muted}>{loading ? 'Loading context…' : 'Setting up workspace…'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.text} numberOfLines={1}>
        {farm.name} › {cycle.name}
        {primaryScope ? ` › ${primaryScope.display_name}` : ''}
        {isLocalWorkspace ? ' · on device' : ''}
      </Text>
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingVertical: 4,
    },
    text: {
      fontSize: 13,
      color: c.text,
    },
    muted: {
      fontSize: 13,
      color: c.textMuted,
    },
  });
}
