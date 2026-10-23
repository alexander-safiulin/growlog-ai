import { useMobileLocale } from '@/context/LocaleContext';
import {
  TAB_IDS,
  useMobileNutrientWorkspace,
} from '@/components/nutrient/useMobileNutrientWorkspace';
import {
  deleteFarmWaterProfile,
  deleteNutrientRecipe,
  duplicateNutrientRecipe,
  logFeedingFromNutrientRecipe,
  renameNutrientRecipe,
  saveFarmFeedSystem,
  saveFarmFertilizerProduct,
  saveNutrientRecipeWithMeta,
  setGrowCycleNutrientPlan,
  toggleNutrientFavorite,
  upsertFarmWaterProfileFull,
} from '@growlog/domain';
import { SOLVER_VERSION, elementalFractionTable, growlogMacroMatchPct } from '@growlog/nutrient-calc';
import { unifiedToFertilizerSpecs } from '@growlog/web-lib/nutrient/unified-products';
import { productDisplayName } from '@growlog/web-lib/nutrient/product-display-names';
import { elementMassAndValence } from '@growlog/web-lib/nutrient/element-reference';
import { formatDoseLine, listSolutionVariants } from '@growlog/web-lib/nutrient/workspace/mobile-result';
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
  const ws = useMobileNutrientWorkspace();
  const displayLocale = locale === 'ru' ? 'ru' : 'en';
  const [waterName, setWaterName] = useState('Tap');
  const [systemName, setSystemName] = useState('Custom');
  const [saveName, setSaveName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');

  const tabLabel = (id: (typeof TAB_IDS)[number]) => strings.nutrient.tabs[id];

  const variants = useMemo(() => (ws.result ? listSolutionVariants(ws.result) : []), [ws.result]);
  const activeSolution = variants[ws.activeAlt] ?? variants[0];

  const fractionRows = useMemo(() => {
    const selected = ws.unified.filter((p) => ws.selectedIds.includes(p.id));
    if (!selected.length) return [];
    return elementalFractionTable(unifiedToFertilizerSpecs(selected), 'canonical');
  }, [ws.unified, ws.selectedIds]);

  const macroScore = useMemo(() => {
    if (!activeSolution) return 0;
    return growlogMacroMatchPct(ws.target, activeSolution.achievedPpm as Record<string, number>);
  }, [activeSolution, ws.target]);

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
          <TextInput
            style={styles.input}
            placeholder={strings.nutrient.searchFertilizers}
            value={ws.search}
            onChangeText={ws.setSearch}
          />
          <Pressable style={styles.row} onPress={() => ws.setFavoritesOnly(!ws.favoritesOnly)}>
            <Text style={styles.rowText}>{ws.favoritesOnly ? '★ ' : '☆ '}{strings.nutrient.favoritesOnly}</Text>
          </Pressable>
          {ws.filteredUnified.map((p) => {
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
                    toggleNutrientFavorite(ws.supabase, {
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
          {ws.farmId && (
            <Pressable
              style={styles.btn}
              onPress={() =>
                saveFarmFertilizerProduct(ws.supabase, {
                  farmId: ws.farmId!,
                  userId: ws.userId,
                  externalKey: `farm:${Date.now()}`,
                  brand: 'Farm',
                  name: 'Custom salt',
                  physicalForm: 'solid',
                  doseUnit: 'g_per_L',
                  lines: [{ form_key: 'K', value_pct: 50 }],
                }).then(() => ws.reload())
              }
            >
              <Text style={styles.btnText}>{strings.nutrient.newFarmProduct}</Text>
            </Pressable>
          )}
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
                saveFarmFeedSystem(ws.supabase, {
                  farmId: ws.farmId!,
                  userId: ws.userId,
                  name: systemName,
                  steps: [
                    {
                      step_order: 1,
                      week_label: 'W1',
                      stage: 'veg',
                      target_ppm: ws.profiles.find((p) => p.slug === ws.profileSlug)?.target_ppm ?? {},
                      ph_target: 6,
                      ec_target_ms_cm: 1.8,
                      light_hours: 18,
                      light_ppfd: 400,
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
                setGrowCycleNutrientPlan(ws.supabase, {
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
                upsertFarmWaterProfileFull(ws.supabase, {
                  farmId: ws.farmId!,
                  name: waterName,
                  waterPpm: { Ca: 40, Mg: 12, K: 3, Na: 10, Cl: 15, N_NO3: 0, SO4: 20, HCO3: 120 },
                  alkalinityHco3Ppm: 120,
                  ecMsCm: 0.35,
                  ph: 7.2,
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
              onPress={() => deleteFarmWaterProfile(ws.supabase, ws.farmId!, ws.activeWaterId).then(() => ws.reload())}
            >
              <Text>Delete</Text>
            </Pressable>
          )}
        </View>
      )}

      {ws.tab === 'elements' && (
        <View style={styles.card}>
          <ScrollView horizontal>
            <View>
              {(ws.catalog.elements ?? []).map((el) => {
                const ref = elementMassAndValence(el.symbol);
                return (
                  <Text key={el.symbol} style={styles.rowText}>
                    {el.display_name ?? el.symbol}: {el.atomic_mass ?? ref.atomic_mass ?? '—'} / {el.valence ?? ref.valence ?? '—'}
                  </Text>
                );
              })}
            </View>
          </ScrollView>
          {fractionRows.map((row, i) => (
            <Text key={i} style={styles.meta}>{row.name} · {row.element} {row.pctInProduct.toFixed(1)}%</Text>
          ))}
        </View>
      )}

      {ws.tab === 'solutions' && (
        <View style={styles.card}>
          {ws.recipes.map((r) => {
            const id = String(r.id);
            const name = String(r.name);
            const cycleId = r.cycle_id as string | null;
            const eventId = r.linked_event_id as string | null;
            return (
              <View key={id} style={styles.row}>
                {renamingId === id ? (
                  <TextInput style={styles.input} value={renameVal} onChangeText={setRenameVal} />
                ) : (
                  <Text style={styles.rowText}>{name}</Text>
                )}
                <Text style={styles.meta}>
                  {cycleId ? ws.cycleLabelById[cycleId] ?? cycleId : '—'}
                  {eventId ? ` · ${ws.eventLabelById[eventId] ?? eventId}` : ''}
                </Text>
                <View style={styles.rowActions}>
                  <Pressable onPress={() => ws.loadRecipe(r)}><Text style={styles.link}>Load</Text></Pressable>
                  <Pressable onPress={() => { setRenamingId(id); setRenameVal(name); }}><Text style={styles.link}>Rename</Text></Pressable>
                  {renamingId === id && ws.farmId && (
                    <Pressable onPress={() => renameNutrientRecipe(ws.supabase, ws.farmId!, id, renameVal).then(() => { setRenamingId(null); ws.reload(); })}>
                      <Text style={styles.link}>Save</Text>
                    </Pressable>
                  )}
                  {ws.farmId && (
                    <Pressable onPress={() => deleteNutrientRecipe(ws.supabase, ws.farmId!, id).then(() => ws.reload())}>
                      <Text style={styles.link}>Del</Text>
                    </Pressable>
                  )}
                  {ws.farmId && (
                    <Pressable
                      onPress={() =>
                        duplicateNutrientRecipe(ws.supabase, {
                          farmId: ws.farmId!,
                          sourceRecipeId: id,
                          newName: `${name} (copy)`,
                          userId: ws.userId,
                        }).then(() => ws.reload())
                      }
                    >
                      <Text style={styles.link}>Dup</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
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
          {variants.length > 1 && (
            <ScrollView horizontal style={styles.tableScroll}>
              {variants.map((_, i) => (
                <Pressable key={i} onPress={() => ws.setActiveAlt(i)} style={[styles.tab, ws.activeAlt === i && styles.tabActive]}>
                  <Text style={styles.tabText}>{i === 0 ? 'Best' : `Alt ${i}`}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          {activeSolution && (
            <>
              <Text style={styles.meta}>Score {macroScore.toFixed(1)}%</Text>
              <ScrollView horizontal style={styles.tableScroll}>
                <View>
                  {activeSolution.doses
                    .filter((d) => d.amountPerL > 0)
                    .map((d) => (
                      <Text key={`${d.fertilizerId}-${d.tank}`} style={styles.dose}>
                        {formatDoseLine(d)}
                      </Text>
                    ))}
                </View>
              </ScrollView>
            </>
          )}
          {ws.farmId && ws.userId && ws.result && (
            <>
              <TextInput style={styles.input} placeholder={strings.nutrient.recipeName} value={saveName} onChangeText={setSaveName} />
              <Pressable
                style={styles.btn}
                onPress={async () => {
                  if (!saveName.trim()) return;
                  const { id } = await saveNutrientRecipeWithMeta(ws.supabase, {
                    farmId: ws.farmId!,
                    name: saveName.trim(),
                    volumeL: ws.volumeL,
                    solutionKind: 'recipe',
                    cycleId: ws.cycle?.id ?? null,
                    scopeId: ws.scopeId ?? null,
                    farmFeedSystemId: ws.activeSystemId || null,
                    farmFeedSystemStepId: ws.activeStepId || null,
                    inputs: { selectedIds: ws.selectedIds, profileSlug: ws.profileSlug, waterProfileId: ws.activeWaterId },
                    result: ws.result!,
                    solverVersion: SOLVER_VERSION,
                    userId: ws.userId,
                  });
                  if (ws.cycle?.id && ws.scopeId) {
                    await logFeedingFromNutrientRecipe(ws.supabase, {
                      farmId: ws.farmId!,
                      cycleId: ws.cycle.id,
                      scopeId: ws.scopeId,
                      recipeId: id,
                      recipeName: saveName.trim(),
                      volumeL: ws.volumeL,
                      userId: ws.userId,
                      body: strings.nutrient.feedingEventBody
                        .replace('{name}', saveName.trim())
                        .replace('{volume}', String(ws.volumeL)),
                    });
                  }
                  ws.reload();
                }}
              >
                <Text style={styles.btnText}>{strings.nutrient.saveRecipe}</Text>
              </Pressable>
            </>
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
  label: { fontSize: 14, fontWeight: '600', color: '#1b4332' },
  input: { borderWidth: 1, borderColor: '#d8ead9', borderRadius: 8, padding: 10, fontSize: 16 },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e8f5e9' },
  rowText: { fontSize: 15, color: '#1b4332' },
  dose: { fontSize: 14, fontWeight: '600', color: '#1b4332', marginVertical: 4 },
  meta: { fontSize: 12, color: '#52796f', marginTop: 4 },
  tableScroll: { marginTop: 8 },
  btn: { backgroundColor: '#1b4332', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnOutline: { borderWidth: 1, borderColor: '#d8ead9', padding: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  rowActions: { flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  link: { color: '#1b4332', fontWeight: '600' },
});
