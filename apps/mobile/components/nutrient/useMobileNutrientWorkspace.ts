import {
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
import { mergeCatalogAndFarmProducts } from '@growlog/web-lib/nutrient/unified-products';
import { useNutrientSolve } from '@growlog/web-lib/nutrient/workspace/hooks';
import type { FullWaterProfileInput } from '@growlog/web-lib/nutrient/water-profile-solver';
import { useFarmContext } from '@/providers/FarmProvider';

const TAB_IDS = ['solutions', 'fertilizers', 'systems', 'water', 'elements', 'wand'] as const;
export type MobileNutrientTab = (typeof TAB_IDS)[number];
export { TAB_IDS };

export function useMobileNutrientWorkspace() {
  const catalog = nutrientCatalog;
  const { supabase, userId, farmId, cycle } = useFarmContext();
  const [tab, setTab] = useState<MobileNutrientTab>('wand');
  const profiles = catalog.target_profiles;
  const [profileSlug, setProfileSlug] = useState(profiles[0]?.slug ?? '');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [volumeL, setVolumeL] = useState(100);
  const [model] = useState<'canonical' | 'hydroodo_legacy'>('canonical');
  const [tankMode] = useState<'single' | 'ab'>('ab');
  const [stockFactor] = useState(100);
  const [waterProfiles, setWaterProfiles] = useState<
    Array<{ id: string; name: string; water_ppm: Record<string, number>; alkalinity_hco3_ppm: number | null; ec_ms_cm?: number | null; ph?: number | null }>
  >([]);
  const [activeWaterId, setActiveWaterId] = useState('');
  const [farmProducts, setFarmProducts] = useState<FarmFertilizerRow[]>([]);
  const [farmLines, setFarmLines] = useState<Record<string, Array<{ form_key: string; value_pct: number }>>>({});
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [recipes, setRecipes] = useState<Array<Record<string, unknown>>>([]);
  const [feedSystems, setFeedSystems] = useState<Array<{ id: string; name: string }>>([]);
  const [stepsBySystem, setStepsBySystem] = useState<Record<string, FarmFeedSystemStepRow[]>>({});
  const [activeSystemId, setActiveSystemId] = useState('');
  const [activeStepId, setActiveStepId] = useState('');

  const reload = useCallback(async () => {
    if (!farmId || !userId) return;
    const [waters, recs, favs, fps, systems] = await Promise.all([
      listFarmWaterProfiles(supabase, farmId),
      listFarmNutrientRecipes(supabase, farmId),
      listNutrientFavorites(supabase, farmId, userId),
      listFarmFertilizers(supabase, farmId),
      listFarmFeedSystems(supabase, farmId),
    ]);
    setWaterProfiles(waters as typeof waterProfiles);
    setRecipes(recs);
    setFarmProducts(fps);
    setFeedSystems(systems);
    const lm: Record<string, Array<{ form_key: string; value_pct: number }>> = {};
    for (const fp of fps) {
      const lines = await listFarmFertilizerLines(supabase, fp.id);
      lm[fp.id] = lines.map((l) => ({ form_key: l.form_key as string, value_pct: Number(l.value_pct) }));
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
  }, [farmId, userId, supabase, cycle?.id]);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  const unified = useMemo(
    () => mergeCatalogAndFarmProducts(catalog, farmProducts, farmLines),
    [catalog, farmProducts, farmLines],
  );

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

  const result = useNutrientSolve({
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
    if (typeof inputs.waterProfileId === 'string') setActiveWaterId(inputs.waterProfileId);
    if (typeof inputs.systemStepId === 'string') setActiveStepId(inputs.systemStepId);
    setVolumeL(Number(r.volume_l ?? 100));
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
    favoriteIds,
    volumeL,
    setVolumeL,
    result,
    target,
    waterProfiles,
    activeWaterId,
    setActiveWaterId,
    recipes,
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
  };
}
