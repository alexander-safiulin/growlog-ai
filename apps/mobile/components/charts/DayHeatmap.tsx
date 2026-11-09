import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/lib/use-themed-styles';
import type { ActivityDayCell } from '@growlog/domain';
import { StyleSheet, Text, View } from 'react-native';

const CELL = 14;
const GAP = 2;
const COLS = 14;

export function DayHeatmap({ cells }: { cells: ActivityDayCell[] }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const max = Math.max(1, ...cells.map((c) => c.count));

  return (
    <View style={styles.wrap}>
      {cells.map((cell, i) => {
        const intensity = cell.count / max;
        const bg =
          cell.count === 0
            ? colors.surfaceMuted
            : `rgba(45, 106, 79, ${0.2 + intensity * 0.75})`;
        return (
          <View
            key={cell.date}
            style={[
              styles.cell,
              {
                backgroundColor: bg,
                marginRight: (i + 1) % COLS === 0 ? 0 : GAP,
                marginBottom: GAP,
              },
            ]}
            accessibilityLabel={`D${cell.cycleDay} ${cell.count}`}
          >
            {cell.count > 0 ? (
              <Text style={styles.cellText}>{cell.count > 9 ? '9+' : cell.count}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: COLS * (CELL + GAP),
    },
    cell: {
      width: CELL,
      height: CELL,
      borderRadius: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellText: { fontSize: 7, fontWeight: '700', color: c.primaryText },
  });
}
