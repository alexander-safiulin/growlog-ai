'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { mapDbProfileToTarget, type SolveForwardResult } from '@growlog/nutrient-calc';
import {
  getGrowCycleNutrientPlan,
  listFarmFeedSystemSteps,
  listFarmFeedSystems,
  listFarmFertilizerLines,
  listFarmFertilizers,
  listFarmNutrientRecipes,
  listFarmWaterProfiles,
  listNutrientFavorites,
  type FarmFeedSystemRow,
  type FarmFeedSystemStepRow,
  type FarmFertilizerRow,
  type GrowCycleNutrientPlanRow,
  type NutrientSolutionKind,
  fetchEventsByIds,
  fetchFarmMemberDisplayNames,
  fetchGrowCyclesForFarm,
} from '@growlog/domain';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import type { NutrientTabId } from '@/components/nutrient/NutrientCalculatorApp';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import { defaultNutrientWorkspaceProductIds } from '@/lib/nutrient/default-fertilizers';
import { mergeCatalogAndFarmProducts, type UnifiedProduct } from '@/lib/nutrient/unified-products';
import type { FullWaterProfileInput } from '@/lib/nutrient/water-profile-solver';
import { useNutrientSolve } from '@/lib/nutrient/workspace/hooks';
import {
  readShowSiClNaPreference,
  writeShowSiClNaPreference,
} from '@/lib/nutrient/element-visibility-prefs';
import {
  loadNutrientGuestStore,
  saveNutrientGuestStore,
} from '@/lib/nutrient/guest/browser-guest-storage';
import { applyGuestStoreToWorkspaceState } from '@/lib/nutrient/guest/guest-workspace-map';
import { applyGuestMergePlan } from '@/lib/nutrient/guest/apply-guest-merge';
import {
  dismissGuestMergeForSession,
  isGuestMergeDismissedForSession,
  clearGuestMergeSessionDismissals,
} from '@/lib/nutrient/guest/merge-prompt';
import {
  analyzeGuestMerge,
  createGuestId,
  guestMergeHasPendingUpload,
  type GuestMergeDuplicate,
  type NutrientGuestStore,
} from '@growlog/domain';
import { NutrientGuestMergeDialog } from '@/components/nutrient/NutrientGuestMergeDialog';

export interface SavedRecipeRow {
  id: string;
  name: string;
  solution_kind: NutrientSolutionKind;
  cycle_id: string | null;
  linked_event_id: string | null;
  parent_recipe_id: string | null;
  inputs: Record<string, unknown>;
  volume_l: number;
  farm_feed_system_id?: string | null;
  farm_feed_system_step_id?: string | null;
  created_by?: string | null;
}

