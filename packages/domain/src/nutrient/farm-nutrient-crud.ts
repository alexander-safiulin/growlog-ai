import type { SupabaseClient } from '@supabase/supabase-js';
import type { SolveForwardResult } from '@growlog/nutrient-calc';
import { createLogEntry } from '../growlog/mutations';
import type { NutrientSolutionKind } from './farm-nutrient';

export interface FarmFeedSystemRow {
  id: string;
  farm_id: string;
  name: string;
  notes: string | null;
  created_by: string | null;
}

export interface FarmFeedSystemStepRow {
  id: string;
  system_id: string;
  farm_id: string;
  step_order: number;
  week_label: string | null;
  stage: string | null;
  target_ppm: Record<string, number>;
  ph_target: number | null;
  ec_target_ms_cm: number | null;
  light_hours: number | null;
  light_ppfd: number | null;
}

export interface GrowCycleNutrientPlanRow {
  id: string;
  farm_id: string;
  cycle_id: string;
  farm_feed_system_id: string;
  active_step_id: string | null;
}

export interface FarmFertilizerLineInput {
  form_key: string;
  value_pct: number;
  n_form?: string | null;
  metadata?: Record<string, unknown>;
}

export async function deleteFarmWaterProfile(
  supabase: SupabaseClient,
  farmId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('farm_water_profiles').delete().eq('id', id).eq('farm_id', farmId);
  if (error) throw error;
}

