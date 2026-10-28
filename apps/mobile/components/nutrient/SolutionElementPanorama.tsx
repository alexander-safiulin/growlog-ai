import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import { formatNutrientPpm } from '@growlog/web-lib/nutrient/format-nutrient-amount';
import {
  formatSolutionElementDelta,
  solutionNitrogenFormSymbol,
  type SolutionElementTile,
  type SolutionElementTone,
  type SolutionNitrogenForm,
} from '@growlog/web-lib/nutrient/solution-element-panorama';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

function TileFace({
  symbol,
  achievedPpm,
  deltaPct,
  tone,
  disclosure,
}: {
  symbol: string;
  achievedPpm: number;
  deltaPct: number | null;
  tone: SolutionElementTone;
  disclosure?: 'open' | 'closed';
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const paint = tileColors(tone, colors);
  const ppm = formatNutrientPpm(achievedPpm);
  const delta = deltaPct == null ? null : formatSolutionElementDelta(deltaPct);
  return (
    <View style={[styles.tile, { backgroundColor: paint.backgroundColor, borderColor: paint.borderColor }]}>
      <View style={styles.symbolRow}>
        {disclosure ? (
          <Text style={[styles.symbol, { color: paint.color }]}>{disclosure === 'open' ? '▾' : '▸'}</Text>
        ) : null}
        <Text style={[styles.symbol, { color: paint.color }]}>{symbol}</Text>
      </View>
      <Text style={[styles.ppm, { color: paint.color }]}>{ppm}</Text>
      {delta ? <Text style={[styles.delta, { color: paint.color }]}>{delta}</Text> : null}
    </View>
  );
}

function TileGrid({ tiles }: { tiles: SolutionElementTile[] }) {
  const { strings } = useMobileLocale();
  const styles = useThemedStyles(makeStyles);
  const [nitrogenOpen, setNitrogenOpen] = useState(false);

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => {
        const expandable = tile.element === 'N' && tile.forms.length > 0;
        const open = expandable && nitrogenOpen;
        const face = (
          <TileFace
            symbol={tile.element}
            achievedPpm={tile.achievedPpm}
            deltaPct={tile.deltaPct}
            tone={tile.tone}
            disclosure={expandable ? (open ? 'open' : 'closed') : undefined}
          />
        );
        if (!expandable) {
          return (
            <View key={tile.element} style={styles.slot}>
              {face}
            </View>
          );
        }
        return (
          <View key={tile.element} style={open ? styles.nitrogenOpen : styles.slot}>
            <Pressable
              style={open ? styles.summarySlot : styles.slotFill}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setNitrogenOpen((current) => !current)}
            >
              {face}
            </Pressable>
            {open ? (
              <View style={styles.formGrid}>
                {tile.forms.map((form) => (
                  <View key={form.element} style={styles.slot}>
                    <FormTile form={form} unknownLabel={strings.nutrient.elementNUnknown} />
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function FormTile({ form, unknownLabel }: { form: SolutionNitrogenForm; unknownLabel: string }) {
  const symbol = solutionNitrogenFormSymbol(form.element) ?? unknownLabel;
  return (
    <TileFace symbol={symbol} achievedPpm={form.achievedPpm} deltaPct={form.deltaPct} tone={form.tone} />
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
    slot: { minWidth: 72, flexGrow: 1, flexBasis: '22%' },
    slotFill: { width: '100%' },
    nitrogenOpen: { width: '100%', gap: 8 },
    summarySlot: { alignSelf: 'flex-start', minWidth: 72, width: '22%' },
    formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    symbolRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tile: {
      width: '100%',
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
