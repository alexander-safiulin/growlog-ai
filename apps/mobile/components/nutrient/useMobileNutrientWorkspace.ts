import {
  fetchEventsByIds,
  fetchGrowCyclesForFarm,
  getGrowCycleNutrientPlan,
  listFarmFeedSystemSteps,
  listFarmFeedSystems,
  listFarmFertilizerLines,
  listFarmFertilizers,
  listFarmNutrientRecipes,
  listFarmWaterProfiles,
  listNutrientFavorites,
  type FarmFeedSystemStepRow,
  type FarmFertilizerRow,
} from '@growlog/domain';
import { mapDbProfileToTarget } from '@growlog/nutrient-calc';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { nutrientCatalog } from '@/lib/nutrient-catalog';
import { defaultNutrientWorkspaceProductIds } from '@growlog/web-lib/nutrient/default-fertilizers';
import { mergeCatalogAndFarmProducts } from '@growlog/web-lib/nutrient/unified-products';
import { useNutrientSolve } from '@growlog/web-lib/nutrient/workspace/hooks';
import type { FullWaterProfileInput } from '@growlog/web-lib/nutrient/water-profile-solver';
import { applyGuestStoreToWorkspaceState } from '@growlog/web-lib/nutrient/guest/guest-workspace-map';
import { loadNutrientGuestStoreMobile } from '@/lib/nutrient-guest-storage';
import { useFarmContext } from '@/providers/FarmProvider';

const TAB_IDS = ['solutions', 'fertilizers', 'systems', 'water', 'elements', 'wand'] as const;
export type MobileNutrientTab = (typeof TAB_IDS)[number];
export { TAB_IDS };

