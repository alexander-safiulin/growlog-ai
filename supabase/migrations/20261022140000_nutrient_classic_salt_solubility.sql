-- ADR-014 P3: classic single-salt catalog products with solubility_key metadata (idempotent).

insert into public.nutrient_data_sources (
  id, slug, name, source_type, citation, url, license, retrieved_at, verification_status, trust_level
) values (
  '73ed614d-2c5b-47ea-a853-1e03ce6af322'::uuid,
  'growlog-scientific-canonical',
  'Growlog scientific canonical references',
  'reference',
  'Classic hydroponic salts — solubility from CRC Handbook',
  null,
  'CC-BY-SA-4.0 (Growlog compilation)',
  '2026-10-22T00:00:00Z'::timestamptz,
  'spot_checked'::public.nutrient_verification_status,
  'high'::public.nutrient_trust_level
) on conflict (slug) do nothing;

-- Stable ids for classic salts (deterministic seeds).
insert into public.fertilizer_products (
  id, external_key, brand, name, physical_form, dose_unit, source_id, license, retrieved_at,
  trust_level, verification_status, metadata
) values
  ('a1000001-0001-4001-8001-000000000001'::uuid, 'growlog-classic-salt|KNO3', 'Growlog classic salt', 'KNO3', 'solid', 'g_per_L',
   '73ed614d-2c5b-47ea-a853-1e03ce6af322'::uuid, 'CC-BY-SA-4.0', '2026-10-22T00:00:00Z'::timestamptz, 'high', 'spot_checked',
   '{"solubility_key":"KNO3"}'::jsonb),
  ('a1000001-0001-4001-8001-000000000002'::uuid, 'growlog-classic-salt|Ca(NO3)2·4H2O', 'Growlog classic salt', 'Ca(NO3)2·4H2O', 'solid', 'g_per_L',
   '73ed614d-2c5b-47ea-a853-1e03ce6af322'::uuid, 'CC-BY-SA-4.0', '2026-10-22T00:00:00Z'::timestamptz, 'high', 'spot_checked',
   '{"solubility_key":"Ca(NO3)2·4H2O"}'::jsonb),
  ('a1000001-0001-4001-8001-000000000003'::uuid, 'growlog-classic-salt|MgSO4·7H2O', 'Growlog classic salt', 'MgSO4·7H2O', 'solid', 'g_per_L',
   '73ed614d-2c5b-47ea-a853-1e03ce6af322'::uuid, 'CC-BY-SA-4.0', '2026-10-22T00:00:00Z'::timestamptz, 'high', 'spot_checked',
   '{"solubility_key":"MgSO4·7H2O"}'::jsonb),
  ('a1000001-0001-4001-8001-000000000004'::uuid, 'growlog-classic-salt|KH2PO4', 'Growlog classic salt', 'KH2PO4', 'solid', 'g_per_L',
   '73ed614d-2c5b-47ea-a853-1e03ce6af322'::uuid, 'CC-BY-SA-4.0', '2026-10-22T00:00:00Z'::timestamptz, 'high', 'spot_checked',
   '{"solubility_key":"KH2PO4"}'::jsonb),
  ('a1000001-0001-4001-8001-000000000005'::uuid, 'growlog-classic-salt|NaH2PO4·2H2O', 'Growlog classic salt', 'NaH2PO4·2H2O', 'solid', 'g_per_L',
   '73ed614d-2c5b-47ea-a853-1e03ce6af322'::uuid, 'CC-BY-SA-4.0', '2026-10-22T00:00:00Z'::timestamptz, 'high', 'spot_checked',
   '{"solubility_key":"NaH2PO4·2H2O"}'::jsonb),
  ('a1000001-0001-4001-8001-000000000006'::uuid, 'growlog-classic-salt|K2SO4', 'Growlog classic salt', 'K2SO4', 'solid', 'g_per_L',
   '73ed614d-2c5b-47ea-a853-1e03ce6af322'::uuid, 'CC-BY-SA-4.0', '2026-10-22T00:00:00Z'::timestamptz, 'high', 'spot_checked',
   '{"solubility_key":"K2SO4"}'::jsonb),
  ('a1000001-0001-4001-8001-000000000007'::uuid, 'growlog-classic-salt|NH4NO3', 'Growlog classic salt', 'NH4NO3', 'solid', 'g_per_L',
   '73ed614d-2c5b-47ea-a853-1e03ce6af322'::uuid, 'CC-BY-SA-4.0', '2026-10-22T00:00:00Z'::timestamptz, 'high', 'spot_checked',
   '{"solubility_key":"NH4NO3"}'::jsonb),
  ('a1000001-0001-4001-8001-000000000008'::uuid, 'growlog-classic-salt|Mg(NO3)2·6H2O', 'Growlog classic salt', 'Mg(NO3)2·6H2O', 'solid', 'g_per_L',
   '73ed614d-2c5b-47ea-a853-1e03ce6af322'::uuid, 'CC-BY-SA-4.0', '2026-10-22T00:00:00Z'::timestamptz, 'high', 'spot_checked',
   '{"solubility_key":"Mg(NO3)2·6H2O"}'::jsonb)
on conflict (external_key) do update set
  metadata = excluded.metadata,
  updated_at = now();
