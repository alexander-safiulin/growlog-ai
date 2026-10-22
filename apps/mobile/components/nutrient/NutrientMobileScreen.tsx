import { useMobileLocale } from '@/context/LocaleContext';
import {
  TAB_IDS,
  useMobileNutrientWorkspace,
} from '@/components/nutrient/useMobileNutrientWorkspace';
import {
  deleteFarmWaterProfile,
  duplicateNutrientRecipe,
  saveFarmFeedSystem,
  setGrowCycleNutrientPlan,
  toggleNutrientFavorite,
  upsertFarmWaterProfileFull,
} from '@growlog/domain';
import { elementalFractionTable } from '@growlog/nutrient-calc';
import { unifiedToFertilizerSpecs } from '@growlog/web-lib/nutrient/unified-products';
import { productDisplayName } from '@growlog/web-lib/nutrient/product-display-names';
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

export function NutrientMobileScreen() {
  const { strings, locale } = useMobileLocale();
  const { supabase } = useFarmContext();
  const ws = useMobileNutrientWorkspace();
  const displayLocale = locale === 'ru' ? 'ru' : 'en';
  const [waterName, setWaterName] = useState('Tap');
  const [systemName, setSystemName] = useState('Custom');

  const tabLabel = (id: (typeof TAB_IDS)[number]) => strings.nutrient.tabs[id];

  const fractionRows = useMemo(() => {
    const selected = ws.unified.filter((p) => ws.selectedIds.includes(p.id));
    if (!selected.length) return [];
    return elementalFractionTable(unifiedToFertilizerSpecs(selected), 'canonical');
  }, [ws.unified, ws.selectedIds]);

  return (
    <ScrollView contentContainerStyle={styles.container} horizontal={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TAB_IDS.map((id) => (
          <Pressable key={id} onPress={() => ws.setTab(id)} style={[styles.tab, ws.tab === id && styles.tabActive]}>
            <Text style={[styles.tabText, ws.tab === id && styles.tabTextActive]}>{tabLabel(id)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {ws.tab === 'fertilizers' && (
        <View style={styles.card}>
          <Text style={styles.hint}>{strings.nutrient.hintFertilizers}</Text>
          {ws.unified.slice(0, 80).map((p) => {
            const on = ws.selectedIds.includes(p.id);
            const label = `${p.brand} — ${productDisplayName(p.external_key, p.name, displayLocale)}`;
            return (
              <Pressable
                key={p.id}
                style={styles.row}
                onPress={() =>
                  ws.setSelectedIds((prev) => (on ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
                }
              >
                <Text style={styles.rowText}>
                  {on ? '☑ ' : '☐ '}
                  {ws.favoriteIds.has(p.id) ? '★ ' : ''}
                  {label}
                </Text>
                <Pressable
                  onPress={() => {
                    if (!ws.farmId || !ws.userId) return;
                    toggleNutrientFavorite(supabase, {
                      farmId: ws.farmId,
                      userId: ws.userId,
                      productScope: p.scope === 'farm' ? 'farm' : 'catalog',
                      catalogProductId: p.scope === 'catalog' ? p.id : undefined,
                      farmProductId: p.scope === 'farm' ? p.id.replace('farm:', '') : undefined,
                      favorited: !ws.favoriteIds.has(p.id),
                    }).then(() => ws.reload());
                  }}
                >
                  <Text>★</Text>
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      )}

      {ws.tab === 'systems' && (
        <View style={styles.card}>
          {ws.profiles.map((p) => (
            <Pressable key={p.slug} style={styles.row} onPress={() => ws.setProfileSlug(p.slug)}>
              <Text style={styles.rowText}>{ws.profileSlug === p.slug ? '● ' : '○ '}{p.name}</Text>
            </Pressable>
          ))}
          <TextInput style={styles.input} value={systemName} onChangeText={setSystemName} placeholder="System name" />
          {ws.farmId && (
            <Pressable
              style={styles.btn}
              onPress={() =>
                saveFarmFeedSystem(supabase, {
                  farmId: ws.farmId!,
                  userId: ws.userId,
                  name: systemName,
                  steps: [
                    {
                      step_order: 1,
                      week_label: 'W1',
                      stage: 'veg',
                      target_ppm: ws.profiles.find((p) => p.slug === ws.profileSlug)?.target_ppm ?? {},
                      ph_target: null,
                      ec_target_ms_cm: null,
                      light_hours: null,
                      light_ppfd: null,
                    },
                  ],
                }).then(() => ws.reload())
              }
            >
              <Text style={styles.btnText}>Create system</Text>
            </Pressable>
          )}
          {ws.feedSystems.map((s) => (
            <Pressable key={s.id} style={styles.row} onPress={() => ws.setActiveSystemId(s.id)}>
              <Text style={styles.rowText}>{ws.activeSystemId === s.id ? '● ' : '○ '}{s.name}</Text>
            </Pressable>
          ))}
          {(ws.stepsBySystem[ws.activeSystemId] ?? []).map((st) => (
            <Pressable key={st.id} style={styles.row} onPress={() => ws.setActiveStepId(st.id)}>
              <Text style={styles.rowText}>{ws.activeStepId === st.id ? '▸ ' : ''}{st.week_label ?? st.step_order}</Text>
            </Pressable>
          ))}
          {ws.cycle?.id && ws.farmId && ws.activeSystemId && (
            <Pressable
              style={styles.btn}
              onPress={() =>
                setGrowCycleNutrientPlan(supabase, {
                  farmId: ws.farmId!,
                  cycleId: ws.cycle!.id,
                  farmFeedSystemId: ws.activeSystemId,
                  activeStepId: ws.activeStepId || null,
                  userId: ws.userId,
                }).then(() => ws.reload())
              }
            >
              <Text style={styles.btnText}>Attach to cycle</Text>
            </Pressable>
          )}
        </View>
      )}

      {ws.tab === 'water' && (
        <View style={styles.card}>
          {ws.waterProfiles.map((w) => (
            <Pressable key={w.id} style={styles.row} onPress={() => ws.setActiveWaterId(w.id)}>
              <Text style={styles.rowText}>{ws.activeWaterId === w.id ? '● ' : ''}{w.name}</Text>
            </Pressable>
          ))}
          <TextInput style={styles.input} value={waterName} onChangeText={setWaterName} />
          {ws.farmId && (
            <Pressable
              style={styles.btn}
              onPress={() =>
                upsertFarmWaterProfileFull(supabase, {
                  farmId: ws.farmId!,
                  name: waterName,
                  waterPpm: { Ca: 40, Mg: 12, K: 3, Na: 10, Cl: 15, N_NO3: 0, SO4: 20, HCO3: 120 },
                  alkalinityHco3Ppm: 120,
                  userId: ws.userId,
                }).then(() => ws.reload())
              }
            >
              <Text style={styles.btnText}>Save water profile</Text>
            </Pressable>
          )}
          {ws.activeWaterId && ws.farmId && (
            <Pressable
              style={styles.btnOutline}
              onPress={() => deleteFarmWaterProfile(supabase, ws.farmId!, ws.activeWaterId).then(() => ws.reload())}
            >
              <Text>Delete</Text>
            </Pressable>
          )}
        </View>
      )}

      {ws.tab === 'elements' && (
        <View style={styles.card}>
          {(ws.catalog.elements ?? []).map((el) => (
            <Text key={el.symbol} style={styles.rowText}>
              {el.display_name ?? el.symbol}: {el.atomic_mass ?? '—'} / {el.valence ?? '—'}
            </Text>
          ))}
          {fractionRows.slice(0, 30).map((row, i) => (
            <Text key={i} style={styles.meta}>{row.name} · {row.element} {row.pctInProduct.toFixed(1)}%</Text>
          ))}
        </View>
      )}

      {ws.tab === 'solutions' && (
        <View style={styles.card}>
          {ws.recipes.map((r) => (
            <View key={String(r.id)} style={styles.row}>
              <Text style={styles.rowText}>{String(r.name)}</Text>
              <Text style={styles.meta}>{String(r.solution_kind ?? 'recipe')}</Text>
              <View style={styles.rowActions}>
                <Pressable onPress={() => ws.loadRecipe(r)}><Text style={styles.link}>Load</Text></Pressable>
                {ws.farmId && (
                  <Pressable
                    onPress={() =>
                      duplicateNutrientRecipe(supabase, {
                        farmId: ws.farmId!,
                        sourceRecipeId: String(r.id),
                        newName: `${String(r.name)} (copy)`,
                        userId: ws.userId,
                      }).then(() => ws.reload())
                    }
                  >
                    <Text style={styles.link}>Dup</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {ws.tab === 'wand' && (
        <View style={styles.card}>
          <Text style={styles.label}>{strings.nutrient.volumeL}</Text>
          <TextInput
            style={styles.input}
            value={String(ws.volumeL)}
            onChangeText={(t) => ws.setVolumeL(Number(t) || 0)}
            keyboardType="decimal-pad"
          />
          {ws.cycle?.id && <Text style={styles.meta}>{strings.nutrient.cycleLinked}</Text>}
          {ws.result && (
            <ScrollView horizontal style={styles.tableScroll}>
              <View>
                <Text style={styles.h2}>{strings.nutrient.results}</Text>
                {ws.result.best.doses
                  .filter((d) => d.amountPerL > 0)
                  .map((d) => (
                    <Text key={d.fertilizerId} style={styles.dose}>
                      {d.fertilizerName}: {d.amountPerL.toFixed(3)} {d.unit === 'ml_per_L' ? 'mL/L' : 'g/L'} ({d.tank})
                    </Text>
                  ))}
                {ws.result.alternatives.length > 0 && (
                  <Text style={styles.meta}>
                    {strings.nutrient.alternatives}: {ws.result.alternatives.length}
                  </Text>
                )}
              </View>
            </ScrollView>
          )}
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
  btn: { backgroundColor: '#1b4332', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnOutline: { borderWidth: 1, borderColor: '#d8ead9', padding: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  rowActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  link: { color: '#1b4332', fontWeight: '600' },
});
