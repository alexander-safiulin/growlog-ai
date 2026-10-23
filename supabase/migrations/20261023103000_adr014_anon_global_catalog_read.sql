-- ADR-014 guest mode: ensure anonymous read of global nutrient catalog only.
-- Farm-scoped nutrient tables remain authenticated + membership RLS (no anon policies).

-- Re-assert SELECT grants for global reference tables (idempotent).
grant select on public.nutrient_data_sources to anon, authenticated;
grant select on public.nutrient_elements to anon, authenticated;
grant select on public.nutrient_oxide_factors to anon, authenticated;
grant select on public.fertilizer_products to anon, authenticated;
grant select on public.fertilizer_composition_lines to anon, authenticated;
grant select on public.target_solution_profiles to anon, authenticated;
grant select on public.feed_schedules to anon, authenticated;
grant select on public.feed_schedule_steps to anon, authenticated;
grant select on public.fertilizer_product_aliases to anon, authenticated;
grant select on public.nutrient_catalog_recipes to anon, authenticated;
grant select on public.nutrient_catalog_recipe_lines to anon, authenticated;
grant select on public.nutrient_incompatibility_rules to anon, authenticated;

-- Explicit anon deny on farm nutrient workspace (defense in depth if grants drift).
revoke all on public.farm_water_profiles from anon;
revoke all on public.farm_fertilizer_products from anon;
revoke all on public.farm_fertilizer_composition_lines from anon;
revoke all on public.nutrient_recipes from anon;
revoke all on public.nutrient_recipe_doses from anon;
revoke all on public.farm_feed_systems from anon;
revoke all on public.farm_feed_system_steps from anon;
revoke all on public.farm_nutrient_favorites from anon;
revoke all on public.grow_cycle_nutrient_plans from anon;
