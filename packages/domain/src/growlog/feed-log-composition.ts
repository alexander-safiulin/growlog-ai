import type { SupabaseClient } from '@supabase/supabase-js';
import type { DoseRowState, RecipeDoseLine } from './feeding-doses';
import { feedingDosesMatchRecipe } from './solution-snapshot';
import { fetchRecipeDoses } from './cycle-queries';

export function feedLogCompositionTrustedSync(params: {
  entryKind: 'watering' | 'feeding';
  recipeId: string | null;
  volumeMl: number;
  recipeVolumeL: number | null;
  doses: DoseRowState[];
  recipeLines: RecipeDoseLine[];
}): boolean {
  if (!params.recipeId) return true;
  if (params.entryKind === 'watering') return true;
  return feedingDosesMatchRecipe(
    params.doses,
    params.recipeLines,
    params.volumeMl,
    params.recipeVolumeL,
  );
}

export async function fetchRecipeLinesForFeedLog(
  supabase: SupabaseClient,
  recipeId: string,
): Promise<RecipeDoseLine[]> {
  const rows = await fetchRecipeDoses(supabase, recipeId);
  return rows.map((r) => ({
    fertilizer_label: r.fertilizer_label,
    dose_per_l: r.dose_per_l,
    fertilizer_product_id: r.fertilizer_product_id,
    farm_fertilizer_product_id: r.farm_fertilizer_product_id,
  }));
}

export async function resolveFeedLogCompositionTrusted(
  supabase: SupabaseClient,
  params: {
    entryKind: 'watering' | 'feeding';
    recipeId: string | null;
    volumeMl: number;
    recipeVolumeL: number | null;
    doses: DoseRowState[];
    guestRecipeLines?: RecipeDoseLine[];
  },
): Promise<boolean> {
  if (!params.recipeId) return true;
  if (params.entryKind === 'watering') return true;
  const lines =
    params.guestRecipeLines?.length
      ? params.guestRecipeLines
      : await fetchRecipeLinesForFeedLog(supabase, params.recipeId);
  return feedingDosesMatchRecipe(params.doses, lines, params.volumeMl, params.recipeVolumeL);
}
