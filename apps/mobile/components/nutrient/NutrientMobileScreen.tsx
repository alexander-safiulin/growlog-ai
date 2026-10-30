import { useMobileLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import type { MobileThemeColors } from '@/lib/mobile-theme';
import { useThemedStyles } from '@/lib/use-themed-styles';
import {
  TAB_IDS,
  useMobileNutrientWorkspace,
} from '@/components/nutrient/useMobileNutrientWorkspace';
import {
  deleteFarmFertilizerProduct,
  deleteNutrientRecipe,
  duplicateNutrientRecipe,
  renameNutrientRecipe,
  saveFarmFertilizerProduct,
  setGrowCycleNutrientPlan,
  clearNutrientFavorites,
  toggleNutrientFavorite,
} from '@growlog/domain';
import { elementalFractionTable } from '@growlog/nutrient-calc';
import { formatNutrientPercent } from '@growlog/web-lib/nutrient/format-nutrient-amount';
import { unifiedToFertilizerSpecs } from '@growlog/web-lib/nutrient/unified-products';
import { productDisplayName } from '@growlog/web-lib/nutrient/product-display-names';
import { elementMassAndValence } from '@growlog/web-lib/nutrient/element-reference';
import { solutionElementPanorama } from '@growlog/web-lib/nutrient/solution-element-panorama';
import { NutrientHelpSheet } from '@/components/nutrient/NutrientHelpSheet';
import { SolutionElementPanorama } from '@/components/nutrient/SolutionElementPanorama';
import { findWorkspaceTargetProfile, isGuestCustomTargetSlug } from '@growlog/web-lib/nutrient/custom-target-profile';
import { hasUsableTargetPpm } from '@growlog/web-lib/nutrient/save-custom-target-profile';
import { listSolutionVariants } from '@growlog/web-lib/nutrient/workspace/mobile-result';
import { SolutionVariantList, MixFavoriteList } from '@/components/nutrient/SolutionVariantList';
import {
  unpublishedCompositionNames,
  unpublishedCompositionNote,
} from '@growlog/web-lib/nutrient/unpublished-composition';
import { TargetProfileRadioList } from '@/components/nutrient/TargetProfileRadioList';
import { clearGuestFavorites, applyGuestCompositionEdit, toggleGuestFavorite } from '@growlog/web-lib/nutrient/guest/guest-workspace-actions';
import {
  catalogOverrideExternalKey,
  COMPOSITION_EDITED,
  compositionLinesEqual,
  compositionLinesFromDraft,
  OVERRIDES_CATALOG_PRODUCT_ID,
  parseCompositionPct,
} from '@growlog/web-lib/nutrient/fertilizer-composition-override';
import type { UnifiedProduct } from '@growlog/web-lib/nutrient/unified-products';
import { WaterProfilePanel } from '@/components/nutrient/WaterProfilePanel';
import { MobileAppUpdateBanner } from '@/components/nutrient/MobileAppUpdateBanner';
import { loadNutrientGuestStoreMobile, saveNutrientGuestStoreMobile } from '@/lib/nutrient-guest-storage';
import {
  compositionEditorKeys,
  compositionElementLabel,
  compositionGroups,
  formatCompositionInput,
  MACRO_FORMS,
  MICRO_FORMS,
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

function initialCompositionDraft(lines: Array<{ form_key: string; value_pct: number }>): Record<string, string> {
  const groups = compositionGroups(lines);
  const pct: Record<string, string> = {};
  for (const row of [...groups.macros, ...groups.micros, ...groups.other]) {
    pct[row.key] = formatCompositionInput(row.pct);
  }
  return pct;
}

function FertilizerCompositionEditor({
  lines,
  locale,
  emptyLabel,
  macrosLabel,
  microsLabel,
  addLabel,
  saveLabel,
  onSave,
}: {
  lines: Array<{ form_key: string; value_pct: number; n_form?: string | null }>;
  locale: string;
  emptyLabel: string;
  macrosLabel: string;
  microsLabel: string;
  addLabel: string;
  saveLabel: string;
  onSave: (lines: Array<{ form_key: string; value_pct: number; n_form?: string | null }>) => Promise<void>;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const savingRef = useRef(false);
  const [pct, setPct] = useState(() => initialCompositionDraft(lines));
  const [showEmpty, setShowEmpty] = useState(() => {
    const groups = compositionGroups(lines);
    return groups.macros.length === 0 && groups.micros.length === 0 && groups.other.length === 0;
  });
  const keys = compositionEditorKeys(lines, showEmpty);
  const sections = [
    { label: macrosLabel, keys: keys.macros },
    { label: microsLabel, keys: keys.micros },
  ].filter((section) => section.keys.length > 0);
  const draftLines = compositionLinesFromDraft(pct, lines);
  const dirty = !compositionLinesEqual(draftLines, lines);

  const submit = () => {
    if (!dirty || savingRef.current) return;
    savingRef.current = true;
    void onSave(draftLines).finally(() => {
      savingRef.current = false;
    });
  };

  return (
    <View style={styles.fertComposition}>
      {sections.length === 0 ? <Text style={styles.fertCompositionEmpty}>{emptyLabel}</Text> : null}
      {sections.map((section) => (
        <View key={section.label}>
          <Text style={styles.fertCompositionHeading}>{section.label}</Text>
          {section.keys.map((key) => {
            const label = compositionElementLabel(key, locale);
            return (
              <View key={key} style={styles.fertCompositionEditRow}>
                <Text style={styles.fertCompositionName}>{label}</Text>
                <TextInput
                  style={styles.draftPct}
                  accessibilityLabel={label}
                  keyboardType="decimal-pad"
                  keyboardAppearance={colors.keyboardAppearance}
                  placeholder="0"
                  placeholderTextColor={colors.placeholder}
                  value={pct[key] ?? ''}
                  onChangeText={(value) => setPct((current) => ({ ...current, [key]: value }))}
                />
                <Text style={styles.fertCompositionValue}>%</Text>
              </View>
            );
          })}
        </View>
      ))}
      {!showEmpty ? (
        <Pressable
          style={styles.compositionAdd}
          accessibilityRole="button"
          onPress={() => setShowEmpty(true)}
        >
          <Text style={styles.compositionAddText}>{addLabel}</Text>
        </Pressable>
      ) : null}
      {dirty ? (
        <Pressable style={styles.btn} accessibilityRole="button" onPress={submit}>
          <Text style={styles.btnText}>{saveLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FertilizerDraftCard({
  locale,
  namePlaceholder,
  macrosLabel,
  microsLabel,
  massLabel,
  volumeLabel,
  saveLabel,
  cancelLabel,
  missingLabel,
  onSave,
  onCancel,
}: {
  locale: string;
  namePlaceholder: string;
  macrosLabel: string;
  microsLabel: string;
  massLabel: string;
  volumeLabel: string;
  saveLabel: string;
  cancelLabel: string;
  missingLabel: string;
  onSave: (input: {
    name: string;
    physicalForm: 'solid' | 'liquid';
    lines: Array<{ form_key: string; value_pct: number }>;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const savingRef = useRef(false);
  const [name, setName] = useState('');
  const [physicalForm, setPhysicalForm] = useState<'solid' | 'liquid'>('solid');
  const [pct, setPct] = useState<Record<string, string>>({});
  const [showMissing, setShowMissing] = useState(false);
  const sections = [
    { label: macrosLabel, keys: MACRO_FORMS },
    { label: microsLabel, keys: MICRO_FORMS },
  ];

  const submit = () => {
    const lines = [...MACRO_FORMS, ...MICRO_FORMS].flatMap((key) => {
      const value = parseCompositionPct(pct[key] ?? '');
      return value == null ? [] : [{ form_key: key, value_pct: value }];
    });
    if (!name.trim() || lines.length === 0) {
      setShowMissing(true);
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    void onSave({ name: name.trim(), physicalForm, lines }).finally(() => {
      savingRef.current = false;
    });
  };

  return (
    <View style={styles.fertItem}>
      <TextInput
        style={styles.input}
        placeholder={namePlaceholder}
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={colors.keyboardAppearance}
        value={name}
        onChangeText={setName}
      />
      <View style={styles.draftUnitRow}>
        <Pressable
          style={[styles.draftUnit, physicalForm === 'solid' && styles.draftUnitOn]}
          accessibilityRole="button"
          accessibilityState={{ selected: physicalForm === 'solid' }}
          onPress={() => setPhysicalForm('solid')}
        >
          <Text style={[styles.draftUnitText, physicalForm === 'solid' && styles.draftUnitTextOn]}>{massLabel}</Text>
        </Pressable>
        <Pressable
          style={[styles.draftUnit, physicalForm === 'liquid' && styles.draftUnitOn]}
          accessibilityRole="button"
          accessibilityState={{ selected: physicalForm === 'liquid' }}
          onPress={() => setPhysicalForm('liquid')}
        >
          <Text style={[styles.draftUnitText, physicalForm === 'liquid' && styles.draftUnitTextOn]}>{volumeLabel}</Text>
        </Pressable>
      </View>
      <View style={styles.fertComposition}>
        {sections.map((section) => (
          <View key={section.label}>
            <Text style={styles.fertCompositionHeading}>{section.label}</Text>
            {section.keys.map((key) => {
              const label = compositionElementLabel(key, locale);
              return (
                <View key={key} style={styles.fertCompositionRow}>
                  <Text style={styles.fertCompositionName}>{label}</Text>
                  <TextInput
                    style={styles.draftPct}
                    accessibilityLabel={label}
                    keyboardType="decimal-pad"
                    keyboardAppearance={colors.keyboardAppearance}
                    placeholder="0"
                    placeholderTextColor={colors.placeholder}
                    value={pct[key] ?? ''}
                    onChangeText={(value) => setPct((current) => ({ ...current, [key]: value }))}
                  />
                  <Text style={styles.fertCompositionValue}>%</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      {showMissing ? <Text style={styles.fertCompositionEmpty}>{missingLabel}</Text> : null}
      <View style={styles.draftActions}>
        <Pressable style={styles.btn} accessibilityRole="button" onPress={submit}>
          <Text style={styles.btnText}>{saveLabel}</Text>
        </Pressable>
        <Pressable style={styles.btnOutline} accessibilityRole="button" onPress={onCancel}>
          <Text style={styles.btnOutlineText}>{cancelLabel}</Text>
        </Pressable>
      </View>
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
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [targetOpen, setTargetOpen] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [mixFavoritesOpen, setMixFavoritesOpen] = useState(false);
  const [volumeNote, setVolumeNote] = useState<string | null>(null);
  const [showTabScrollHint, setShowTabScrollHint] = useState(false);
  const tabScrollMetrics = useRef({ width: 0, contentWidth: 0, offsetX: 0 });
  const tabScrollHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFavorites = ws.favoriteIds.size > 0;
  const favFilterLabelMinWidth = useMemo(
    () =>
      Math.max(
        strings.nutrient.favoritesOnly.length,
        strings.nutrient.favoritesShowAll.length,
      ) * 7.5,
    [strings.nutrient.favoritesOnly, strings.nutrient.favoritesShowAll],
  );
  const mixFavorites = ws.mixFavorites ?? [];
  const [expandedFertilizerId, setExpandedFertilizerId] = useState<string | null>(null);
  const [fertilizerDraftOpen, setFertilizerDraftOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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

  useEffect(() => {
    if (mixFavorites.length === 0) setMixFavoritesOpen(false);
  }, [mixFavorites.length]);

  function confirmClearMixFavorites() {
    Alert.alert(strings.nutrient.mixFavoritesClear, strings.nutrient.mixFavoritesClearBody, [
      { text: strings.commonMobile.cancel, style: 'cancel' },
      {
        text: strings.nutrient.mixFavoritesClear,
        style: 'destructive',
        onPress: () => void ws.clearMixFavorites(),
      },
    ]);
  }

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

  async function saveDraftFertilizer(input: {
    name: string;
    physicalForm: 'solid' | 'liquid';
    lines: Array<{ form_key: string; value_pct: number }>;
  }) {
    if (!ws.farmId) return;
    try {
      await saveFarmFertilizerProduct(ws.supabase, {
        farmId: ws.farmId,
        userId: ws.userId,
        externalKey: `farm:${Date.now()}`,
        brand: '',
        name: input.name,
        physicalForm: input.physicalForm,
        doseUnit: input.physicalForm === 'liquid' ? 'ml_per_L' : 'g_per_L',
        lines: input.lines,
      });
      setFertilizerDraftOpen(false);
      await ws.reload();
    } catch {
      Alert.alert(strings.commonMobile.error);
    }
  }

  async function saveFertilizerComposition(
    product: UnifiedProduct,
    lines: Array<{ form_key: string; value_pct: number; n_form?: string | null }>,
  ) {
    const source = product.sourceLines ?? product.lines;
    const revertOverride = product.scope === 'catalog' && compositionLinesEqual(lines, source);
    const density = product.density_g_per_ml ?? null;
    const labelBasis = product.label_basis ?? null;
    const metadata: Record<string, unknown> = { ...(product.metadata ?? {}) };
    if (!ws.isCloudSynced) {
      const store = await loadNutrientGuestStoreMobile();
      await saveNutrientGuestStoreMobile(
        applyGuestCompositionEdit(store, {
          scope: product.scope,
          unifiedId: product.id,
          overrideId: product.compositionOverrideId,
          externalKey: product.scope === 'catalog' ? catalogOverrideExternalKey(product.id) : product.external_key,
          brand: product.brand,
          name: product.name,
          physicalForm: product.physical_form,
          doseUnit: product.dose_unit,
          densityGPerMl: density,
          labelBasis,
          metadata,
          lines,
          revertOverride,
        }),
      );
      await ws.reload();
      return;
    }
    if (!ws.farmId) return;
    try {
      if (product.scope === 'catalog') {
        if (revertOverride) {
          if (product.compositionOverrideId) {
            await deleteFarmFertilizerProduct(ws.supabase, ws.farmId, product.compositionOverrideId);
          }
        } else {
          await saveFarmFertilizerProduct(ws.supabase, {
            farmId: ws.farmId,
            userId: ws.userId,
            id: product.compositionOverrideId,
            externalKey: catalogOverrideExternalKey(product.id),
            brand: product.brand,
            name: product.name,
            physicalForm: product.physical_form,
            doseUnit: product.dose_unit,
            densityGPerMl: density,
            labelBasis,
            nTotalIncludesForms: Boolean(metadata.n_total_includes_forms),
            metadata: {
              ...metadata,
              [OVERRIDES_CATALOG_PRODUCT_ID]: product.id,
              [COMPOSITION_EDITED]: true,
            },
            matchExternalKey: true,
            lines,
          });
        }
      } else {
        const id = product.id.replace(/^farm:/, '');
        const nextMeta: Record<string, unknown> = { ...metadata, [COMPOSITION_EDITED]: true };
        delete nextMeta[OVERRIDES_CATALOG_PRODUCT_ID];
        await saveFarmFertilizerProduct(ws.supabase, {
          farmId: ws.farmId,
          userId: ws.userId,
          id,
          externalKey: product.external_key,
          brand: product.brand,
          name: product.name,
          physicalForm: product.physical_form,
          doseUnit: product.dose_unit,
          densityGPerMl: density,
          labelBasis,
          nTotalIncludesForms: Boolean(metadata.n_total_includes_forms),
          metadata: nextMeta,
          lines,
        });
      }
      await ws.reload();
    } catch {
      Alert.alert(strings.commonMobile.error);
    }
  }

  const tabLabel = (id: (typeof TAB_IDS)[number]) => strings.nutrient.tabs[id];

  const variants = useMemo(() => (ws.result ? listSolutionVariants(ws.result) : []), [ws.result]);
  const fertilizerSpecs = useMemo(() => unifiedToFertilizerSpecs(ws.unified), [ws.unified]);
  const showMixVariants = useMemo(
    () => variants.some((solution) => solution.doses.length > 0),
    [variants],
  );
  const unpublishedNote = useMemo(() => {
    if (!showMixVariants) return null;
    const names = unpublishedCompositionNames(ws.unified, ws.selectedIds, locale);
    return unpublishedCompositionNote(locale, names);
  }, [showMixVariants, ws.unified, ws.selectedIds, locale]);

  const fractionRows = useMemo(() => {
    const selected = ws.unified.filter((p) => ws.selectedIds.includes(p.id));
    if (!selected.length) return [];
    return elementalFractionTable(unifiedToFertilizerSpecs(selected), 'canonical');
  }, [ws.unified, ws.selectedIds]);

  const solutionTiles = useMemo(() => {
    const achieved = ws.result?.best?.achievedPpm;
    if (!achieved) return [];
    return solutionElementPanorama({
      target: (ws.target ?? {}) as Record<string, number>,
      achieved: achieved as Record<string, number>,
    });
  }, [ws.result, ws.target]);

  const hasWandTarget = ws.solutionChosen || ws.profileSlug.length > 0 || ws.activeStep != null;
  const wandTargetReady = useMemo(
    () => hasUsableTargetPpm(ws.target as Record<string, number>),
    [ws.target],
  );
  const wandEmptyMessage = showMixVariants
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

  const variantStrings = {
    composition: strings.nutrient.composition,
    compositionMeta: strings.nutrient.compositionMeta,
    saltOne: strings.nutrient.saltOne,
    saltFew: strings.nutrient.saltFew,
    saltMany: strings.nutrient.saltMany,
    variantsOnlyOne: strings.nutrient.variantsOnlyOne,
    assembleShort: strings.nutrient.assembleShort,
    assembleBlocked: strings.nutrient.assembleBlocked,
    assembleBlockedMulti: strings.nutrient.assembleBlockedMulti,
    assembleMissing: strings.nutrient.assembleMissing,
    assembleFloor: strings.nutrient.assembleFloor,
    nitrogenFormGap: strings.nutrient.nitrogenFormGap,
    mixFavoriteAdd: strings.nutrient.mixFavoriteAdd,
    mixFavoriteRemove: strings.nutrient.mixFavoriteRemove,
    mixFavoritesClear: strings.nutrient.mixFavoritesClear,
    mixFavoritesHint: strings.nutrient.mixFavoritesHint,
    mixFavoriteRename: strings.nutrient.recipeRename,
    manualDose: strings.nutrient.manualDose,
    variantBest: strings.nutrient.variantBest,
    variantAlt: strings.nutrient.variantAlt,
    elementTarget: strings.nutrient.elementTarget,
    elementAchieved: strings.nutrient.elementAchieved,
    elementDelta: strings.nutrient.elementDelta,
    elementNUnknown: strings.nutrient.elementNUnknown,
    doseUnitMass: strings.nutrient.doseUnitMass,
    doseUnitVolume: strings.nutrient.doseUnitVolume,
    doseUnitMassShort: strings.nutrient.doseUnitMassShort,
    doseUnitVolumeShort: strings.nutrient.doseUnitVolumeShort,
    doseStockLine: strings.nutrient.doseStockLine,
    doseTankLine: strings.nutrient.doseTankLine,
    ecLine: strings.nutrient.ecLine,
    wandSectionMix: strings.nutrient.wandSectionMix,
    wandSectionTarget: strings.nutrient.wandSectionTarget,
    save: strings.nutrient.save,
    recipeName: strings.nutrient.recipeName,
    saveMixDone: strings.nutrient.saveMixDone,
    error: strings.commonMobile.error,
    saveTargetProfileName: strings.nutrient.saveTargetProfileName,
    saveTargetProfileDone: strings.nutrient.saveTargetProfileDone,
    saveTargetProfileNeedMix: strings.nutrient.saveTargetProfileNeedMix,
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerChrome}>
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
      </View>
      <NutrientHelpSheet visible={helpOpen} onClose={() => setHelpOpen(false)} />

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.container}
        horizontal={false}
        nestedScrollEnabled
      >
      {ws.tab === 'fertilizers' && (
        <View style={styles.card}>
          {!fertilizerDraftOpen ? (
            <View style={styles.searchRow}>
              <View style={styles.searchRowMain}>
                <TextInput
                  style={[styles.input, styles.searchInput]}
                  placeholder={strings.nutrient.searchFertilizers}
                  placeholderTextColor={colors.placeholder}
                  keyboardAppearance={colors.keyboardAppearance}
                  value={ws.search}
                  onChangeText={ws.setSearch}
                />
              </View>
              {ws.farmId ? (
                <Pressable
                  style={styles.fertStar}
                  accessibilityRole="button"
                  accessibilityLabel={strings.nutrient.newFarmProduct}
                  onPress={() => {
                    setExpandedFertilizerId(null);
                    setFertilizerDraftOpen(true);
                  }}
                >
                  <SymbolView
                    name={{ ios: 'plus', android: 'add', web: 'add' }}
                    tintColor={colors.primary}
                    size={22}
                  />
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {ws.farmId && fertilizerDraftOpen ? (
            <FertilizerDraftCard
              locale={displayLocale}
              namePlaceholder={strings.nutrient.fertilizerName}
              macrosLabel={strings.nutrient.fertilizerCompositionMacros}
              microsLabel={strings.nutrient.fertilizerCompositionMicros}
              massLabel={strings.nutrient.doseUnitMass}
              volumeLabel={strings.nutrient.doseUnitVolume}
              saveLabel={strings.nutrient.save}
              cancelLabel={strings.commonMobile.cancel}
              missingLabel={strings.nutrient.fertilizerDraftMissing}
              onSave={saveDraftFertilizer}
              onCancel={() => setFertilizerDraftOpen(false)}
            />
          ) : null}
          <View>
            {(!fertilizerDraftOpen || ws.selectedIds.length > 0 || hasFavorites) && (
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
                  {!fertilizerDraftOpen ? (
                    <Pressable
                      style={[styles.favFilter, styles.fertHeadFilter]}
                      onPress={() => ws.setFavoritesOnly(!ws.favoritesOnly)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: ws.favoritesOnly }}
                      accessibilityLabel={ws.favoritesOnly ? strings.nutrient.favoritesShowAll : strings.nutrient.favoritesOnly}
                    >
                      <View style={styles.favFilterIconSlot}>
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
                          tintColor={hasFavorites ? colors.primary : colors.textMuted}
                          size={18}
                          weight="medium"
                        />
                      </View>
                      <Text
                        style={[
                          styles.favFilterLabel,
                          styles.fertHeadFilterLabel,
                          { minWidth: favFilterLabelMinWidth },
                        ]}
                        numberOfLines={1}
                      >
                        {ws.favoritesOnly ? strings.nutrient.favoritesShowAll : strings.nutrient.favoritesOnly}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                {hasFavorites ? (
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
            )}
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
                      accessibilityLabel={
                        p.compositionEdited ? `${label}, ${strings.nutrient.compositionEdited}` : label
                      }
                      accessibilityState={{ expanded }}
                      onPress={() => setExpandedFertilizerId((current) => (current === p.id ? null : p.id))}
                    >
                      <Text style={styles.fertName} numberOfLines={2} ellipsizeMode="tail">
                        {label}
                      </Text>
                      {p.compositionEdited ? (
                        <Text style={styles.editedBadge}>{strings.nutrient.compositionEdited}</Text>
                      ) : null}
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
                    <FertilizerCompositionEditor
                      lines={p.lines}
                      locale={displayLocale}
                      emptyLabel={strings.nutrient.fertilizerCompositionEmpty}
                      macrosLabel={strings.nutrient.fertilizerCompositionMacros}
                      microsLabel={strings.nutrient.fertilizerCompositionMicros}
                      addLabel={strings.nutrient.fertilizerCompositionAdd}
                      saveLabel={strings.nutrient.save}
                      onSave={(lines) => saveFertilizerComposition(p, lines)}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
          {ws.favoritesOnly && ws.filteredUnified.length === 0 ? (
            <Text style={styles.lead}>{strings.nutrient.favoritesEmpty}</Text>
          ) : null}
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
        <WaterProfilePanel
          profiles={ws.waterProfiles}
          activeId={ws.activeWaterId}
          onSelect={ws.selectWaterProfile}
          isCloudSynced={ws.isCloudSynced}
          farmId={ws.farmId}
          userId={ws.userId}
          supabase={ws.supabase}
          reload={ws.reload}
          copy={strings.nutrient.waterProfile}
          saveLabel={strings.nutrient.save}
          cancelLabel={strings.more.cancel}
          errorLabel={strings.commonMobile.error}
        />
      )}

      {ws.tab === 'elements' && (
        <View style={styles.sectionStack}>
          <SolutionElementPanorama tiles={solutionTiles} />
          <View style={styles.card}>
          <View>
            <View style={styles.elementHead}>
              <View style={styles.elementFormula} />
              <View style={styles.elementName} />
              <Text
                style={[styles.elementMass, styles.elementHeadLabel]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {strings.nutrient.elementMass}
              </Text>
              <Text
                style={[styles.elementValence, styles.elementHeadLabel]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {strings.nutrient.elementValence}
              </Text>
            </View>
            {(ws.catalog.elements ?? []).map((el) => {
              const ref = elementMassAndValence(el.symbol);
              const mass = el.atomic_mass ?? ref.atomic_mass ?? '—';
              const valence = el.valence ?? ref.valence ?? '—';
              return (
                <View key={el.symbol} style={styles.listRow}>
                  <View style={styles.elementFormula}>
                    <Text style={styles.elementSymbol} numberOfLines={1}>
                      {el.symbol}
                    </Text>
                  </View>
                  <Text style={[styles.listLabel, styles.elementName]} numberOfLines={1}>
                    {el.display_name ?? el.symbol}
                  </Text>
                  <Text style={styles.elementMass} numberOfLines={1}>{mass}</Text>
                  <Text style={styles.elementValence} numberOfLines={1}>{valence}</Text>
                </View>
              );
            })}
          </View>
          </View>
          {fractionRows.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.label}>{strings.nutrient.elementFractions}</Text>
              {fractionRows.map((row, i) => (
                <View key={`${row.fertilizerId}-${row.element}-${i}`} style={styles.fractionRow}>
                  <Text style={styles.fractionName} numberOfLines={2}>{row.name}</Text>
                  <Text style={styles.fractionElement}>{row.element}</Text>
                  <Text style={styles.fractionPct}>{formatNutrientPercent(row.pctInProduct)}%</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      )}

      {ws.tab === 'solutions' && (
        <View style={styles.sectionStack}>
          <Pressable onPress={() => setHelpOpen(true)} accessibilityRole="button" style={styles.helpLink}>
            <Text style={styles.helpLinkText}>{strings.nutrient.helpOpen}</Text>
          </Pressable>
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
            {targetOpen ? <Text style={styles.lead}>{strings.nutrient.chooseSolutionHint}</Text> : null}
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

          <View style={styles.card}>
            <Pressable
              style={styles.targetHeader}
              onPress={() => setVolumeOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: volumeOpen }}
            >
              <Text style={styles.targetTitle}>
                {volumeOpen ? '▾' : '▸'} {strings.nutrient.stepVolume}
              </Text>
            </Pressable>
            <Text style={styles.meta}>{`${ws.volumeL} L`}</Text>
            {volumeOpen ? (
              <>
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
              </>
            ) : null}
          </View>

          {wandEmptyMessage || showMixVariants || mixFavorites.length > 0 ? (
            <View style={styles.card}>
              {wandEmptyMessage ? <Text style={styles.lead}>{wandEmptyMessage}</Text> : null}
              {showMixVariants || mixFavorites.length > 0 ? (
                <View style={styles.variantBlock}>
                  <View style={styles.variantHeading}>
                    <Text style={[styles.label, styles.variantHeadingLabel]}>{strings.nutrient.variantsHeading}</Text>
                    {mixFavorites.length > 0 ? (
                      <Pressable
                        style={[styles.favFilter, mixFavoritesOpen && styles.favFilterOn]}
                        onPress={() => setMixFavoritesOpen((open) => !open)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: mixFavoritesOpen }}
                        accessibilityLabel={strings.nutrient.mixFavoritesLabel}
                      >
                        <SymbolView
                          name={{ ios: 'star.fill', android: 'star', web: 'star' }}
                          tintColor={colors.primary}
                          size={16}
                        />
                        <Text style={[styles.favFilterLabel, styles.favFilterLabelOn]} numberOfLines={1}>
                          {strings.nutrient.mixFavoritesLabel}
                        </Text>
                        <Text style={styles.optionalMark}>{mixFavorites.length}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {showMixVariants && !mixFavoritesOpen ? (
                    <SolutionVariantList
                      variants={variants}
                      target={ws.target as Record<string, number>}
                      volumeL={ws.volumeL}
                      fertilizers={fertilizerSpecs}
                      unpublishedNote={unpublishedNote}
                      listLocale={locale === 'my' ? 'en' : locale}
                      mixFavorites={mixFavorites}
                      onToggleMixFavorite={(draft) => void ws.toggleMixFavorite(draft)}
                      onSaveMix={ws.saveCurrentMix}
                      onSaveTarget={ws.saveCustomTargetProfile}
                      strings={variantStrings}
                    />
                  ) : null}
                  {mixFavoritesOpen ? (
                    <MixFavoriteList
                      favorites={mixFavorites}
                      strings={variantStrings}
                      onRemove={(id) => void ws.removeMixFavorite(id)}
                      onRename={(id, label) => void ws.renameMixFavorite(id, label)}
                      onClear={confirmClearMixFavorites}
                      onSaveMix={ws.saveCurrentMix}
                      onSaveTarget={ws.saveCustomTargetProfile}
                    />
                  ) : null}
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
    </View>
  );
}

function makeStyles(c: MobileThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.screen },
    headerChrome: { paddingHorizontal: 16, paddingTop: 8 },
    helpLink: { alignSelf: 'flex-start', paddingVertical: 8 },
    helpLinkText: { color: c.primary, fontSize: 14 },
    body: { flex: 1 },
    container: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120, gap: 12 },
    sectionStack: { gap: 12 },
    variantBlock: { gap: 10 },
    variantHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    variantHeadingLabel: { flex: 1 },
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
    fertHeadName: {
      flex: 1,
      minWidth: 0,
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingRight: 4,
    },
    fertHeadFilter: { flexShrink: 1, maxWidth: '100%' },
    favFilterIconSlot: {
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fertHeadFilterLabel: { flexShrink: 1 },
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
    fertCompositionEditRow: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    compositionAdd: { minHeight: 36, justifyContent: 'center', marginTop: 4 },
    compositionAddText: { fontSize: 14, fontWeight: '600', color: c.primary },
    editedBadge: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
      color: c.primary,
      borderWidth: 1,
      borderColor: c.primary,
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 2,
      overflow: 'hidden',
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
    draftUnitRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 },
    draftUnit: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    draftUnitOn: { backgroundColor: c.primary, borderColor: c.primary },
    draftUnitText: { fontSize: 13, fontWeight: '600', color: c.text },
    draftUnitTextOn: { color: c.primaryText },
    draftPct: {
      width: 72,
      minHeight: 36,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      color: c.text,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 8,
      fontSize: 14,
      textAlign: 'right',
    },
    draftActions: { gap: 8, marginBottom: 8 },
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
    elementHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingBottom: 2,
    },
    elementHeadLabel: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600',
      color: c.textMuted,
    },
    elementFormula: { flexShrink: 0, minWidth: 56, alignItems: 'flex-start' },
    elementName: { flex: 1, minWidth: 0 },
    elementSymbol: {
      flexShrink: 0,
      fontSize: 15,
      lineHeight: 18,
      fontWeight: '700',
      color: c.text,
    },
    elementMass: {
      width: 64,
      flexShrink: 0,
      textAlign: 'right',
      fontSize: 13,
      lineHeight: 18,
      color: c.textMuted,
      fontVariant: ['tabular-nums'],
    },
    elementValence: {
      width: 58,
      flexShrink: 0,
      textAlign: 'right',
      fontSize: 13,
      lineHeight: 18,
      color: c.textMuted,
      fontVariant: ['tabular-nums'],
    },
    fractionRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
    },
    fractionName: { flex: 1, fontSize: 15, lineHeight: 20, color: c.text },
    fractionElement: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: c.text },
    fractionPct: {
      width: 72,
      textAlign: 'right',
      fontSize: 15,
      lineHeight: 20,
      color: c.text,
      fontVariant: ['tabular-nums'],
    },
    rowText: { fontSize: 15, color: c.text },
    lead: { fontSize: 15, lineHeight: 21, color: c.textMuted },
    searchRow: { flexDirection: 'row', alignItems: 'center' },
    searchRowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
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
