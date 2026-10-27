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
  saveFarmFertilizerProduct,
  setGrowCycleNutrientPlan,
  clearNutrientFavorites,
  toggleNutrientFavorite,
  upsertFarmWaterProfileFull,
} from '@growlog/domain';
import { elementalFractionTable } from '@growlog/nutrient-calc';
import { unifiedToFertilizerSpecs } from '@growlog/web-lib/nutrient/unified-products';
import { productDisplayName } from '@growlog/web-lib/nutrient/product-display-names';
import { elementMassAndValence } from '@growlog/web-lib/nutrient/element-reference';
import { findWorkspaceTargetProfile, isGuestCustomTargetSlug } from '@growlog/web-lib/nutrient/custom-target-profile';
import { hasUsableTargetPpm } from '@growlog/web-lib/nutrient/save-custom-target-profile';
import { listSolutionVariants } from '@growlog/web-lib/nutrient/workspace/mobile-result';
import { SolutionVariantList } from '@/components/nutrient/SolutionVariantList';
import { TargetProfileRadioList } from '@/components/nutrient/TargetProfileRadioList';
import { clearGuestFavorites, toggleGuestFavorite } from '@growlog/web-lib/nutrient/guest/guest-workspace-actions';
import { MobileAppUpdateBanner } from '@/components/nutrient/MobileAppUpdateBanner';
import { loadNutrientGuestStoreMobile, saveNutrientGuestStoreMobile } from '@/lib/nutrient-guest-storage';
import {
  compositionElementLabel,
  compositionGroups,
  formatCompositionPct,
} from '@/lib/fertilizer-composition';
import { sortFertilizerRows } from '@/lib/fertilizer-list-sort';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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

const FERTILIZER_STAR_WIDTH = 36;