export function useMobileNutrientWorkspace() {
  const catalog = nutrientCatalog;
  const { supabase, userId, farmId, cycle, scopeId } = useFarmContext();
  const isCloudSynced = Boolean(userId && farmId);
  const [tab, setTab] = useState<MobileNutrientTab>('wand');
  const profiles = catalog.target_profiles;
  const [profileSlug, setProfileSlug] = useState(
    () => profiles.find((p) => p.slug === 'hoagland-standard')?.slug ?? profiles[0]?.slug ?? '',
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    defaultNutrientWorkspaceProductIds(catalog),
  );
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [volumeL, setVolumeL] = useState(100);
  const [model] = useState<'canonical' | 'hydroodo_legacy'>('canonical');
  const [tankMode] = useState<'single' | 'ab'>('ab');
  const [stockFactor] = useState(100);
  const [waterProfiles, setWaterProfiles] = useState<
    Array<{ id: string; name: string; water_ppm: Record<string, number>; alkalinity_hco3_ppm: number | null; ec_ms_cm?: number | null; ph?: number | null }>
  >([]);
  const [activeWaterId, setActiveWaterId] = useState('');
  const [farmProducts, setFarmProducts] = useState<FarmFertilizerRow[]>([]);
  const [farmLines, setFarmLines] = useState<Record<string, Array<{ form_key: string; value_pct: number; n_form?: string | null }>>>({});
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [recipes, setRecipes] = useState<Array<Record<string, unknown>>>([]);
  const [growCycles, setGrowCycles] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [cycleLabelById, setCycleLabelById] = useState<Record<string, string>>({});
  const [eventLabelById, setEventLabelById] = useState<Record<string, string>>({});
  const [feedSystems, setFeedSystems] = useState<Array<{ id: string; name: string }>>([]);
  const [stepsBySystem, setStepsBySystem] = useState<Record<string, FarmFeedSystemStepRow[]>>({});
  const [activeSystemId, setActiveSystemId] = useState('');
  const [activeStepId, setActiveStepId] = useState('');
  const [activeAlt, setActiveAlt] = useState(0);

  const reload = useCallback(async () => {
    if (!isCloudSynced) {
      const store = await loadNutrientGuestStoreMobile();
      const mapped = applyGuestStoreToWorkspaceState(store);
      setWaterProfiles(mapped.waterProfiles);
      setRecipes(mapped.savedRecipes as Array<Record<string, unknown>>);
      setFarmProducts(mapped.farmProducts);
      setFarmLines(mapped.farmLines);
      setFeedSystems(mapped.feedSystems);
      setStepsBySystem(mapped.feedStepsBySystem);
      setFavoriteIds(mapped.favoriteIds);
      return;
    }
    if (!farmId || !userId) return;
    const [waters, recs, favs, fps, systems, cycles] = await Promise.all([
      listFarmWaterProfiles(supabase, farmId),
      listFarmNutrientRecipes(supabase, farmId),
      listNutrientFavorites(supabase, farmId, userId),
      listFarmFertilizers(supabase, farmId),
      listFarmFeedSystems(supabase, farmId),
      fetchGrowCyclesForFarm(supabase, farmId),
    ]);
    setWaterProfiles(waters as typeof waterProfiles);
    setRecipes(recs);
    setGrowCycles(cycles.map((c) => ({ id: c.id, name: c.name, status: c.status })));
    const cMap: Record<string, string> = {};
    for (const c of cycles) cMap[c.id] = c.name;
    setCycleLabelById(cMap);
    const eventIds = [...new Set(recs.map((r) => r.linked_event_id as string | null).filter(Boolean))] as string[];
    const events = await fetchEventsByIds(supabase, farmId, eventIds);
    const eMap: Record<string, string> = {};
    for (const e of events) eMap[e.id] = (e.body ?? '').slice(0, 60) || e.event_type;
    setEventLabelById(eMap);
    setFarmProducts(fps);
    setFeedSystems(systems);
    const lm: Record<string, Array<{ form_key: string; value_pct: number; n_form?: string | null }>> = {};
    for (const fp of fps) {
      const lines = await listFarmFertilizerLines(supabase, fp.id);
      lm[fp.id] = lines.map((l) => ({
        form_key: l.form_key as string,
        value_pct: Number(l.value_pct),
        n_form: (l as { n_form?: string }).n_form ?? null,
      }));
    }
    setFarmLines(lm);
    const sm: Record<string, FarmFeedSystemStepRow[]> = {};
    for (const s of systems) {
      sm[s.id] = await listFarmFeedSystemSteps(supabase, s.id);
    }
    setStepsBySystem(sm);
    if (cycle?.id) {
      const plan = await getGrowCycleNutrientPlan(supabase, cycle.id);
      if (plan?.farm_feed_system_id) setActiveSystemId(plan.farm_feed_system_id);
      if (plan?.active_step_id) setActiveStepId(plan.active_step_id);
    }
    const fav = new Set<string>();
    for (const f of favs) {
      if (f.catalog_product_id) fav.add(f.catalog_product_id);
      if (f.farm_product_id) fav.add(`farm:${f.farm_product_id}`);
    }
    setFavoriteIds(fav);
  }, [farmId, userId, supabase, cycle?.id, isCloudSynced]);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  const unified = useMemo(
    () => mergeCatalogAndFarmProducts(catalog, farmProducts, farmLines),
    [catalog, farmProducts, farmLines],
  );

  const filteredUnified = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = unified;
    if (q) {
      list = list.filter(
        (p) =>
          p.brand.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.external_key.toLowerCase().includes(q),
      );
    }
    if (favoritesOnly) list = list.filter((p) => favoriteIds.has(p.id));
    return list;
  }, [unified, search, favoritesOnly, favoriteIds]);

  const activeStep = useMemo(() => {
    for (const steps of Object.values(stepsBySystem)) {
      const hit = steps.find((s) => s.id === activeStepId);
      if (hit) return hit;
    }
    return null;
  }, [activeStepId, stepsBySystem]);

  const activeWater = useMemo((): FullWaterProfileInput | null => {
    const wp = waterProfiles.find((w) => w.id === activeWaterId);
    if (!wp) return null;
    return { water_ppm: wp.water_ppm, alkalinity_hco3_ppm: wp.alkalinity_hco3_ppm, ec_ms_cm: wp.ec_ms_cm, ph: wp.ph };
  }, [activeWaterId, waterProfiles]);

  const profile = profiles.find((p) => p.slug === profileSlug);
  const target = activeStep
    ? (activeStep.target_ppm as Record<string, number>)
    : profile
      ? mapDbProfileToTarget(profile)
      : {};

  const { result } = useNutrientSolve({
    catalog,
    unifiedProducts: unified,
    selectedProductIds: selectedIds,
    catalogProfileSlug: activeStep ? undefined : profileSlug,
    farmStep: activeStep,
    water: activeWater,
    volumeL,
    model,
    tankMode,
    stockFactor,
  });

  const loadRecipe = (r: Record<string, unknown>) => {
    const inputs = (r.inputs as Record<string, unknown>) ?? {};
    if (Array.isArray(inputs.selectedIds)) setSelectedIds(inputs.selectedIds as string[]);
    if (typeof inputs.profileSlug === 'string') setProfileSlug(inputs.profileSlug);
    if (typeof inputs.waterProfileId === 'string') setActiveWaterId(inputs.waterProfileId);
    if (typeof inputs.systemStepId === 'string') setActiveStepId(inputs.systemStepId);
    if (typeof inputs.systemId === 'string') setActiveSystemId(inputs.systemId as string);
    setVolumeL(Number(r.volume_l ?? 100));
    setActiveAlt(0);
    setTab('wand');
  };

  return {
    tab,
    setTab,
    catalog,
    profiles,
    profileSlug,
    setProfileSlug,
    selectedIds,
    setSelectedIds,
    unified,
    filteredUnified,
    search,
    setSearch,
    favoritesOnly,
    setFavoritesOnly,
    favoriteIds,
    volumeL,
    setVolumeL,
    result,
    target,
    activeAlt,
    setActiveAlt,
    waterProfiles,
    activeWaterId,
    setActiveWaterId,
    recipes,
    growCycles,
    cycleLabelById,
    eventLabelById,
    feedSystems,
    stepsBySystem,
    activeSystemId,
    setActiveSystemId,
    activeStepId,
    setActiveStepId,
    activeStep,
    reload,
    loadRecipe,
    farmId,
    userId,
    cycle,
    scopeId,
    supabase,
  };
}
