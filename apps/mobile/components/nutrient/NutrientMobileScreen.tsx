import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import {
  TAB_IDS,
  useMobileNutrientWorkspace,
} from '@/components/nutrient/useMobileNutrientWorkspace';
import {
  deleteFarmWaterProfile,
  deleteNutrientRecipe,
  duplicateNutrientRecipe,
  renameNutrientRecipe,
  saveFarmFeedSystem,
  saveFarmFertilizerProduct,
  setGrowCycleNutrientPlan,
  toggleNutrientFavorite,
  upsertFarmWaterProfileFull,
} from '@growlog/domain';
import { declaredToElemental, elementalFractionTable, growlogMacroMatchPct } from '@growlog/nutrient-calc';
import { unifiedToFertilizerSpecs } from '@growlog/web-lib/nutrient/unified-products';
import { productDisplayName } from '@growlog/web-lib/nutrient/product-display-names';
import { elementMassAndValence } from '@growlog/web-lib/nutrient/element-reference';
import { formatDoseLine, listSolutionVariants } from '@growlog/web-lib/nutrient/workspace/mobile-result';
import { toggleGuestFavorite } from '@growlog/web-lib/nutrient/guest/guest-workspace-actions';
import { MobileAppUpdateBanner } from '@/components/nutrient/MobileAppUpdateBanner';
import { loadNutrientGuestStoreMobile, saveNutrientGuestStoreMobile } from '@/lib/nutrient-guest-storage';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function shortProfileName(name: string): string {
  return polishLabel(name.replace(/\s*\(https?:\/\/[^)]*\)\s*/g, ' '));
}

function polishLabel(name: string): string {
  return name
    .replace(/[★☆✱☑☐✓✔●○▸▾]/g, '')
    .replace(/flussig/gi, (word) => (word[0] === 'F' ? 'Flüssig' : 'flüssig'))
    .replace(/dunger/gi, (word) => (word[0] === 'D' ? 'Dünger' : 'dünger'))
    .replace(/\s+/g, ' ')
    .trim();
}

function fertilizerLabel(brand: string, name: string): string {
  const clean = polishLabel(name);
  const brandClean = polishLabel(brand);
  if (!brandClean || brandClean.toLowerCase() === clean.toLowerCase()) return clean;
  return `${brandClean} · ${clean}`;
}

const FERTILIZER_MACROS = ['N', 'P', 'K', 'Ca'] as const;

function macroPercents(lines: Array<{ form_key: string; value_pct: number }>): Record<(typeof FERTILIZER_MACROS)[number], number> {
  const declared: Record<string, number> = {};
  for (const line of lines) {
    declared[line.form_key] = (declared[line.form_key] ?? 0) + line.value_pct;
  }
  const { pct } = declaredToElemental(declared);
  const nitrogen =
    (pct.N ?? 0) > 0
      ? (pct.N ?? 0)
      : (pct.N_NO3 ?? 0) + (pct.N_NH4 ?? 0) + (pct.N_UREA ?? 0) + (pct.N_UNKNOWN ?? 0);
  return { N: nitrogen, P: pct.P ?? 0, K: pct.K ?? 0, Ca: pct.Ca ?? 0 };
}

function formatMacroPct(value: number): string {
  if (value < 0.05) return '–';
  if (value >= 10) return value.toFixed(0);
  return value.toFixed(1);
}

/** ~"ASB GreenWorld · … Balkon, Garden, Zimmer" — longer names ellipsize on two lines. */
const FERTILIZER_NAME_MAX_WIDTH = 228;

