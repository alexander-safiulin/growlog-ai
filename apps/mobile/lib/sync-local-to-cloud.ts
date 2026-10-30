import { applyGuestMergePlan } from '@/lib/nutrient-guest-merge-mobile';
import { loadNutrientGuestStoreMobile, saveNutrientGuestStoreMobile } from '@/lib/nutrient-guest-storage';
import { saveLocalWorkspaceStore } from '@/lib/local-workspace-storage';
import {
  analyzeGuestMerge,
  rememberCloudRecipeIdsByName,
  clearLocalJournalAfterSync,
  fetchFarms,
  fetchMyFarmMemberships,
  listFarmFeedSystems,
  listFarmFertilizers,
  listFarmNutrientRecipes,
  listFarmWaterProfiles,
  pickGuestMergeTargetFarmId,
  type LocalWorkspaceStore,
} from '@growlog/domain';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function uploadLocalJournalEvents(
  supabase: SupabaseClient,
  params: {
    store: LocalWorkspaceStore;
    farmId: string;
    cycleId: string;
    scopeId: string;
    userId: string;
  },
): Promise<void> {
  const { store, farmId, cycleId, scopeId, userId } = params;
  if (!store.journal.length) return;

  const rows = store.journal.map((e) => ({
    farm_id: farmId,
    cycle_id: cycleId,
    scope_id: scopeId,
    event_type: e.event_type,
    title: null,
    body: e.body,
    occurred_at: e.occurred_at,
    source_type: e.source_type,
    payload: { ...e.payload, imported_from: 'local_workspace' },
    created_by: userId,
  }));

  const { error } = await supabase.from('events').insert(rows);
  if (error) throw error;
}

export async function resolveGuestMergeTargetFarm(
  supabase: SupabaseClient,
  params: { userId: string; activeFarmId: string | null },
): Promise<{ farmId: string; farmName: string } | null> {
  const [farms, memberships] = await Promise.all([
    fetchFarms(supabase),
    fetchMyFarmMemberships(supabase, params.userId),
  ]);
  const farmId = pickGuestMergeTargetFarmId(farms, memberships, params.activeFarmId);
  if (!farmId) return null;
  const farmName = farms.find((f) => f.id === farmId)?.name ?? '';
  return { farmId, farmName };
}

export async function mergeGuestNutrientStore(
  supabase: SupabaseClient,
  params: { userId: string; activeFarmId: string | null },
): Promise<{ farmId: string; farmName: string } | null> {
  const target = await resolveGuestMergeTargetFarm(supabase, params);
  if (!target) return null;

  const { farmId, farmName } = target;
  const { userId } = params;
  const guestStore = await loadNutrientGuestStoreMobile();
  const [waters, fps, systems, recipes] = await Promise.all([
    listFarmWaterProfiles(supabase, farmId),
    listFarmFertilizers(supabase, farmId),
    listFarmFeedSystems(supabase, farmId),
    listFarmNutrientRecipes(supabase, farmId),
  ]);
  const seeded = rememberCloudRecipeIdsByName(
    guestStore,
    farmId,
    recipes.map((r) => ({ id: String(r.id), name: (r.name as string | null) ?? null })),
  );
  const analysis = analyzeGuestMerge(seeded, farmId, {
    waterNames: waters.map((w) => w.name),
    fertilizerExternalKeys: fps.map((f) => f.external_key),
    feedSystemNames: systems.map((s) => s.name),
    recipeNames: recipes.map((r) => String(r.name ?? '')),
  });
  if (analysis.pendingCount === 0) return null;
  const merged = await applyGuestMergePlan(supabase, {
    farmId,
    userId,
    store: seeded,
    plan: analysis.plan,
  });
  await saveNutrientGuestStoreMobile(merged.store);
  return { farmId, farmName };
}

export async function runFullLocalSync(
  supabase: SupabaseClient,
  params: {
    localStore: LocalWorkspaceStore;
    farmId: string;
    cycleId: string;
    scopeId: string;
    userId: string;
    activeFarmId: string | null;
  },
): Promise<{ store: LocalWorkspaceStore; guestMergeFarmName: string | null }> {
  await uploadLocalJournalEvents(supabase, {
    store: params.localStore,
    farmId: params.farmId,
    cycleId: params.cycleId,
    scopeId: params.scopeId,
    userId: params.userId,
  });
  const merged = await mergeGuestNutrientStore(supabase, {
    userId: params.userId,
    activeFarmId: params.activeFarmId,
  });
  const next = clearLocalJournalAfterSync(params.localStore);
  await saveLocalWorkspaceStore(next);
  return { store: next, guestMergeFarmName: merged?.farmName ?? null };
}
