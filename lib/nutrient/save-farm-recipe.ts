import type { SupabaseClient } from '@supabase/supabase-js';
import type { SolveForwardResult } from '@growlog/nutrient-calc';

export interface SaveNutrientRecipeInput {
  farmId: string;
  name: string;
  volumeL: number;
  targetProfileId?: string | null;
  inputs: Record<string, unknown>;
  result: SolveForwardResult;
  solverVersion: string;
}

export async function saveNutrientRecipe(
  supabase: SupabaseClient,
  input: SaveNutrientRecipeInput,
): Promise<{ id: string }> {
  const { data: recipe, error } = await supabase
    .from('nutrient_recipes')
    .insert({
      farm_id: input.farmId,
      name: input.name,
      volume_l: input.volumeL,
      target_profile_id: input.targetProfileId ?? null,
      mode: 'forward',
      inputs: input.inputs,
      result: input.result as unknown as Record<string, unknown>,
      solver_version: input.solverVersion,
    })
    .select('id')
    .single();
  if (error) throw error;

  const doses = input.result.best.doses.map((d) => ({
    recipe_id: recipe.id,
    fertilizer_product_id: d.fertilizerId,
    fertilizer_label: d.fertilizerName,
    dose_per_l: d.amountPerL,
    unit: d.unit,
    tank: d.tank ?? 'single',
  }));

  if (doses.length > 0) {
    const { error: doseErr } = await supabase.from('nutrient_recipe_doses').insert(doses);
    if (doseErr) throw doseErr;
  }

  return { id: recipe.id };
}
