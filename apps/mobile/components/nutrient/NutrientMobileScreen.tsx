import { useMobileLocale } from '@/context/LocaleContext';
import { nutrientCatalog } from '@/lib/nutrient-catalog';
import { useFarmContext } from '@/providers/FarmProvider';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  mapDbProductsToFertilizerSpecs,
  mapDbProfileToTarget,
  solveForward,
  type DbCompositionLineRow,
  type DbFertilizerProductRow,
} from '@growlog/nutrient-calc';

const TAB_IDS = ['wand', 'fertilizers', 'systems', 'water', 'elements', 'solutions'] as const;
type TabId = (typeof TAB_IDS)[number];

export function NutrientMobileScreen() {
  const { strings } = useMobileLocale();
  const { cycle } = useFarmContext();
  const [tab, setTab] = useState<TabId>('wand');
  const catalog = nutrientCatalog;
  const profiles = catalog.target_profiles;
  const [profileSlug, setProfileSlug] = useState(profiles[0]?.slug ?? '');
  const [selected, setSelected] = useState<string[]>([]);
  const [volumeL, setVolumeL] = useState('100');

  const profile = profiles.find((p) => p.slug === profileSlug);
  const fertilizers = useMemo(() => {
    const products = catalog.fertilizers.filter((p) => selected.includes(p.id));
    const rows: DbFertilizerProductRow[] = products.map((p) => ({
      id: p.id,
      external_key: p.external_key,
      brand: p.brand,
      name: p.name,
      physical_form: p.physical_form,
      dose_unit: p.dose_unit,
      metadata: p.metadata,
    }));
    const lines: DbCompositionLineRow[] = products.flatMap((p) =>
      p.lines.map((l) => ({ product_id: p.id, form_key: l.form_key, value_pct: l.value_pct })),
    );
    return mapDbProductsToFertilizerSpecs(rows, lines);
  }, [catalog.fertilizers, selected]);

  const result = useMemo(() => {
    if (!profile || !fertilizers.length) return null;
    try {
      return solveForward({
        target: mapDbProfileToTarget(profile),
        fertilizers,
        options: { volumeL: Number(volumeL) || 100, maxAlternatives: 4, tankMode: 'ab', stockTank: { concentrationFactor: 100, twoTankMode: true } },
      });
    } catch {
      return null;
    }
  }, [profile, fertilizers, volumeL]);

  const tabLabel = (id: TabId) => strings.nutrient.tabs[id];

  return (
    <ScrollView contentContainerStyle={styles.container} horizontal={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TAB_IDS.map((id) => (
          <Pressable key={id} onPress={() => setTab(id)} style={[styles.tab, tab === id && styles.tabActive]}>
            <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{tabLabel(id)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === 'fertilizers' && (
        <View style={styles.card}>
          <Text style={styles.hint}>{strings.nutrient.hintFertilizers}</Text>
          {catalog.fertilizers.slice(0, 40).map((p) => {
            const on = selected.includes(p.id);
            return (
              <Pressable
                key={p.id}
                style={styles.row}
                onPress={() =>
                  setSelected((prev) => (on ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
                }
              >
                <Text style={styles.rowText}>{on ? '☑ ' : '☐ '}{p.brand} — {p.name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {tab === 'systems' && (
        <View style={styles.card}>
          {profiles.map((p) => (
            <Pressable key={p.slug} style={styles.row} onPress={() => setProfileSlug(p.slug)}>
              <Text style={styles.rowText}>{profileSlug === p.slug ? '● ' : '○ '}{p.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {tab === 'wand' && (
        <View style={styles.card}>
          <Text style={styles.label}>{strings.nutrient.volumeL}</Text>
          <TextInput style={styles.input} value={volumeL} onChangeText={setVolumeL} keyboardType="decimal-pad" />
          {cycle?.id && <Text style={styles.meta}>{strings.nutrient.cycleLinked}</Text>}
          {result && (
            <ScrollView horizontal style={styles.tableScroll}>
              <View>
                <Text style={styles.h2}>{strings.nutrient.results}</Text>
                {result.best.doses
                  .filter((d) => d.amountPerL > 0)
                  .map((d) => (
                    <Text key={d.fertilizerId} style={styles.dose}>
                      {d.fertilizerName}: {d.amountPerL.toFixed(3)} {d.unit === 'ml_per_L' ? 'mL/L' : 'g/L'}
                    </Text>
                  ))}
                {result.alternatives.length > 0 && (
                  <Text style={styles.meta}>
                    {strings.nutrient.alternatives}: {result.alternatives.length}
                  </Text>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {(tab === 'water' || tab === 'elements' || tab === 'solutions') && (
        <View style={styles.card}>
          <Text style={styles.hint}>
            {tab === 'water'
              ? strings.nutrient.tab_water
              : tab === 'elements'
                ? strings.nutrient.tab_elements
                : strings.nutrient.tab_solutions}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 120, gap: 12 },
  tabs: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d8ead9',
    backgroundColor: '#fff',
  },
  tabActive: { backgroundColor: '#1b4332', borderColor: '#1b4332' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#1b4332' },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#d8ead9', gap: 8 },
  hint: { fontSize: 13, color: '#52796f' },
  h2: { fontSize: 16, fontWeight: '700', color: '#1b4332', marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#1b4332' },
  input: { borderWidth: 1, borderColor: '#d8ead9', borderRadius: 8, padding: 10, fontSize: 16 },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e8f5e9' },
  rowText: { fontSize: 15, color: '#1b4332' },
  dose: { fontSize: 16, fontWeight: '600', color: '#1b4332', marginVertical: 4 },
  meta: { fontSize: 12, color: '#52796f', marginTop: 8 },
  tableScroll: { marginTop: 8 },
});
