import type { TargetProfilePickerSections } from '@growlog/web-lib/nutrient/custom-target-profile';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import type { MobileThemeColors } from '@/lib/mobile-theme';

type Row = { slug: string; label: string };

function toRows(
  profiles: Array<{ slug: string; name: string }>,
  formatLabel: (name: string) => string,
): Row[] {
  return profiles.map((p) => ({ slug: p.slug, label: formatLabel(p.name) }));
}

function RadioMark({ selected, colors }: { selected: boolean; colors: MobileThemeColors }) {
  return (
    <View
      style={[
        {
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: selected ? colors.primary : colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      {selected ? (
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colors.primary,
          }}
        />
      ) : null}
    </View>
  );
}

export function TargetProfileRadioList({
  sections,
  selectedSlug,
  solutionChosen,
  sectionMineLabel,
  sectionCatalogLabel,
  onSelect,
  formatLabel,
  colors,
}: {
  sections: TargetProfilePickerSections;
  selectedSlug: string;
  solutionChosen: boolean;
  sectionMineLabel: string;
  sectionCatalogLabel: string;
  onSelect: (slug: string) => void;
  formatLabel: (name: string) => string;
  colors: MobileThemeColors;
}) {
  const styles = makeStyles(colors);

  const renderRows = (rows: Row[]) =>
    rows.map((row) => {
      const on = solutionChosen && selectedSlug === row.slug;
      return (
        <Pressable key={row.slug} style={styles.listRow} onPress={() => onSelect(row.slug)}>
          <RadioMark selected={on} colors={colors} />
          <Text style={styles.listLabel} numberOfLines={1}>
            {row.label}
          </Text>
        </Pressable>
      );
    });

  if (sections.mode === 'catalog_only') {
    return <View>{renderRows(toRows(sections.catalog, formatLabel))}</View>;
  }

  return (
    <View>
      <Text style={styles.sectionLabel}>{sectionMineLabel}</Text>
      {renderRows(toRows(sections.mine, (n) => n))}
      <Text style={styles.sectionLabel}>{sectionCatalogLabel}</Text>
      {renderRows(toRows(sections.catalog, formatLabel))}
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
    },
    listLabel: { flex: 1, fontSize: 14, color: c.text },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textMuted,
      marginTop: 8,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
  });
}
