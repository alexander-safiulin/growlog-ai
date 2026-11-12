import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { useOfflineSync } from '@/providers/OfflineSyncProvider';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function LeafSyncNoticeBanner() {
  const { strings } = useMobileLocale();
  const copy = strings.advisorScreen.leafSyncNotice;
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { pendingLeafSync, openPendingLeafSync, dismissPendingLeafSync } = useOfflineSync();

  if (!pendingLeafSync) return null;

  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <View style={styles.card}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.primary}
            onPress={() => void openPendingLeafSync()}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>{copy.openJournal}</Text>
          </Pressable>
          <Pressable onPress={dismissPendingLeafSync} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.dismiss}>{copy.dismiss}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 12,
      right: 12,
      zIndex: 50,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 14,
      gap: 8,
      shadowColor: '#102018',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    title: { fontSize: 15, fontWeight: '700', color: c.text },
    subtitle: { fontSize: 13, color: c.textMuted, lineHeight: 18 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
    primary: {
      backgroundColor: c.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    primaryText: { color: c.primaryText, fontWeight: '600', fontSize: 14 },
    dismiss: { fontSize: 14, color: c.textMuted, fontWeight: '600' },
  });
}
