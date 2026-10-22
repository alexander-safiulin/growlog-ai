import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20261022170000_adr014_p5_user_workspace.sql'),
  'utf8',
);

describe('ADR-014 P5 migration (farm user data RLS)', () => {
  it('defines farm_nutrient_favorites with user-scoped policies', () => {
    expect(migration).toContain('create table public.farm_nutrient_favorites');
    expect(migration).toContain('farm_nutrient_favorites_select');
    expect(migration).toContain('user_id = auth.uid()');
    expect(migration).toContain('farm_id in (select public.user_farm_ids())');
    expect(migration).toContain('user_can_manage_farm_nutrient');
  });

  it('extends nutrient_recipes for timeline and solution kinds', () => {
    expect(migration).toContain('nutrient_solution_kind');
    expect(migration).toContain('linked_event_id');
    expect(migration).toContain('parent_recipe_id');
    expect(migration).toContain('feed_schedule_id');
  });
});
