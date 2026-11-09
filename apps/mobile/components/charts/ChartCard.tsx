import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function ChartCard({
  title,
  caption,
  empty,
  footer,
  children,
}: {
  title: string;
  caption?: string;
  empty?: string;
  footer?: string;
  children?: ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      {empty ? (
        <Text style={styles.empty}>{empty}</Text>
      ) : (
        <View style={styles.body}>{children}</View>
      )}
      {footer && !empty ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      marginBottom: 12,
    },
    title: {
      fontSize: 12,
      fontWeight: '700',
      color: c.sectionLabel,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    caption: { fontSize: 12, color: c.textMuted, marginBottom: 8 },
    body: { minHeight: 140 },
    empty: { fontSize: 14, color: c.textMuted, paddingVertical: 24, textAlign: 'center' },
    footer: { fontSize: 12, color: c.textMuted, marginTop: 8 },
  });
}