export type NutrientWorkspaceContextValue = {
  mounted: boolean;
  catalog: CatalogBundle;
  tab: NutrientTabId;
  setTab: (id: NutrientTabId) => void;
  locale: 'en' | 'ru';
  supabase: ReturnType<typeof useFarmContext>['supabase'];
  userId: string | null | undefined;
  farmId: string | null | undefined;
  cycle: ReturnType<typeof useFarmContext>['cycle'];
  scopeId: string | null | undefined;
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  toggleProduct: (id: string) => void;
  profileSlug: string;
  setProfileSlug: (slug: string) => void;
  volumeL: number;
  setVolumeL: (n: number) => void;
  model: 'canonical' | 'hydroodo_legacy';
  setModel: (m: 'canonical' | 'hydroodo_legacy') => void;
  tankMode: 'single' | 'ab';
  setTankMode: (m: 'single' | 'ab') => void;
  stockFactor: number;
  setStockFactor: (n: number) => void;
  activeWaterProfileId: string;
  setActiveWaterProfileId: (id: string) => void;
  waterProfiles: Array<{
    id: string;
    name: string;
    water_ppm: Record<string, number>;
    alkalinity_hco3_ppm: number | null;
    ec_ms_cm?: number | null;
    ph?: number | null;
  }>;
  savedRecipes: SavedRecipeRow[];
  growCycles: Array<{ id: string; name: string; status: string; start_date: string }>;
  cycleLabelById: Record<string, string>;
  eventLabelById: Record<string, string>;
  authorLabelById: Record<string, string>;
  favoriteIds: Set<string>;
  farmProducts: FarmFertilizerRow[];
  farmLines: Record<string, Array<{ form_key: string; value_pct: number; n_form?: string | null }>>;
  feedSystems: FarmFeedSystemRow[];
  feedStepsBySystem: Record<string, FarmFeedSystemStepRow[]>;
  cyclePlan: GrowCycleNutrientPlanRow | null;
  activeSystemId: string;
  setActiveSystemId: (id: string) => void;
  activeStepId: string;
  setActiveStepId: (id: string) => void;
  activeFeedScheduleId: string;
  setActiveFeedScheduleId: (id: string) => void;
  unifiedProducts: UnifiedProduct[];
  activeStep: FarmFeedSystemStepRow | null;
  activeWater: FullWaterProfileInput | null;
  target: Record<string, number>;
  result: SolveForwardResult | null;
  wandComputing: boolean;
  reloadFarmData: () => Promise<void>;
  loadRecipeIntoWorkspace: (recipe: SavedRecipeRow) => void;
  search: string;
  setSearch: (s: string) => void;
  favoritesOnly: boolean;
  setFavoritesOnly: (v: boolean) => void;
  brandFilter: string;
  setBrandFilter: (s: string) => void;
  formFilter: '' | 'solid' | 'liquid';
  setFormFilter: (f: '' | 'solid' | 'liquid') => void;
  sourceFilter: '' | 'catalog' | 'farm';
  setSourceFilter: (s: '' | 'catalog' | 'farm') => void;
  saveName: string;
  setSaveName: (s: string) => void;
  saveKind: NutrientSolutionKind;
  setSaveKind: (k: NutrientSolutionKind) => void;
  saveStatus: string | null;
  setSaveStatus: (s: string | null) => void;
  isCloudSynced: boolean;
  showOptionalIons: boolean;
  setShowOptionalIons: (v: boolean) => void;
  updateGuestStore: (updater: (store: NutrientGuestStore) => NutrientGuestStore) => void;
  saveGuestRecipe: (params: {
    name: string;
    solutionKind: NutrientSolutionKind;
    volumeL: number;
    inputs: Record<string, unknown>;
    solverResult?: Record<string, unknown>;
  }) => Promise<string>;
  renameGuestRecipe: (id: string, name: string) => Promise<void>;
  deleteGuestRecipe: (id: string) => Promise<void>;
  openGuestMergeDialog: () => void;
  pendingGuestMergeCount: number;
  guestMergeDuplicates: GuestMergeDuplicate[];
  guestMergeError: string | null;
};

const NutrientWorkspaceContext = createContext<NutrientWorkspaceContextValue | null>(null);

export function useNutrientWorkspace(): NutrientWorkspaceContextValue {
  const ctx = useContext(NutrientWorkspaceContext);
  if (!ctx) throw new Error('useNutrientWorkspace outside provider');
  return ctx;
}