export async function upsertFarmWaterProfileFull(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    id?: string;
    name: string;
    waterPpm: Record<string, number>;
    alkalinityHco3Ppm?: number | null;
    ecMsCm?: number | null;
    ph?: number | null;
    userId?: string | null;
  },
) {
  const row = {
    farm_id: params.farmId,
    name: params.name,
    water_ppm: params.waterPpm,
    alkalinity_hco3_ppm: params.alkalinityHco3Ppm ?? null,
    ec_ms_cm: params.ecMsCm ?? null,
    ph: params.ph ?? null,
    created_by: params.userId ?? null,
  };
  if (params.id) {
    const { data, error } = await supabase
      .from('farm_water_profiles')
      .update(row)
      .eq('id', params.id)
      .eq('farm_id', params.farmId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('farm_water_profiles').insert(row).select('*').single();
  if (error) throw error;
  return data;
}

export async function listFarmFertilizerLines(supabase: SupabaseClient, farmProductId: string) {
  const { data, error } = await supabase
    .from('farm_fertilizer_composition_lines')
    .select('*')
    .eq('farm_product_id', farmProductId);
  if (error) throw error;
  return data ?? [];
}

export async function saveFarmFertilizerProduct(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    userId?: string | null;
    id?: string;
    externalKey: string;
    brand: string;
    name: string;
    physicalForm: 'solid' | 'liquid';
    doseUnit: 'g_per_L' | 'ml_per_L';
    densityGPerMl?: number | null;
    labelBasis?: 'w_w' | 'w_v' | null;
    nTotalIncludesForms?: boolean;
    metadata?: Record<string, unknown>;
    /** Update an existing row with the same external_key instead of inserting a second one. */
    matchExternalKey?: boolean;
    lines: FarmFertilizerLineInput[];
  },
) {
  const meta = {
    ...(params.metadata ?? {}),
    n_total_includes_forms:
      params.nTotalIncludesForms ?? Boolean(params.metadata?.n_total_includes_forms),
  };
  const productRow = {
    farm_id: params.farmId,
    external_key: params.externalKey,
    brand: params.brand,
    name: params.name,
    physical_form: params.physicalForm,
    dose_unit: params.doseUnit,
    density_g_per_ml: params.densityGPerMl ?? null,
    label_basis: params.labelBasis ?? null,
    metadata: meta,
    created_by: params.userId ?? null,
  };
  let productId = params.id;
  if (!productId && params.matchExternalKey) {
    const { data: existing, error: lookupError } = await supabase
      .from('farm_fertilizer_products')
      .select('id')
      .eq('farm_id', params.farmId)
      .eq('external_key', params.externalKey)
      .maybeSingle();
    if (lookupError) throw lookupError;
    productId = (existing?.id as string | undefined) ?? undefined;
  }
  if (productId) {
    const { error } = await supabase
      .from('farm_fertilizer_products')
      .update(productRow)
      .eq('id', productId)
      .eq('farm_id', params.farmId);
    if (error) throw error;
    await supabase.from('farm_fertilizer_composition_lines').delete().eq('farm_product_id', productId);
  } else {
    const { data, error } = await supabase
      .from('farm_fertilizer_products')
      .insert(productRow)
      .select('id')
      .single();
    if (error) throw error;
    productId = data.id as string;
  }
  if (params.lines.length) {
    const { error } = await supabase.from('farm_fertilizer_composition_lines').insert(
      params.lines.map((l) => ({
        farm_product_id: productId,
        form_key: l.form_key,
        value_pct: l.value_pct,
        n_form: l.n_form ?? null,
        metadata: l.metadata ?? {},
      })),
    );
    if (error) throw error;
  }
  return productId!;
}

export async function deleteFarmFertilizerProduct(
  supabase: SupabaseClient,
  farmId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('farm_fertilizer_products')
    .delete()
    .eq('id', id)
    .eq('farm_id', farmId);
  if (error) throw error;
}

export async function listFarmFeedSystems(supabase: SupabaseClient, farmId: string) {
  const { data, error } = await supabase
    .from('farm_feed_systems')
    .select('*')
    .eq('farm_id', farmId)
    .order('name');
  if (error) throw error;
  return (data ?? []) as FarmFeedSystemRow[];
}

export async function listFarmFeedSystemSteps(supabase: SupabaseClient, systemId: string) {
  const { data, error } = await supabase
    .from('farm_feed_system_steps')
    .select('*')
    .eq('system_id', systemId)
    .order('step_order');
  if (error) throw error;
  return (data ?? []) as FarmFeedSystemStepRow[];
}

export async function saveFarmFeedSystem(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    userId?: string | null;
    id?: string;
    name: string;
    notes?: string | null;
    steps: Array<Omit<FarmFeedSystemStepRow, 'id' | 'system_id' | 'farm_id'> & { id?: string }>;
  },
) {
  let systemId = params.id;
  if (systemId) {
    const { error } = await supabase
      .from('farm_feed_systems')
      .update({ name: params.name, notes: params.notes ?? null })
      .eq('id', systemId)
      .eq('farm_id', params.farmId);
    if (error) throw error;
    await supabase.from('farm_feed_system_steps').delete().eq('system_id', systemId);
  } else {
    const { data, error } = await supabase
      .from('farm_feed_systems')
      .insert({
        farm_id: params.farmId,
        name: params.name,
        notes: params.notes ?? null,
        created_by: params.userId ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;
    systemId = data.id as string;
  }
  if (params.steps.length) {
    const { error } = await supabase.from('farm_feed_system_steps').insert(
      params.steps.map((s) => ({
        system_id: systemId,
        farm_id: params.farmId,
        step_order: s.step_order,
        week_label: s.week_label,
        stage: s.stage,
        target_ppm: s.target_ppm,
        ph_target: s.ph_target,
        ec_target_ms_cm: s.ec_target_ms_cm,
        light_hours: s.light_hours,
        light_ppfd: s.light_ppfd,
        metadata: {},
      })),
    );
    if (error) throw error;
  }
  return systemId!;
}

export async function deleteFarmFeedSystem(
  supabase: SupabaseClient,
  farmId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase.from('farm_feed_systems').delete().eq('id', id).eq('farm_id', farmId);
  if (error) throw error;
}

export async function getGrowCycleNutrientPlan(supabase: SupabaseClient, cycleId: string) {
  const { data, error } = await supabase
    .from('grow_cycle_nutrient_plans')
    .select('*')
    .eq('cycle_id', cycleId)
    .maybeSingle();
  if (error) throw error;
  return data as GrowCycleNutrientPlanRow | null;
}

export async function setGrowCycleNutrientPlan(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    farmFeedSystemId: string;
    activeStepId?: string | null;
    userId?: string | null;
  },
) {
  const { data, error } = await supabase
    .from('grow_cycle_nutrient_plans')
    .upsert(
      {
        farm_id: params.farmId,
        cycle_id: params.cycleId,
        farm_feed_system_id: params.farmFeedSystemId,
        active_step_id: params.activeStepId ?? null,
        created_by: params.userId ?? null,
      },
      { onConflict: 'cycle_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as GrowCycleNutrientPlanRow;
}

export async function renameNutrientRecipe(
  supabase: SupabaseClient,
  farmId: string,
  recipeId: string,
  name: string,
): Promise<void> {
  const { error } = await supabase
    .from('nutrient_recipes')
    .update({ name })
    .eq('id', recipeId)
    .eq('farm_id', farmId);
  if (error) throw error;
}

export async function deleteNutrientRecipe(
  supabase: SupabaseClient,
  farmId: string,
  recipeId: string,
  options?: { allowLinkedEvent?: boolean },
): Promise<void> {
  const { data: row, error: readErr } = await supabase
    .from('nutrient_recipes')
    .select('linked_event_id')
    .eq('id', recipeId)
    .eq('farm_id', farmId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (row?.linked_event_id && !options?.allowLinkedEvent) {
    throw new Error('nutrient_recipe_has_feeding_event');
  }
  const { error } = await supabase
    .from('nutrient_recipes')
    .delete()
    .eq('id', recipeId)
    .eq('farm_id', farmId);
  if (error) throw error;
}

export async function copyGrowCycleNutrientPlan(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    sourceCycleId: string;
    targetCycleId: string;
    userId?: string | null;
  },
): Promise<void> {
  const plan = await getGrowCycleNutrientPlan(supabase, params.sourceCycleId);
  if (!plan) return;
  await setGrowCycleNutrientPlan(supabase, {
    farmId: params.farmId,
    cycleId: params.targetCycleId,
    farmFeedSystemId: plan.farm_feed_system_id,
    activeStepId: plan.active_step_id,
    userId: params.userId,
  });
}

export async function markGrowCycleHarvested(
  supabase: SupabaseClient,
  farmId: string,
  cycleId: string,
): Promise<void> {
  const { error } = await supabase
    .from('grow_cycles')
    .update({ status: 'harvested' })
    .eq('id', cycleId)
    .eq('farm_id', farmId);
  if (error) throw error;
}

export async function repeatNutrientRecipeInCycle(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    sourceRecipeId: string;
    targetCycleId: string;
    targetScopeId: string;
    newName?: string;
    userId?: string | null;
  },
): Promise<{ id: string }> {
  const { data: src, error } = await supabase
    .from('nutrient_recipes')
    .select('name')
    .eq('id', params.sourceRecipeId)
    .eq('farm_id', params.farmId)
    .single();
  if (error) throw error;
  const name = params.newName ?? `${src.name as string} (repeat)`;
  return duplicateNutrientRecipe(supabase, {
    farmId: params.farmId,
    sourceRecipeId: params.sourceRecipeId,
    newName: name,
    cycleId: params.targetCycleId,
    scopeId: params.targetScopeId,
    userId: params.userId,
    parentRecipeId: params.sourceRecipeId,
  });
}

export async function duplicateNutrientRecipe(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    sourceRecipeId: string;
    newName: string;
    cycleId?: string | null;
    scopeId?: string | null;
    userId?: string | null;
    parentRecipeId?: string | null;
  },
): Promise<{ id: string }> {
  const { data: src, error } = await supabase
    .from('nutrient_recipes')
    .select('*')
    .eq('id', params.sourceRecipeId)
    .eq('farm_id', params.farmId)
    .single();
  if (error) throw error;
  const { data: recipe, error: insErr } = await supabase
    .from('nutrient_recipes')
    .insert({
      farm_id: params.farmId,
      name: params.newName,
      volume_l: src.volume_l,
      solution_kind: src.solution_kind,
      cycle_id: params.cycleId ?? src.cycle_id,
      scope_id: params.scopeId ?? src.scope_id,
      target_profile_id: src.target_profile_id,
      feed_schedule_id: src.feed_schedule_id,
      farm_feed_system_id: src.farm_feed_system_id,
      farm_feed_system_step_id: src.farm_feed_system_step_id,
      parent_recipe_id: params.parentRecipeId ?? params.sourceRecipeId,
      mode: src.mode,
      inputs: src.inputs,
      result: src.result,
      solver_version: src.solver_version,
      created_by: params.userId ?? null,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;
  const { data: doses } = await supabase
    .from('nutrient_recipe_doses')
    .select('*')
    .eq('recipe_id', params.sourceRecipeId);
  if (doses?.length) {
    await supabase.from('nutrient_recipe_doses').insert(
      doses.map((d) => ({
        recipe_id: recipe.id,
        fertilizer_product_id: d.fertilizer_product_id,
        farm_fertilizer_product_id: d.farm_fertilizer_product_id,
        fertilizer_label: d.fertilizer_label,
        dose_per_l: d.dose_per_l,
        unit: d.unit,
        tank: d.tank,
      })),
    );
  }
  return { id: recipe.id as string };
}

export async function saveNutrientRecipeWithMeta(
  supabase: SupabaseClient,
  input: {
    farmId: string;
    name: string;
    volumeL: number;
    solutionKind: NutrientSolutionKind;
    cycleId?: string | null;
    scopeId?: string | null;
    targetProfileId?: string | null;
    feedScheduleId?: string | null;
    farmFeedSystemId?: string | null;
    farmFeedSystemStepId?: string | null;
    parentRecipeId?: string | null;
    inputs: Record<string, unknown>;
    result: SolveForwardResult;
    solverVersion: string;
    userId?: string | null;
  },
): Promise<{ id: string }> {
  const { data: recipe, error } = await supabase
    .from('nutrient_recipes')
    .insert({
      farm_id: input.farmId,
      name: input.name,
      volume_l: input.volumeL,
      solution_kind: input.solutionKind,
      cycle_id: input.cycleId ?? null,
      scope_id: input.scopeId ?? null,
      target_profile_id: input.targetProfileId ?? null,
      feed_schedule_id: input.feedScheduleId ?? null,
      farm_feed_system_id: input.farmFeedSystemId ?? null,
      farm_feed_system_step_id: input.farmFeedSystemStepId ?? null,
      parent_recipe_id: input.parentRecipeId ?? null,
      mode: 'forward',
      inputs: input.inputs,
      result: input.result as unknown as Record<string, unknown>,
      solver_version: input.solverVersion,
      created_by: input.userId ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;

  const doses = input.result.best.doses.map((d) => ({
    recipe_id: recipe.id,
    fertilizer_product_id: d.fertilizerId.startsWith('farm:') ? null : d.fertilizerId,
    farm_fertilizer_product_id: d.fertilizerId.startsWith('farm:')
      ? d.fertilizerId.replace('farm:', '')
      : null,
    fertilizer_label: d.fertilizerName,
    dose_per_l: d.amountPerL,
    unit: d.unit,
    tank: d.tank ?? 'single',
  }));

  if (doses.length > 0) {
    const { error: doseErr } = await supabase.from('nutrient_recipe_doses').insert(doses);
    if (doseErr) throw doseErr;
  }

  return { id: recipe.id as string };
}

export async function logFeedingFromNutrientRecipe(
  supabase: SupabaseClient,
  params: {
    farmId: string;
    cycleId: string;
    scopeId: string;
    recipeId: string;
    recipeName: string;
    volumeL: number;
    userId?: string | null;
    /** Localized timeline body; defaults to English if omitted. */
    body?: string;
  },
): Promise<{ eventId: string }> {
  const body =
    params.body ??
    `Nutrient mix: ${params.recipeName} (${params.volumeL} L)`;
  const logged = await createLogEntry(supabase, {
    farmId: params.farmId,
    cycleId: params.cycleId,
    scopeId: params.scopeId,
    eventType: 'feeding',
    body,
    occurredAt: new Date().toISOString(),
    sourceType: 'user_text',
    createdBy: params.userId ?? null,
    payload: {
      nutrient_recipe_id: params.recipeId,
      volume_l: params.volumeL,
    },
  });

  const eventId = String((logged.event as { id: string }).id);
  const { error } = await supabase
    .from('nutrient_recipes')
    .update({ linked_event_id: eventId })
    .eq('id', params.recipeId)
    .eq('farm_id', params.farmId);
  if (error) throw error;

  return { eventId };
}
