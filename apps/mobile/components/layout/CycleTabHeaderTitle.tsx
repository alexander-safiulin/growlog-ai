import type { MobileThemeColors } from '@/lib/mobile-theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  meta?: string;
  colors: MobileThemeColors;
  onPress?: () => void;
};

export function CycleTabHeaderTitle({ title, meta, colors, onPress }: Props) {
  const content = (
    <View style={styles.row}>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
      {meta ? (
        <Text
          style={[styles.meta, { color: colors.textMuted }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {meta}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.pressable}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: '600',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    textAlign: 'right',
  },
});