function FertilizerCompositionCard({
  lines,
  locale,
  emptyLabel,
  macrosLabel,
  microsLabel,
}: {
  lines: Array<{ form_key: string; value_pct: number }>;
  locale: string;
  emptyLabel: string;
  macrosLabel: string;
  microsLabel: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const groups = compositionGroups(lines);
  const sections = [
    { label: macrosLabel, rows: groups.macros },
    { label: microsLabel, rows: [...groups.micros, ...groups.other] },
  ].filter((section) => section.rows.length > 0);

  if (sections.length === 0) {
    return <Text style={styles.fertCompositionEmpty}>{emptyLabel}</Text>;
  }

  return (
    <View style={styles.fertComposition}>
      {sections.map((section) => (
        <View key={section.label}>
          <Text style={styles.fertCompositionHeading}>{section.label}</Text>
          {section.rows.map((row) => (
            <View key={row.key} style={styles.fertCompositionRow}>
              <Text style={styles.fertCompositionName}>{compositionElementLabel(row.key, locale)}</Text>
              <Text style={styles.fertCompositionValue}>{formatCompositionPct(row.pct)}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

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
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [targetOpen, setTargetOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [volumeNote, setVolumeNote] = useState<string | null>(null);
  const [showTabScrollHint, setShowTabScrollHint] = useState(false);
  const tabScrollMetrics = useRef({ width: 0, contentWidth: 0, offsetX: 0 });
  const tabScrollHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFavorites = ws.favoriteIds.size > 0;
  const [expandedFertilizerId, setExpandedFertilizerId] = useState<string | null>(null);

  const sortedFertilizers = useMemo(
    () => sortFertilizerRows(ws.filteredUnified, 'name', 'asc', displayLocale),
    [ws.filteredUnified, displayLocale],
  );

  const tabScrollHasMoreRight = useCallback(() => {
    const { width, contentWidth, offsetX } = tabScrollMetrics.current;
    return contentWidth > width + 4 && offsetX + width < contentWidth - 8;
  }, []);

  const hideTabScrollHintSoon = useCallback(() => {
    if (tabScrollHintTimer.current) clearTimeout(tabScrollHintTimer.current);
    tabScrollHintTimer.current = setTimeout(() => setShowTabScrollHint(false), 1400);
  }, []);

  const revealTabScrollHint = useCallback(() => {
    if (!tabScrollHasMoreRight()) {
      setShowTabScrollHint(false);
      return;
    }
    setShowTabScrollHint(true);
    hideTabScrollHintSoon();
  }, [tabScrollHasMoreRight, hideTabScrollHintSoon]);

  const syncTabScrollMetrics = useCallback(
    (patch: Partial<{ width: number; contentWidth: number; offsetX: number }>) => {
      tabScrollMetrics.current = { ...tabScrollMetrics.current, ...patch };
      if (!tabScrollHasMoreRight()) setShowTabScrollHint(false);
    },
    [tabScrollHasMoreRight],
  );

  useEffect(
    () => () => {
      if (tabScrollHintTimer.current) clearTimeout(tabScrollHintTimer.current);
    },
    [],
  );

  function confirmDeleteFeedSystem(systemId: string, name: string) {
    Alert.alert(
      strings.nutrient.deleteFeedSystemTitle,
      strings.nutrient.deleteFeedSystemBody.replace('{name}', name),
      [
        { text: strings.commonMobile.cancel, style: 'cancel' },
        {
          text: strings.nutrient.recipeDelete,
          style: 'destructive',
          onPress: () => void ws.deleteFeedSystem(systemId),
        },
      ],
    );
  }

  async function onClearFavorites() {
    if (ws.favoriteIds.size === 0) return;
    if (!ws.isCloudSynced) {
      const store = await loadNutrientGuestStoreMobile();
      await saveNutrientGuestStoreMobile(clearGuestFavorites(store));
    } else if (ws.farmId && ws.userId) {
      await clearNutrientFavorites(ws.supabase, ws.farmId, ws.userId);
    } else {
      return;
    }
    ws.setFavoritesOnly(false);
    await ws.reload();
  }

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
  const hasCalculatedMix = useMemo(
    () => variants.some((solution) => solution.doses.some((dose) => dose.amountPerL > 0)),
    [variants],
  );

  const fractionRows = useMemo(() => {
    const selected = ws.unified.filter((p) => ws.selectedIds.includes(p.id));
    if (!selected.length) return [];
    return elementalFractionTable(unifiedToFertilizerSpecs(selected), 'canonical');
  }, [ws.unified, ws.selectedIds]);

  const hasWandTarget = ws.solutionChosen || ws.profileSlug.length > 0 || ws.activeStep != null;
  const wandTargetReady = useMemo(
    () => hasUsableTargetPpm(ws.target as Record<string, number>),
    [ws.target],
  );
  const wandEmptyMessage = hasCalculatedMix
    ? null
    : !hasWandTarget
      ? strings.nutrient.wandNeedsSolution
      : !wandTargetReady
        ? strings.nutrient.wandEmptyTarget
        : ws.selectedIds.length === 0
          ? strings.nutrient.wandNeedsFertilizers
          : ws.computing
            ? strings.nutrient.wandComputing
            : strings.nutrient.wandNoDoses;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} horizontal={false}>
      <MobileAppUpdateBanner />
      <View style={styles.tabBarWrap} onTouchStart={() => revealTabScrollHint()}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
          scrollEventThrottle={16}
          onLayout={(event) => {
            syncTabScrollMetrics({ width: event.nativeEvent.layout.width });
          }}
          onContentSizeChange={(contentWidth) => {
            syncTabScrollMetrics({ contentWidth });
          }}
          onScrollBeginDrag={() => revealTabScrollHint()}
          onScrollEndDrag={() => hideTabScrollHintSoon()}
          onMomentumScrollEnd={() => hideTabScrollHintSoon()}
          onScroll={(event) => {
            const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
            syncTabScrollMetrics({
              offsetX: contentOffset.x,
              width: layoutMeasurement.width,
              contentWidth: contentSize.width,
            });
            revealTabScrollHint();
          }}
        >
          {TAB_IDS.map((id) => (
            <Pressable key={id} onPress={() => ws.setTab(id)} style={[styles.tab, ws.tab === id && styles.tabActive]}>
              <Text style={[styles.tabText, ws.tab === id && styles.tabTextActive]}>{tabLabel(id)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {showTabScrollHint ? (
          <View pointerEvents="none" style={[styles.tabScrollHint, { backgroundColor: colors.screen }]}>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={colors.textMuted}
              size={14}
            />
          </View>
        ) : null}
      </View>

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
              accessibilityLabel={ws.favoritesOnly ? strings.nutrient.favoritesShowAll : strings.nutrient.favoritesOnly}
            >
              <SymbolView
                name={
                  ws.favoritesOnly
                    ? { ios: 'list.bullet', android: 'list', web: 'list' }
                    : {
                        ios: hasFavorites ? 'star.fill' : 'star',
                        android: hasFavorites ? 'star' : 'star_border',
                        web: hasFavorites ? 'star' : 'star_border',
                      }
                }
                tintColor={ws.favoritesOnly || hasFavorites ? colors.primary : colors.textMuted}
                size={18}
              />
              <Text style={[styles.favFilterLabel, ws.favoritesOnly && styles.favFilterLabelOn]} numberOfLines={1}>
                {ws.favoritesOnly ? strings.nutrient.favoritesShowAll : strings.nutrient.favoritesOnly}
              </Text>
            </Pressable>
          </View>
          <View>
            <View style={[styles.fertRow, styles.fertHeadRow]}>
              {ws.selectedIds.length > 0 ? (
                <Pressable
                  style={styles.fertHeadCheck}
                  accessibilityRole="button"
                  accessibilityLabel={strings.nutrient.clearSelection}
                  onPress={() => ws.setSelectedIds([])}
                >
                  <SymbolView
                    name={{ ios: 'minus.square', android: 'indeterminate_check_box', web: 'indeterminate_check_box' }}
                    tintColor={colors.textMuted}
                    size={22}
                  />
                </Pressable>
              ) : (
                <View style={styles.fertHeadCheck} />
              )}
              <View style={styles.fertHeadName}>
                <Text style={[styles.fertHeadAlpha, styles.fertHeadActive]} numberOfLines={1}>
                  {strings.nutrient.fertilizerSortAlpha} ↑
                </Text>
              </View>
              {ws.favoriteIds.size > 0 ? (
                <Pressable
                  style={styles.fertHeadStar}
                  accessibilityRole="button"
                  accessibilityLabel={strings.nutrient.clearFavorites}
                  onPress={() => {
                    void onClearFavorites();
                  }}
                >
                  <SymbolView
                    name={{ ios: 'star.slash', android: 'star_border', web: 'star_border' }}
                    tintColor={colors.textMuted}
                    size={18}
                  />
                </Pressable>
              ) : (
                <View style={styles.fertHeadStar} />
              )}
            </View>
            {sortedFertilizers.map((p) => {
              const on = ws.selectedIds.includes(p.id);
              const fav = ws.favoriteIds.has(p.id);
              const expanded = expandedFertilizerId === p.id;
              const label = fertilizerLabel(
                p.brand,
                productDisplayName(p.external_key, p.name, displayLocale),
              );
              const toggleSelected = () =>
                ws.setSelectedIds((prev) => (on ? prev.filter((x) => x !== p.id) : [...prev, p.id]));
              return (
                <View key={p.id} style={styles.fertItem}>
                  <View style={styles.fertRow}>
                    <Pressable style={styles.fertCheck} onPress={toggleSelected}>
                      <SelectMark selected={on} kind="check" />
                    </Pressable>
                    <Pressable
                      style={styles.fertNamePress}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      accessibilityState={{ expanded }}
                      onPress={() => setExpandedFertilizerId((current) => (current === p.id ? null : p.id))}
                    >
                      <Text style={styles.fertName} numberOfLines={2} ellipsizeMode="tail">
                        {label}
                      </Text>
                      <Text style={[styles.fertDisclosure, expanded && styles.fertDisclosureOpen]}>
                        {expanded ? '▴' : '▾'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.fertStar}
                      accessibilityRole="button"
                      accessibilityLabel={strings.nutrient.toggleFavorite}
                      accessibilityState={{ selected: fav }}
                      onPress={() => {
                        void onToggleFavorite(p).catch(() => undefined);
                      }}
                    >
                      <SymbolView
                        name={{
                          ios: fav ? 'star.fill' : 'star',
                          android: fav ? 'star' : 'star_border',
                          web: fav ? 'star' : 'star_border',
                        }}
                        tintColor={fav ? colors.primary : colors.textMuted}
                        size={18}
                      />
                    </Pressable>
                  </View>
                  {expanded ? (
                    <FertilizerCompositionCard
                      lines={p.lines}
                      locale={displayLocale}
                      emptyLabel={strings.nutrient.fertilizerCompositionEmpty}
                      macrosLabel={strings.nutrient.fertilizerCompositionMacros}
                      microsLabel={strings.nutrient.fertilizerCompositionMicros}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
          {ws.favoritesOnly && ws.filteredUnified.length === 0 ? (
            <Text style={styles.lead}>{strings.nutrient.favoritesEmpty}</Text>
          ) : null}
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
          {ws.feedSystems.length === 0 ? (
            <Text style={styles.lead}>{strings.nutrient.feedSystemsEmpty}</Text>
          ) : null}
          {ws.feedSystems.map((s) => {
            const on = ws.activeSystemId === s.id;
            const steps = ws.stepsBySystem[s.id] ?? [];
            return (
              <View key={s.id}>
                <View style={styles.listRow}>
                  <Pressable style={styles.listRowMain} onPress={() => ws.chooseFeedSystem(s.id)}>
                    <SelectMark selected={on} kind="radio" />
                    <Text style={styles.listLabel} numberOfLines={1}>{s.name}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.feedSystemDeleteBtn}
                    accessibilityRole="button"
                    accessibilityLabel={strings.nutrient.recipeDelete}
                    onPress={() => confirmDeleteFeedSystem(s.id, s.name)}
                  >
                    <SymbolView
                      name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                      tintColor={colors.textMuted}
                      size={15}
                    />
                  </Pressable>
                </View>
                {on && steps.length > 1
                  ? steps.map((st) => {
                      const stepOn = ws.activeStepId === st.id;
                      const raw = (st.week_label ?? '').trim();
                      const numbered = /^w(\d+)$/i.exec(raw);
                      const label = numbered ? numbered[1] : raw || String(st.step_order);
                      return (
                        <Pressable
                          key={st.id}
                          style={[styles.listRow, styles.nestedRow]}
                          onPress={() => ws.chooseFeedStep(st.id)}
                        >
                          <SelectMark selected={stepOn} kind="radio" />
                          <Text style={styles.listLabel} numberOfLines={1}>
                            {strings.nutrient.feedSystemWeek.replace('{label}', label)}
                          </Text>
                        </Pressable>
                      );
                    })
                  : null}
              </View>
            );
          })}
          {ws.cycle?.id && ws.farmId && ws.activeSystemId ? (
            <View style={styles.sectionStack}>
              <Text style={styles.lead}>{strings.nutrient.attachCycleHint}</Text>
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
                <Text style={styles.btnText}>{strings.nutrient.attachCycle}</Text>
              </Pressable>
            </View>
          ) : null}
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

      {ws.tab === 'goals' && (
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
              {(() => {
                const hit = findWorkspaceTargetProfile(
                  ws.profileSlug,
                  ws.profiles,
                  ws.myTargetProfiles,
                );
                if (!hit) return '';
                return isGuestCustomTargetSlug(hit.slug) ? hit.name : shortProfileName(hit.name);
              })()}
            </Text>
          ) : null}
          <Text style={styles.lead}>{strings.nutrient.chooseSolutionHint}</Text>
          {targetOpen ? (
            <TargetProfileRadioList
              sections={ws.targetProfileSections}
              selectedSlug={ws.profileSlug}
              solutionChosen={ws.solutionChosen}
              sectionMineLabel={strings.nutrient.targetProfileMine}
              sectionCatalogLabel={strings.nutrient.targetProfileCatalog}
              formatLabel={shortProfileName}
              colors={colors}
              onSelect={(slug) => {
                ws.chooseSolution(slug);
                setTargetOpen(false);
              }}
            />
          ) : null}
          </View>
        </View>
      )}

      {ws.tab === 'solutions' && (
        <View style={styles.sectionStack}>
          {wandEmptyMessage || hasCalculatedMix ? (
            <View style={styles.card}>
              {wandEmptyMessage ? <Text style={styles.lead}>{wandEmptyMessage}</Text> : null}
              {hasCalculatedMix ? (
                <View style={styles.variantBlock}>
                  <Text style={styles.label}>{strings.nutrient.variantsHeading}</Text>
                  <SolutionVariantList
                    variants={variants}
                    target={ws.target as Record<string, number>}
                    volumeL={ws.volumeL}
                    saveMixLabel={
                      ws.isCloudSynced ? strings.nutrient.saveRecipe : strings.workspace.saveRecipeLocal
                    }
                    onSaveMix={ws.saveCurrentMix}
                    onSaveTarget={ws.saveCustomTargetProfile}
                    strings={{
                      composition: strings.nutrient.composition,
                      compositionMeta: strings.nutrient.compositionMeta,
                      variantBest: strings.nutrient.variantBest,
                      variantAlt: strings.nutrient.variantAlt,
                      elementTarget: strings.nutrient.elementTarget,
                      elementAchieved: strings.nutrient.elementAchieved,
                      elementDelta: strings.nutrient.elementDelta,
                      doseUnitMass: strings.nutrient.doseUnitMass,
                      doseUnitVolume: strings.nutrient.doseUnitVolume,
                      doseUnitMassShort: strings.nutrient.doseUnitMassShort,
                      doseUnitVolumeShort: strings.nutrient.doseUnitVolumeShort,
                      doseStockLine: strings.nutrient.doseStockLine,
                      doseTankLine: strings.nutrient.doseTankLine,
                      ecLine: strings.nutrient.ecLine,
                      wandSectionMix: strings.nutrient.wandSectionMix,
                      wandSectionTarget: strings.nutrient.wandSectionTarget,
                      recipeName: strings.nutrient.recipeName,
                      saveMixDone: strings.nutrient.saveMixDone,
                      error: strings.commonMobile.error,
                      saveTargetProfileName: strings.nutrient.saveTargetProfileName,
                      saveTargetProfile: strings.nutrient.saveTargetProfile,
                      saveTargetProfileDone: strings.nutrient.saveTargetProfileDone,
                      saveTargetProfileNeedMix: strings.nutrient.saveTargetProfileNeedMix,
                    }}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

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

    </ScrollView>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    screen: { backgroundColor: c.screen },
    container: { padding: 16, paddingBottom: 120, gap: 12 },
    sectionStack: { gap: 12 },
    variantBlock: { gap: 10 },
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
    tabBarWrap: { position: 'relative' },
    tabs: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
    tabScrollHint: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 8,
      width: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopLeftRadius: 10,
      borderBottomLeftRadius: 10,
    },
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
      gap: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
    },
    listRowMain: {
      flex: 1,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    feedSystemDeleteBtn: {
      width: 32,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listLabel: { flex: 1, fontSize: 16, color: c.text },
    nestedRow: { paddingLeft: 28 },
    fertItem: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
    },
    fertRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
    },
    fertHeadRow: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
    },
    fertCheck: { width: 40, minHeight: 44, alignItems: 'flex-start', justifyContent: 'center' },
    fertHeadCheck: {
      width: 40,
      alignSelf: 'stretch',
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    fertHeadStar: {
      width: FERTILIZER_STAR_WIDTH,
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fertNamePress: {
      flex: 1,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingRight: 4,
    },
    fertName: { flex: 1, fontSize: 15, lineHeight: 19, color: c.text },
    fertDisclosure: {
      width: 22,
      fontSize: 20,
      lineHeight: 22,
      textAlign: 'center',
      color: c.textMuted,
    },
    fertDisclosureOpen: { color: c.primary },
    fertStar: {
      width: FERTILIZER_STAR_WIDTH,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fertHeadName: { flex: 1, minHeight: 28, justifyContent: 'center', paddingRight: 4 },
    fertHeadAlpha: { fontSize: 12, fontWeight: '700', color: c.textMuted },
    fertHeadActive: { color: c.primary },
    fertComposition: {
      backgroundColor: c.screen,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingTop: 4,
      paddingBottom: 8,
      marginBottom: 8,
      gap: 2,
    },
    fertCompositionHeading: {
      fontSize: 12,
      fontWeight: '700',
      color: c.sectionLabel,
      marginTop: 6,
      marginBottom: 2,
    },
    fertCompositionRow: {
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    fertCompositionName: { flex: 1, fontSize: 14, lineHeight: 18, color: c.text },
    fertCompositionValue: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '600',
      color: c.text,
      fontVariant: ['tabular-nums'],
    },
    fertCompositionEmpty: {
      fontSize: 14,
      lineHeight: 18,
      color: c.textMuted,
      marginBottom: 8,
      paddingHorizontal: 12,
    },
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
    favFilterOn: {
      backgroundColor: c.rowActiveBg,
      borderWidth: 1,
      borderColor: c.primary,
      paddingHorizontal: 8,
    },
    favFilterLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted, lineHeight: 14 },
    favFilterLabelOn: { color: c.primary },
    volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    volumeInput: { flex: 1 },
    iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    meta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    btn: { backgroundColor: c.primary, padding: 12, borderRadius: 10, alignItems: 'center' },
    btnOutline: { borderWidth: 1, borderColor: c.border, padding: 10, borderRadius: 8, alignItems: 'center' },
    btnOutlineText: { color: c.text },
    btnText: { color: c.primaryText, fontWeight: '600' },
    rowActions: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  });
}