export function NutrientWorkspaceProvider({
  catalog,
  children,
}: {
  catalog: CatalogBundle;
  children: ReactNode;
}) {
  const { locale } = useTranslation();
  const displayLocale = locale === 'ru' ? 'ru' : 'en';
  const { supabase, userId, farmId, cycle, scopeId } = useFarmContext();
  const isCloudSynced = Boolean(userId && farmId);
  const [mounted, setMounted] = useState(false);
  const [showOptionalIons, setShowOptionalIonsState] = useState(false);
  const [guestStore, setGuestStore] = useState<NutrientGuestStore | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeCount, setMergeCount] = useState(0);
  const [mergeDuplicates, setMergeDuplicates] = useState<GuestMergeDuplicate[]>([]);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [tab, setTab] = useState<NutrientTabId>('wand');

  const allProfiles = catalog.target_profiles;
  const [profileSlug, setProfileSlug] = useState(
    () => allProfiles.find((p) => p.slug === 'hoagland-standard')?.slug ?? allProfiles[0]?.slug ?? '',
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    defaultNutrientWorkspaceProductIds(catalog),
  );
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [brandFilter, setBrandFilter] = useState('');
  const [formFilter, setFormFilter] = useState<'' | 'solid' | 'liquid'>('');
  const [sourceFilter, setSourceFilter] = useState<'' | 'catalog' | 'farm'>('');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [volumeL, setVolumeL] = useState(100);
  const [model, setModel] = useState<'canonical' | 'hydroodo_legacy'>('canonical');
  const [tankMode, setTankMode] = useState<'single' | 'ab'>('ab');
  const [stockFactor, setStockFactor] = useState(100);
  const [activeWaterProfileId, setActiveWaterProfileId] = useState('');
  const [waterProfiles, setWaterProfiles] = useState<
    Array<{
      id: string;
      name: string;
      water_ppm: Record<string, number>;
      alkalinity_hco3_ppm: number | null;
      ec_ms_cm?: number | null;
      ph?: number | null;
    }>
  >([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipeRow[]>([]);
  const [growCycles, setGrowCycles] = useState<
    Array<{ id: string; name: string; status: string; start_date: string }>
  >([]);
  const [cycleLabelById, setCycleLabelById] = useState<Record<string, string>>({});
  const [eventLabelById, setEventLabelById] = useState<Record<string, string>>({});
  const [authorLabelById, setAuthorLabelById] = useState<Record<string, string>>({});
  const [farmProducts, setFarmProducts] = useState<FarmFertilizerRow[]>([]);
  const [farmLines, setFarmLines] = useState<
    Record<string, Array<{ form_key: string; value_pct: number; n_form?: string | null }>>
  >({});
  const [feedSystems, setFeedSystems] = useState<FarmFeedSystemRow[]>([]);
  const [feedStepsBySystem, setFeedStepsBySystem] = useState<Record<string, FarmFeedSystemStepRow[]>>({});
  const [cyclePlan, setCyclePlan] = useState<GrowCycleNutrientPlanRow | null>(null);
  const [activeSystemId, setActiveSystemId] = useState('');
  const [activeStepId, setActiveStepId] = useState('');
  const [activeFeedScheduleId, setActiveFeedScheduleId] = useState('');
  const [saveName, setSaveName] = useState('');
  const [saveKind, setSaveKind] = useState<NutrientSolutionKind>('recipe');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setShowOptionalIonsState(readShowSiClNaPreference());
    const q = new URLSearchParams(window.location.search).get('tab');
    const valid: NutrientTabId[] = ['solutions', 'fertilizers', 'systems', 'water', 'elements', 'wand'];
    if (q && valid.includes(q as NutrientTabId)) setTab(q as NutrientTabId);
  }, []);

  const setShowOptionalIons = useCallback((value: boolean) => {
    setShowOptionalIonsState(value);
    writeShowSiClNaPreference(value);
  }, []);

  const applyGuestToState = useCallback((store: NutrientGuestStore) => {
    const mapped = applyGuestStoreToWorkspaceState(store);
    setWaterProfiles(mapped.waterProfiles);
    setSavedRecipes(mapped.savedRecipes);
    setFarmProducts(mapped.farmProducts);
    setFarmLines(mapped.farmLines);
    setFeedSystems(mapped.feedSystems);
    setFeedStepsBySystem(mapped.feedStepsBySystem);
    setFavoriteIds(mapped.favoriteIds);
    setGrowCycles([]);
    setCycleLabelById({});
    setEventLabelById({});
    setAuthorLabelById({});
    setCyclePlan(null);
    const ws = store.workspace;
    if (ws?.selectedIds?.length) setSelectedIds(ws.selectedIds);
    if (ws?.profileSlug) setProfileSlug(ws.profileSlug);
    if (ws?.activeSystemId) setActiveSystemId(ws.activeSystemId);
    if (ws?.activeStepId) setActiveStepId(ws.activeStepId);
    if (ws?.activeWaterProfileId) setActiveWaterProfileId(ws.activeWaterProfileId);
    if (ws?.activeFeedScheduleId) setActiveFeedScheduleId(ws.activeFeedScheduleId);
    if (typeof ws?.volumeL === 'number') setVolumeL(ws.volumeL);
    if (ws?.tankMode) setTankMode(ws.tankMode);
    if (ws?.model) setModel(ws.model);
    if (typeof ws?.stockFactor === 'number') setStockFactor(ws.stockFactor);
  }, []);

  const updateGuestStore = useCallback(
    (updater: (store: NutrientGuestStore) => NutrientGuestStore) => {
      const base = guestStore ?? loadNutrientGuestStore();
      const next = updater(base);
      setGuestStore(next);
      saveNutrientGuestStore(next);
      applyGuestToState(next);
    },
    [applyGuestToState, guestStore],
  );

  const reloadFarmData = useCallback(async () => {
    if (!isCloudSynced) {
      const store = loadNutrientGuestStore();
      setGuestStore(store);
      applyGuestToState(store);
      return;
    }
    if (!farmId || !userId) return;
    const [waters, recipes, favs, fertilizers, systems, cycles, authors] = await Promise.all([
      listFarmWaterProfiles(supabase, farmId),
      listFarmNutrientRecipes(supabase, farmId),
      listNutrientFavorites(supabase, farmId, userId),
      listFarmFertilizers(supabase, farmId),
      listFarmFeedSystems(supabase, farmId),
      fetchGrowCyclesForFarm(supabase, farmId),
      fetchFarmMemberDisplayNames(supabase, farmId),
    ]);
    setAuthorLabelById(authors);
    setGrowCycles(cycles);
    setWaterProfiles(waters as typeof waterProfiles);
    setSavedRecipes(recipes as SavedRecipeRow[]);
    const eventIds = [...new Set((recipes as SavedRecipeRow[]).map((r) => r.linked_event_id).filter(Boolean))] as string[];
    const cycleMap: Record<string, string> = {};
    for (const c of cycles) cycleMap[c.id] = c.name;
    setCycleLabelById(cycleMap);
    const events = await fetchEventsByIds(supabase, farmId, eventIds);
    const eventMap: Record<string, string> = {};
    for (const e of events) {
      const snippet = (e.body ?? '').slice(0, 80);
      eventMap[e.id] = snippet || e.event_type;
    }
    setEventLabelById(eventMap);
    setFarmProducts(fertilizers);
    setFeedSystems(systems);

    const lineMap: Record<string, Array<{ form_key: string; value_pct: number; n_form?: string | null }>> = {};
    await Promise.all(
      fertilizers.map(async (fp) => {
        const lines = await listFarmFertilizerLines(supabase, fp.id);
        lineMap[fp.id] = lines.map((l) => ({
          form_key: l.form_key as string,
          value_pct: Number(l.value_pct),
          n_form: (l as { n_form?: string }).n_form ?? null,
        }));
      }),
    );
    setFarmLines(lineMap);

    const stepsMap: Record<string, FarmFeedSystemStepRow[]> = {};
    await Promise.all(
      systems.map(async (sys) => {
        stepsMap[sys.id] = await listFarmFeedSystemSteps(supabase, sys.id);
      }),
    );
    setFeedStepsBySystem(stepsMap);

    if (cycle?.id) {
      const plan = await getGrowCycleNutrientPlan(supabase, cycle.id);
      setCyclePlan(plan);
      if (plan?.farm_feed_system_id) {
        setActiveSystemId(plan.farm_feed_system_id);
        if (plan.active_step_id) setActiveStepId(plan.active_step_id);
      }
    } else {
      setCyclePlan(null);
    }

    const favSet = new Set<string>();
    for (const f of favs) {
      if (f.catalog_product_id) favSet.add(f.catalog_product_id);
      if (f.farm_product_id) favSet.add(`farm:${f.farm_product_id}`);
    }
    setFavoriteIds(favSet);
  }, [farmId, userId, supabase, cycle?.id, isCloudSynced, applyGuestToState]);

  useEffect(() => {
    if (!mounted) return;
    reloadFarmData().catch(() => undefined);
  }, [mounted, reloadFarmData]);

  useEffect(() => {
    if (!userId) clearGuestMergeSessionDismissals();
  }, [userId]);

  const farmCatalogForMerge = useCallback(
    () => ({
      waterNames: waterProfiles.map((w) => w.name),
      fertilizerExternalKeys: farmProducts.map((f) => f.external_key),
      feedSystemNames: feedSystems.map((s) => s.name),
      recipeNames: savedRecipes.map((r) => r.name),
    }),
    [waterProfiles, farmProducts, feedSystems, savedRecipes],
  );

  const refreshMergeDialogState = useCallback(() => {
    if (!farmId) return;
    const store = guestStore ?? loadNutrientGuestStore();
    const analysis = analyzeGuestMerge(store, farmId, farmCatalogForMerge());
    setMergeCount(analysis.pendingCount);
    setMergeDuplicates(analysis.duplicates);
  }, [farmId, guestStore, farmCatalogForMerge]);

  const openGuestMergeDialog = useCallback(() => {
    refreshMergeDialogState();
    setMergeError(null);
    setMergeOpen(true);
  }, [refreshMergeDialogState]);

  const pendingGuestMergeCount = useMemo(() => {
    if (!farmId || !isCloudSynced) return 0;
    const store = guestStore ?? loadNutrientGuestStore();
    return analyzeGuestMerge(store, farmId, farmCatalogForMerge()).pendingCount;
  }, [farmId, isCloudSynced, guestStore, farmCatalogForMerge]);

  useEffect(() => {
    if (!mounted || !isCloudSynced || !farmId) return;
    if (isGuestMergeDismissedForSession(farmId)) return;
    const store = guestStore ?? loadNutrientGuestStore();
    const analysis = analyzeGuestMerge(store, farmId, farmCatalogForMerge());
    if (!guestMergeHasPendingUpload(analysis)) return;
    setMergeCount(analysis.pendingCount);
    setMergeDuplicates(analysis.duplicates);
    setMergeError(null);
    setMergeOpen(true);
  }, [mounted, isCloudSynced, farmId, guestStore, farmCatalogForMerge]);

  useEffect(() => {
    if (!mounted || isCloudSynced) return;
    const handle = window.setTimeout(() => {
      const base = guestStore ?? loadNutrientGuestStore();
      const next: NutrientGuestStore = {
        ...base,
        workspace: {
          selectedIds,
          profileSlug,
          activeSystemId,
          activeStepId,
          activeWaterProfileId,
          activeFeedScheduleId,
          volumeL,
          tankMode,
          model,
          stockFactor,
        },
      };
      setGuestStore(next);
      saveNutrientGuestStore(next);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [
    mounted,
    isCloudSynced,
    guestStore,
    selectedIds,
    profileSlug,
    activeSystemId,
    activeStepId,
    activeWaterProfileId,
    activeFeedScheduleId,
    volumeL,
    tankMode,
    model,
    stockFactor,
  ]);

  const onConfirmMerge = useCallback(async () => {
    if (!farmId || !userId) return;
    setMerging(true);
    setMergeError(null);
    try {
      const store = guestStore ?? loadNutrientGuestStore();
      const analysis = analyzeGuestMerge(store, farmId, farmCatalogForMerge());
      const { store: nextStore, uploadedCount, failures } = await applyGuestMergePlan(supabase, {
        farmId,
        userId,
        store,
        plan: analysis.plan,
      });
      setGuestStore(nextStore);
      saveNutrientGuestStore(nextStore);
      if (failures.length > 0) {
        const fail = failures[0];
        setMergeError(
          `${fail.label}: ${fail.message}`,
        );
        refreshMergeDialogState();
        return;
      }
      setMergeOpen(false);
      if (uploadedCount > 0) await reloadFarmData();
      else refreshMergeDialogState();
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : String(err));
    } finally {
      setMerging(false);
    }
  }, [
    farmId,
    userId,
    guestStore,
    farmCatalogForMerge,
    supabase,
    reloadFarmData,
    refreshMergeDialogState,
  ]);

  const onSkipMerge = useCallback(() => {
    if (farmId) dismissGuestMergeForSession(farmId);
    setMergeOpen(false);
    setMergeError(null);
  }, [farmId]);

  const saveGuestRecipe = useCallback(
    async (params: {
      name: string;
      solutionKind: NutrientSolutionKind;
      volumeL: number;
      inputs: Record<string, unknown>;
      solverResult?: Record<string, unknown>;
    }) => {
      const id = createGuestId();
      updateGuestStore((store) => ({
        ...store,
        recipes: [
          ...store.recipes,
          {
            id,
            name: params.name,
            solution_kind: params.solutionKind,
            volume_l: params.volumeL,
            inputs: {
              ...params.inputs,
              ...(params.solverResult ? { _solverResult: params.solverResult } : {}),
            },
          },
        ],
      }));
      return id;
    },
    [updateGuestStore],
  );

  const renameGuestRecipeFn = useCallback(
    async (id: string, name: string) => {
      updateGuestStore((store) => ({
        ...store,
        recipes: store.recipes.map((r) => (r.id === id ? { ...r, name } : r)),
      }));
    },
    [updateGuestStore],
  );

  const deleteGuestRecipeFn = useCallback(
    async (id: string) => {
      updateGuestStore((store) => ({
        ...store,
        recipes: store.recipes.filter((r) => r.id !== id),
      }));
    },
    [updateGuestStore],
  );

  const unifiedProducts = useMemo(
    () => mergeCatalogAndFarmProducts(catalog, farmProducts, farmLines),
    [catalog, farmProducts, farmLines],
  );

  const activeStep = useMemo(() => {
    if (!activeStepId) return null;
    for (const steps of Object.values(feedStepsBySystem)) {
      const hit = steps.find((s) => s.id === activeStepId);
      if (hit) return hit;
    }
    return null;
  }, [activeStepId, feedStepsBySystem]);

  const activeWater = useMemo((): FullWaterProfileInput | null => {
    if (!activeWaterProfileId) return null;
    const wp = waterProfiles.find((w) => w.id === activeWaterProfileId);
    if (!wp) return null;
    return {
      water_ppm: wp.water_ppm,
      alkalinity_hco3_ppm: wp.alkalinity_hco3_ppm,
      ec_ms_cm: wp.ec_ms_cm ?? null,
      ph: wp.ph ?? null,
    };
  }, [activeWaterProfileId, waterProfiles]);

  const profile = allProfiles.find((p) => p.slug === profileSlug);
  const target = useMemo(() => {
    if (activeStep) return activeStep.target_ppm as Record<string, number>;
    return profile ? mapDbProfileToTarget(profile) : {};
  }, [activeStep, profile]);

  const { result, computing: wandComputing } = useNutrientSolve({
    catalog,
    unifiedProducts,
    selectedProductIds: selectedIds,
    catalogProfileSlug: activeStep ? undefined : profileSlug,
    farmStep: activeStep,
    water: activeWater,
    volumeL,
    model,
    tankMode,
    stockFactor,
  });

  const toggleProduct = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const loadRecipeIntoWorkspace = useCallback((recipe: SavedRecipeRow) => {
    const inputs = recipe.inputs ?? {};
    if (Array.isArray(inputs.selectedIds)) {
      setSelectedIds(inputs.selectedIds as string[]);
    }
    if (typeof inputs.profileSlug === 'string') setProfileSlug(inputs.profileSlug);
    if (typeof inputs.model === 'string') setModel(inputs.model as 'canonical' | 'hydroodo_legacy');
    if (typeof inputs.tankMode === 'string') setTankMode(inputs.tankMode as 'single' | 'ab');
    if (typeof inputs.waterProfileId === 'string') setActiveWaterProfileId(inputs.waterProfileId);
    if (typeof inputs.systemStepId === 'string') setActiveStepId(inputs.systemStepId);
    if (typeof inputs.systemId === 'string') setActiveSystemId(inputs.systemId);
    if (typeof inputs.feedScheduleId === 'string') setActiveFeedScheduleId(inputs.feedScheduleId);
    if (recipe.volume_l) setVolumeL(Number(recipe.volume_l));
    setSaveName(recipe.name);
    setSaveKind(recipe.solution_kind);
    setTab('wand');
  }, []);

  const value: NutrientWorkspaceContextValue = {
    mounted,
    catalog,
    tab,
    setTab,
    locale: displayLocale,
    supabase,
    userId,
    farmId,
    cycle,
    scopeId,
    selectedIds,
    setSelectedIds,
    toggleProduct,
    profileSlug,
    setProfileSlug,
    volumeL,
    setVolumeL,
    model,
    setModel,
    tankMode,
    setTankMode,
    stockFactor,
    setStockFactor,
    activeWaterProfileId,
    setActiveWaterProfileId,
    waterProfiles,
    savedRecipes,
    growCycles,
    cycleLabelById,
    eventLabelById,
    authorLabelById,
    favoriteIds,
    farmProducts,
    farmLines,
    feedSystems,
    feedStepsBySystem,
    cyclePlan,
    activeSystemId,
    setActiveSystemId,
    activeStepId,
    setActiveStepId,
    activeFeedScheduleId,
    setActiveFeedScheduleId,
    unifiedProducts,
    activeStep,
    activeWater,
    target,
    result,
    wandComputing,
    reloadFarmData,
    loadRecipeIntoWorkspace,
    search,
    setSearch,
    favoritesOnly,
    setFavoritesOnly,
    brandFilter,
    setBrandFilter,
    formFilter,
    setFormFilter,
    sourceFilter,
    setSourceFilter,
    saveName,
    setSaveName,
    saveKind,
    setSaveKind,
    saveStatus,
    setSaveStatus,
    isCloudSynced,
    showOptionalIons,
    setShowOptionalIons,
    updateGuestStore,
    saveGuestRecipe,
    renameGuestRecipe: renameGuestRecipeFn,
    deleteGuestRecipe: deleteGuestRecipeFn,
    openGuestMergeDialog,
    pendingGuestMergeCount,
    guestMergeDuplicates: mergeDuplicates,
    guestMergeError: mergeError,
  };

  return (
    <NutrientWorkspaceContext.Provider value={value}>
      <NutrientGuestMergeDialog
        open={mergeOpen}
        itemCount={mergeCount}
        duplicates={mergeDuplicates}
        errorMessage={mergeError}
        merging={merging}
        onConfirm={() => {
          void onConfirmMerge();
        }}
        onSkip={onSkipMerge}
      />
      {children}
    </NutrientWorkspaceContext.Provider>
  );
}
