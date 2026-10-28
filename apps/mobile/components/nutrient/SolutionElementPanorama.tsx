import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { formatNutrientPpm } from '@growlog/web-lib/nutrient/format-nutrient-amount';
import {
  formatSolutionElementDelta,
  type SolutionElementTile,
  type SolutionElementTone,
} from '@growlog/web-lib/nutrient/solution-element-panorama';
import { StyleSheet, Text, View } from 'react-native';

function tileColors(tone: SolutionElementTone, c: MobileThemeColors) {
  if (tone === 'ok') return { backgroundColor: c.chipBg, borderColor: c.chipBorder, color: c.chipText };
  if (tone === 'under') return { backgroundColor: c.warningSurface, borderColor: c.warningBorder, color: c.text };
  if (tone === 'over') return { backgroundColor: c.dangerBg, borderColor: c.dangerText, color: c.dangerText };
  return { backgroundColor: c.surfaceMuted, borderColor: c.border, color: c.text };
}

export function SolutionElementPanorama({ tiles }: { tiles: SolutionElementTile[] }) {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  if (tiles.length === 0) return null;

  const macros = tiles.filter((tile) => tile.group === 'macro');
  const micros = tiles.filter((tile) => tile.group === 'micro');

  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.head}>
        <Text style={styles.title}>{strings.nutrient.elementsInSolution}</Text>
        <Text style={styles.unit}>{strings.nutrient.elementsInSolutionUnit}</Text>
      </View>
      {macros.length > 0 ? <TileGrid tiles={macros} /> : null}
      {micros.length > 0 ? <TileGrid tiles={micros} /> : null}
    </View>
  );
}

function TileGrid({ tiles }: { tiles: SolutionElementTile[] }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.grid}>
      {tiles.map((tile) => {
        const tone = tileColors(tile.tone, colors);
        const ppm = formatNutrientPpm(tile.achievedPpm);
        const delta = tile.deltaPct == null ? null : formatSolutionElementDelta(tile.deltaPct);
        return (
          <View
            key={tile.element}
            style={[styles.tile, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}
            accessibilityLabel={delta ? `${tile.element} ${ppm}, ${delta}` : `${tile.element} ${ppm}`}
          >
            <Text style={[styles.symbol, { color: tone.color }]}>{tile.element}</Text>
            <Text style={[styles.ppm, { color: tone.color }]}>{ppm}</Text>
            {delta ? <Text style={[styles.delta, { color: tone.color }]}>{delta}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      gap: 10,
    },
    head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
    title: { fontSize: 16, lineHeight: 20, fontWeight: '700', color: c.text },
    unit: { fontSize: 13, lineHeight: 18, color: c.textMuted },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tile: {
      minWidth: 72,
      flexGrow: 1,
      flexBasis: '22%',
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    symbol: { fontSize: 15, lineHeight: 18, fontWeight: '700' },
    ppm: { marginTop: 2, fontSize: 16, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
    delta: { marginTop: 1, fontSize: 13, lineHeight: 16, fontVariant: ['tabular-nums'] },
  });
}
