import { applyGuestMergePlan } from '@/lib/nutrient-guest-merge-mobile';
import { loadNutrientGuestStoreMobile } from '@/lib/nutrient-guest-storage';
import { saveLocalWorkspaceStore } from '@/lib/local-workspace-storage';
import {
  analyzeGuestMerge,
  clearLocalJournalAfterSync,
  listFarmFeedSystems,
  listFarmFertilizers,
  listFarmNutrientRecipes,
  listFarmWaterProfiles,
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

export async function mergeGuestNutrientStore(
  supabase: SupabaseClient,
  params: { farmId: string; userId: string },
): Promise<void> {
  const { farmId, userId } = params;
  const guestStore = await loadNutrientGuestStoreMobile();
  const [waters, fps, systems, recipes] = await Promise.all([
    listFarmWaterProfiles(supabase, farmId),
    listFarmFertilizers(supabase, farmId),
    listFarmFeedSystems(supabase, farmId),
    listFarmNutrientRecipes(supabase, farmId),
  ]);
  const analysis = analyzeGuestMerge(guestStore, farmId, {
    waterNames: waters.map((w) => w.name),
    fertilizerExternalKeys: fps.map((f) => f.external_key),
    feedSystemNames: systems.map((s) => s.name),
    recipeNames: recipes.map((r) => String(r.name ?? '')),
  });
  if (analysis.pendingCount === 0) return;
  await applyGuestMergePlan(supabase, {
    farmId,
    userId,
    store: guestStore,
    plan: analysis.plan,
  });
}

export async function runFullLocalSync(
  supabase: SupabaseClient,
  params: {
    localStore: LocalWorkspaceStore;
    farmId: string;
    cycleId: string;
    scopeId: string;
    userId: string;
  },
): Promise<LocalWorkspaceStore> {
  await uploadLocalJournalEvents(supabase, {
    store: params.localStore,
    farmId: params.farmId,
    cycleId: params.cycleId,
    scopeId: params.scopeId,
    userId: params.userId,
  });
  await mergeGuestNutrientStore(supabase, { farmId: params.farmId, userId: params.userId });
  const next = clearLocalJournalAfterSync(params.localStore);
  await saveLocalWorkspaceStore(next);
  return next;
}
