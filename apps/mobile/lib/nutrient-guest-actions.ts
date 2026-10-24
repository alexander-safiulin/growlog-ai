import { loadNutrientGuestStoreMobile, saveNutrientGuestStoreMobile } from '@/lib/nutrient-guest-storage';
import { upsertGuestRecipe } from '@growlog/web-lib/nutrient/guest/guest-workspace-actions';
import type { NutrientSolutionKind } from '@growlog/domain';

export async function saveGuestRecipeMobile(params: {
  name: string;
  solutionKind: NutrientSolutionKind;
  volumeL: number;
  inputs: Record<string, unknown>;
  solverResult?: Record<string, unknown>;
}): Promise<string> {
  const store = await loadNutrientGuestStoreMobile();
  const inputs = { ...params.inputs };
  if (params.solverResult) inputs._solverResult = params.solverResult;
  const next = upsertGuestRecipe(store, {
    name: params.name.trim(),
    solution_kind: params.solutionKind,
    volume_l: params.volumeL,
    inputs,
  });
  const saved = next.recipes[next.recipes.length - 1];
  await saveNutrientGuestStoreMobile(next);
  return saved.id;
}
