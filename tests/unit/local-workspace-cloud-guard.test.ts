import { describe, expect, it } from 'vitest';
import {
  fetchJournalRecipePrefillId,
  fetchNutrientPlanStepRecipeHint,
  fetchScopesForCycle,
  getGrowCycleNutrientPlan,
  LOCAL_WORKSPACE_IDS,
} from '@growlog/domain';
import type { SupabaseClient } from '@supabase/supabase-js';

function clientThatMustNotBeQueried(): SupabaseClient {
  return {
    from() {
      throw new Error('sentinel id reached supabase');
    },
  } as unknown as SupabaseClient;
}

describe('local workspace ids stay off cloud queries', () => {
  it('does not query a nutrient plan for the on-device cycle id', async () => {
    const supabase = clientThatMustNotBeQueried();
    await expect(fetchNutrientPlanStepRecipeHint(supabase, LOCAL_WORKSPACE_IDS.cycle)).resolves.toBeNull();
    await expect(getGrowCycleNutrientPlan(supabase, LOCAL_WORKSPACE_IDS.cycle)).resolves.toBeNull();
    await expect(fetchScopesForCycle(supabase, LOCAL_WORKSPACE_IDS.cycle)).resolves.toEqual([]);
  });

  it('uses only the on-device recipe hint when the cycle id is a sentinel', async () => {
    const supabase = clientThatMustNotBeQueried();
    await expect(
      fetchJournalRecipePrefillId(supabase, {
        cycleId: LOCAL_WORKSPACE_IDS.cycle,
        stage: 'veg',
        localHint: { recipeId: 'guest-recipe', weekLabel: 'Week 1' },
      }),
    ).resolves.toBe('guest-recipe');
    await expect(
      fetchJournalRecipePrefillId(supabase, {
        cycleId: LOCAL_WORKSPACE_IDS.cycle,
        stage: 'veg',
      }),
    ).resolves.toBeNull();
  });
});
