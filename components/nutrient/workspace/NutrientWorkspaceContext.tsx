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
} from '@growlog/domain';
import { useFarmContext } from '@/components/providers/FarmProvider';
import { useTranslation } from '@/components/providers/I18nProvider';
import type { NutrientTabId } from '@/components/nutrient/NutrientCalculatorApp';
import type { CatalogBundle } from '@/lib/nutrient/catalog-types';
import { defaultHoaglandSaltProductIds } from '@/lib/nutrient/default-fertilizers';
import { mergeCatalogAndFarmProducts, type UnifiedProduct } from '@/lib/nutrient/unified-products';
import type { FullWaterProfileInput } from '@/lib/nutrient/water-profile-solver';
import { useNutrientSolve } from '@/lib/nutrient/workspace/hooks';

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
  unifiedProducts: UnifiedProduct[];
  activeStep: FarmFeedSystemStepRow | null;
  activeWater: FullWaterProfileInput | null;
  target: Record<string, number>;
  result: SolveForwardResult | null;
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
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<NutrientTabId>('wand');

  const allProfiles = catalog.target_profiles;
  const [profileSlug, setProfileSlug] = useState(
    () => allProfiles.find((p) => p.slug === 'hoagland-standard')?.slug ?? allProfiles[0]?.slug ?? '',
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() => defaultHoaglandSaltProductIds(catalog));
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
  const [farmProducts, setFarmProducts] = useState<FarmFertilizerRow[]>([]);
  const [farmLines, setFarmLines] = useState<
    Record<string, Array<{ form_key: string; value_pct: number; n_form?: string | null }>>
  >({});
  const [feedSystems, setFeedSystems] = useState<FarmFeedSystemRow[]>([]);
  const [feedStepsBySystem, setFeedStepsBySystem] = useState<Record<string, FarmFeedSystemStepRow[]>>({});
  const [cyclePlan, setCyclePlan] = useState<GrowCycleNutrientPlanRow | null>(null);
  const [activeSystemId, setActiveSystemId] = useState('');
  const [activeStepId, setActiveStepId] = useState('');
  const [saveName, setSaveName] = useState('');
  const [saveKind, setSaveKind] = useState<NutrientSolutionKind>('recipe');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const reloadFarmData = useCallback(async () => {
    if (!farmId || !userId) return;
    const [waters, recipes, favs, fertilizers, systems] = await Promise.all([
      listFarmWaterProfiles(supabase, farmId),
      listFarmNutrientRecipes(supabase, farmId),
      listNutrientFavorites(supabase, farmId, userId),
      listFarmFertilizers(supabase, farmId),
      listFarmFeedSystems(supabase, farmId),
    ]);
    setWaterProfiles(waters as typeof waterProfiles);
    setSavedRecipes(recipes as SavedRecipeRow[]);
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

    let plan: GrowCycleNutrientPlanRow | null = null;
    if (cycle?.id) {
      plan = await getGrowCycleNutrientPlan(supabase, cycle.id);
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
  }, [farmId, userId, supabase, cycle?.id]);

  useEffect(() => {
    if (!mounted) return;
    reloadFarmData().catch(() => undefined);
  }, [mounted, reloadFarmData]);

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

  const result = useNutrientSolve({
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
    unifiedProducts,
    activeStep,
    activeWater,
    target,
    result,
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
  };

  return <NutrientWorkspaceContext.Provider value={value}>{children}</NutrientWorkspaceContext.Provider>;
}