function SelectMark({ selected, kind }: { selected: boolean; kind: 'check' | 'radio' }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  if (kind === 'radio') {
    return (
      <View style={[styles.mark, styles.radio, selected && styles.markOn]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    );
  }
  return (
    <View style={[styles.mark, selected && styles.checkOn]}>
      {selected ? (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          tintColor={colors.primaryText}
          size={13}
        />
      ) : null}
    </View>
  );
}

export function NutrientMobileScreen() {
  const { strings, locale } = useMobileLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const ws = useMobileNutrientWorkspace();
  const displayLocale = locale === 'ru' ? 'ru' : 'en';
  const [waterName, setWaterName] = useState('Tap');
  const [systemName, setSystemName] = useState('Custom');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [compositionOpen, setCompositionOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [volumeNote, setVolumeNote] = useState<string | null>(null);
  const hasFavorites = ws.favoriteIds.size > 0;

  async function onToggleFavorite(product: { id: string; scope: string }) {
    if (!ws.isCloudSynced) {
      const store = await loadNutrientGuestStoreMobile();
      await saveNutrientGuestStoreMobile(toggleGuestFavorite(store, product.id));
      await ws.reload();
      return;
    }
    if (!ws.farmId || !ws.userId) return;
    await toggleNutrientFavorite(ws.supabase, {
      farmId: ws.farmId,
      userId: ws.userId,
      productScope: product.scope === 'farm' ? 'farm' : 'catalog',
      catalogProductId: product.scope === 'catalog' ? product.id : undefined,
      farmProductId: product.scope === 'farm' ? product.id.replace('farm:', '') : undefined,
      favorited: !ws.favoriteIds.has(product.id),
    });
    await ws.reload();
  }

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

  const doseLines = useMemo(
    () => (activeSolution ? activeSolution.doses.filter((d) => d.amountPerL > 0) : []),
    [activeSolution],
  );

  const composition = activeSolution && ws.solutionChosen && doseLines.length > 0 ? (
    <View>
      {variants.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.altRow}>
          {variants.map((_, i) => (
            <Pressable key={i} onPress={() => ws.setActiveAlt(i)} style={[styles.tab, ws.activeAlt === i && styles.tabActive]}>
              <Text style={[styles.tabText, ws.activeAlt === i && styles.tabTextActive]}>{i === 0 ? 'Best' : `Alt ${i}`}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <Pressable
        style={styles.accordion}
        onPress={() => setCompositionOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: compositionOpen }}
      >
        <Text style={styles.accordionTitle}>{compositionOpen ? '▾' : '▸'} {strings.nutrient.composition}</Text>
        <Text style={styles.meta}>
          {strings.nutrient.compositionMeta
            .replace('{count}', String(doseLines.length))
            .replace('{score}', macroScore.toFixed(1))}
        </Text>
      </Pressable>
      {compositionOpen
        ? doseLines.map((d) => (
            <Text key={`${d.fertilizerId}-${d.tank}`} style={styles.dose}>
              {formatDoseLine(d)}
            </Text>
          ))
        : null}
    </View>
  ) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} horizontal={false}>
      <MobileAppUpdateBanner />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TAB_IDS.map((id) => (
          <Pressable key={id} onPress={() => ws.setTab(id)} style={[styles.tab, ws.tab === id && styles.tabActive]}>
            <Text style={[styles.tabText, ws.tab === id && styles.tabTextActive]}>{tabLabel(id)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {ws.tab === 'fertilizers' && (
        <View style={styles.card}>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, styles.searchInput]}
              placeholder={strings.nutrient.searchFertilizers}
              placeholderTextColor={colors.placeholder}
              keyboardAppearance={colors.keyboardAppearance}
              value={ws.search}
              onChangeText={ws.setSearch}
            />
            <Pressable
              style={[styles.favFilter, ws.favoritesOnly && styles.favFilterOn]}
              onPress={() => ws.setFavoritesOnly(!ws.favoritesOnly)}
              accessibilityRole="button"
              accessibilityState={{ selected: ws.favoritesOnly }}
            >
              <SymbolView
                name={{
                  ios: hasFavorites ? 'star.fill' : 'star',
                  android: hasFavorites ? 'star' : 'star_border',
                  web: hasFavorites ? 'star' : 'star_border',
                }}
                tintColor={hasFavorites ? colors.primary : colors.textMuted}
                size={18}
              />
              <Text style={styles.favFilterLabel} numberOfLines={1}>
                {strings.nutrient.favoritesOnly}
              </Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
            <View>
              <View style={styles.fertRow}>
                <View style={styles.fertCheck} />
                <View style={{ width: FERTILIZER_NAME_MAX_WIDTH }} />
                {FERTILIZER_MACROS.map((key) => (
                  <Text key={key} style={styles.fertHead}>{key}</Text>
                ))}
              </View>
              {ws.filteredUnified.map((p) => {
                const on = ws.selectedIds.includes(p.id);
                const fav = ws.favoriteIds.has(p.id);
                const label = fertilizerLabel(
                  p.brand,
                  productDisplayName(p.external_key, p.name, displayLocale),
                );
                const macros = macroPercents(p.lines);
                return (
                  <Pressable
                    key={p.id}
                    style={styles.fertRow}
                    onPress={() =>
                      ws.setSelectedIds((prev) => (on ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
                    }
                  >
                    {({ pressed }) => (
                      <>
                        <View style={styles.fertCheck}>
                          <SelectMark selected={on} kind="check" />
                        </View>
                        <View style={[styles.fertNameWrap, { width: FERTILIZER_NAME_MAX_WIDTH }]}>
                          <Text style={styles.fertName} numberOfLines={2} ellipsizeMode="tail">
                            {label}
                          </Text>
                          {pressed ? (
                            <Pressable
                              style={styles.favoritePeek}
                              accessibilityLabel={strings.nutrient.favoritesOnly}
                              onPress={() => void onToggleFavorite(p)}
                            >
                              <SymbolView
                                name={{
                                  ios: fav ? 'star.fill' : 'star',
                                  android: fav ? 'star' : 'star_border',
                                  web: fav ? 'star' : 'star_border',
                                }}
                                tintColor={fav ? colors.primary : colors.textMuted}
                                size={20}
                              />
                            </Pressable>
                          ) : null}
                        </View>
                        {FERTILIZER_MACROS.map((key) => (
                          <Text key={key} style={styles.fertCell}>{formatMacroPct(macros[key])}</Text>
                        ))}
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
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
          <View>
          {ws.profiles.map((p) => {
            const on = ws.profileSlug === p.slug;
            return (
              <Pressable key={p.slug} style={styles.listRow} onPress={() => ws.setProfileSlug(p.slug)}>
                <SelectMark selected={on} kind="radio" />
                <Text style={styles.listLabel} numberOfLines={1}>{shortProfileName(p.name)}</Text>
              </Pressable>
            );
          })}
          </View>
          <TextInput
            style={styles.input}
            value={systemName}
            onChangeText={setSystemName}
            placeholder={strings.nutrient.systemNamePlaceholder}
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={colors.keyboardAppearance}
          />
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
          <View>
          {ws.feedSystems.map((s) => {
            const on = ws.activeSystemId === s.id;
            return (
              <Pressable key={s.id} style={styles.listRow} onPress={() => ws.setActiveSystemId(s.id)}>
                <SelectMark selected={on} kind="radio" />
                <Text style={styles.listLabel} numberOfLines={1}>{s.name}</Text>
              </Pressable>
            );
          })}
          {(ws.stepsBySystem[ws.activeSystemId] ?? []).map((st) => {
            const on = ws.activeStepId === st.id;
            return (
              <Pressable key={st.id} style={styles.listRow} onPress={() => ws.setActiveStepId(st.id)}>
                <SelectMark selected={on} kind="radio" />
                <Text style={styles.listLabel} numberOfLines={1}>{st.week_label ?? st.step_order}</Text>
              </Pressable>
            );
          })}
          </View>
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
          <View>
          {ws.waterProfiles.map((w) => {
            const on = ws.activeWaterId === w.id;
            return (
              <Pressable key={w.id} style={styles.listRow} onPress={() => ws.setActiveWaterId(w.id)}>
                <SelectMark selected={on} kind="radio" />
                <Text style={styles.listLabel} numberOfLines={1}>{w.name}</Text>
              </Pressable>
            );
          })}
          </View>
          <TextInput
            style={styles.input}
            value={waterName}
            onChangeText={setWaterName}
            placeholderTextColor={colors.placeholder}
            keyboardAppearance={colors.keyboardAppearance}
          />
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
              <Text style={styles.btnOutlineText}>Delete</Text>
            </Pressable>
          )}
        </View>
      )}

      {ws.tab === 'elements' && (
        <View style={styles.card}>
          <View>
            {(ws.catalog.elements ?? []).map((el) => {
              const ref = elementMassAndValence(el.symbol);
              const mass = el.atomic_mass ?? ref.atomic_mass ?? '—';
              const valence = el.valence ?? ref.valence ?? '—';
              return (
                <View key={el.symbol} style={styles.listRow}>
                  <Text style={styles.elementSymbol}>{el.symbol}</Text>
                  <Text style={styles.listLabel} numberOfLines={1}>{el.display_name ?? el.symbol}</Text>
                  <Text style={styles.elementMeta}>{mass} · {valence}</Text>
                </View>
              );
            })}
          </View>
          {fractionRows.map((row, i) => (
            <Text key={i} style={styles.meta}>{row.name} · {row.element} {row.pctInProduct.toFixed(1)}%</Text>
          ))}
        </View>
      )}

      {ws.tab === 'solutions' && (
        <View style={styles.sectionStack}>
          <View style={styles.card}>
            <Text style={styles.label}>{strings.nutrient.stepVolume}</Text>
            <Text style={styles.lead}>{strings.nutrient.stepVolumeHint}</Text>
            <View style={styles.volumeRow}>
              <TextInput
                style={[styles.input, styles.volumeInput]}
                value={String(ws.volumeL)}
                onChangeText={(t) => {
                  setVolumeNote(null);
                  ws.setVolumeL(Number(t) || 0);
                }}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.placeholder}
                keyboardAppearance={colors.keyboardAppearance}
              />
              <Pressable
                style={styles.iconBtn}
                accessibilityLabel={strings.nutrient.saveVolume}
                onPress={() => {
                  void ws.saveTankVolume().then(() => setVolumeNote(strings.nutrient.volumeSaved));
                }}
              >
                <SymbolView
                  name={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
                  tintColor={colors.primary}
                  size={28}
                />
              </Pressable>
            </View>
            {volumeNote ? <Text style={styles.meta}>{volumeNote}</Text> : null}
            {ws.cycle?.id ? <Text style={styles.meta}>{strings.nutrient.cycleLinked}</Text> : null}
          </View>

          <View style={styles.card}>
          <Pressable
            style={styles.targetHeader}
            onPress={() => setTargetOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: targetOpen }}
          >
            <Text style={styles.targetTitle}>
              {targetOpen ? '▾' : '▸'} {strings.nutrient.chooseSolution}
            </Text>
            <Text style={styles.optionalMark}>{strings.nutrient.targetOptional}</Text>
          </Pressable>
          {ws.solutionChosen ? (
            <Text style={styles.meta}>
              {shortProfileName(ws.profiles.find((p) => p.slug === ws.profileSlug)?.name ?? '')}
            </Text>
          ) : null}
          <Text style={styles.lead}>{strings.nutrient.chooseSolutionHint}</Text>
          {targetOpen ? (
            <View>
              {ws.profiles.map((p) => {
                const on = ws.solutionChosen && ws.profileSlug === p.slug;
                return (
                  <Pressable
                    key={p.slug}
                    style={styles.listRow}
                    onPress={() => {
                      ws.chooseSolution(p.slug);
                      setTargetOpen(false);
                      setCompositionOpen(true);
                    }}
                  >
                    <SelectMark selected={on} kind="radio" />
                    <Text style={styles.listLabel} numberOfLines={1}>{shortProfileName(p.name)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {composition}
          </View>

          {ws.recipes.length > 0 ? (
            <View style={styles.card}>
              <Pressable
                style={styles.targetHeader}
                onPress={() => setSavedOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityState={{ expanded: savedOpen }}
              >
                <Text style={styles.targetTitle}>
                  {savedOpen ? '▾' : '▸'} {strings.nutrient.savedSolutions}
                </Text>
                <Text style={styles.optionalMark}>{ws.recipes.length}</Text>
              </Pressable>
              <Text style={styles.lead}>{strings.nutrient.savedSolutionsHint}</Text>
              {savedOpen ? ws.recipes.map((r) => {
                const id = String(r.id);
                const name = String(r.name);
                const cycleId = r.cycle_id as string | null;
                const eventId = r.linked_event_id as string | null;
                const volume = Number(r.volume_l);
                const detail = [
                  Number.isFinite(volume) && volume > 0
                    ? strings.nutrient.recipeLiters.replace('{volume}', String(volume))
                    : '',
                  cycleId ? ws.cycleLabelById[cycleId] : '',
                  eventId ? ws.eventLabelById[eventId] : '',
                ].filter(Boolean).join(' · ');
                return (
                  <View key={id} style={styles.row}>
                    {renamingId === id ? (
                      <TextInput
                        style={styles.input}
                        value={renameVal}
                        onChangeText={setRenameVal}
                        placeholderTextColor={colors.placeholder}
                        keyboardAppearance={colors.keyboardAppearance}
                      />
                    ) : (
                      <Text style={styles.rowText}>{name}</Text>
                    )}
                    {detail ? <Text style={styles.meta}>{detail}</Text> : null}
                    <View style={styles.rowActions}>
                      <Pressable
                        style={styles.iconBtn}
                        accessibilityLabel={strings.nutrient.recipeOpen}
                        onPress={() => ws.loadRecipe(r)}
                      >
                        <SymbolView
                          name={{ ios: 'arrow.forward.circle', android: 'arrow_circle_right', web: 'arrow_circle_right' }}
                          tintColor={colors.primary}
                          size={22}
                        />
                      </Pressable>
                      {renamingId === id && ws.farmId ? (
                        <Pressable
                          style={styles.iconBtn}
                          accessibilityLabel={strings.nutrient.recipeRenameSave}
                          onPress={() => renameNutrientRecipe(ws.supabase, ws.farmId!, id, renameVal).then(() => { setRenamingId(null); ws.reload(); })}
                        >
                          <SymbolView
                            name={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
                            tintColor={colors.primary}
                            size={22}
                          />
                        </Pressable>
                      ) : (
                        <Pressable
                          style={styles.iconBtn}
                          accessibilityLabel={strings.nutrient.recipeRename}
                          onPress={() => { setRenamingId(id); setRenameVal(name); }}
                        >
                          <SymbolView
                            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                            tintColor={colors.primary}
                            size={22}
                          />
                        </Pressable>
                      )}
                      {ws.farmId && (
                        <Pressable
                          style={styles.iconBtn}
                          accessibilityLabel={strings.nutrient.recipeDelete}
                          onPress={() => deleteNutrientRecipe(ws.supabase, ws.farmId!, id).then(() => ws.reload())}
                        >
                          <SymbolView
                            name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                            tintColor={colors.dangerText}
                            size={22}
                          />
                        </Pressable>
                      )}
                      {ws.farmId && (
                        <Pressable
                          style={styles.iconBtn}
                          accessibilityLabel={strings.nutrient.recipeDuplicate}
                          onPress={() =>
                            duplicateNutrientRecipe(ws.supabase, {
                              farmId: ws.farmId!,
                              sourceRecipeId: id,
                              newName: `${name}${strings.nutrient.solutions?.copySuffix ?? ' (copy)'}`,
                              userId: ws.userId,
                            }).then(() => ws.reload())
                          }
                        >
                          <SymbolView
                            name={{ ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }}
                            tintColor={colors.primary}
                            size={22}
                          />
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              }) : null}
            </View>
          ) : null}
        </View>
      )}

      {ws.tab === 'wand' && (
        <View style={styles.card}>
          {ws.solutionChosen ? composition : <Text style={styles.lead}>{strings.nutrient.wandNeedsSolution}</Text>}
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    screen: { backgroundColor: c.screen },
    container: { padding: 16, paddingBottom: 120, gap: 12 },
    sectionStack: { gap: 12 },
    targetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    targetTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: c.text },
    optionalMark: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textMuted,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    tabs: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    tabActive: { backgroundColor: c.primary, borderColor: c.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: c.text },
    tabTextActive: { color: c.primaryText },
    card: { backgroundColor: c.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.border, gap: 8 },
    label: { fontSize: 14, fontWeight: '600', color: c.text },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      color: c.text,
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
    },
    row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.divider },
    listRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
    },
    listLabel: { flex: 1, fontSize: 16, color: c.text },
    fertRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
    },
    fertCheck: { width: 34, alignItems: 'flex-start', justifyContent: 'center' },
    fertNameWrap: { position: 'relative', justifyContent: 'center', minHeight: 44, paddingRight: 4 },
    fertName: { fontSize: 15, lineHeight: 19, color: c.text },
    favoritePeek: {
      position: 'absolute',
      right: 0,
      top: 4,
      bottom: 4,
      minWidth: 44,
      paddingHorizontal: 10,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    fertHead: { width: 40, marginLeft: 4, fontSize: 12, fontWeight: '700', color: c.sectionLabel, textAlign: 'right' },
    fertCell: { width: 40, marginLeft: 4, fontSize: 15, color: c.text, textAlign: 'right', fontVariant: ['tabular-nums'] },
    mark: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.inputBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.inputBg,
    },
    checkOn: { backgroundColor: c.primary, borderColor: c.primary },
    radio: { borderRadius: 11 },
    markOn: { borderColor: c.primary },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary },
    elementSymbol: { width: 36, fontSize: 15, fontWeight: '700', color: c.text },
    elementMeta: { fontSize: 13, color: c.textMuted },
    rowText: { fontSize: 15, color: c.text },
    lead: { fontSize: 15, lineHeight: 21, color: c.textMuted },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    searchInput: { flex: 1, minWidth: 0 },
    favFilter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 8,
    },
    favFilterOn: { backgroundColor: c.rowActiveBg },
    favFilterLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted, lineHeight: 14 },
    volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    volumeInput: { flex: 1 },
    iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    accordion: { paddingTop: 4 },
    accordionTitle: { fontSize: 15, fontWeight: '600', color: c.text },
    dose: { fontSize: 14, lineHeight: 20, color: c.text, marginTop: 8 },
    meta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    altRow: { flexDirection: 'row', gap: 8 },
    btn: { backgroundColor: c.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
    btnOutline: { borderWidth: 1, borderColor: c.border, padding: 10, borderRadius: 8, alignItems: 'center' },
    btnOutlineText: { color: c.text },
    btnText: { color: c.primaryText, fontWeight: '600' },
    rowActions: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    link: { color: c.primary, fontWeight: '600' },
  });
}
