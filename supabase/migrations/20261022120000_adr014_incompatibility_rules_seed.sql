-- ADR-014 P3: idempotent A/B stock incompatibility rules (Ca vs sulfate/phosphate).

insert into public.nutrient_data_sources (
  id, slug, name, source_type, citation, url, license, retrieved_at, verification_status, trust_level
) values (
  '73ed614d-2c5b-47ea-a853-1e03ce6af322'::uuid,
  'growlog-scientific-canonical',
  'Growlog scientific canonical references',
  'reference',
  'Hydroponic stock-tank practice and precipitation chemistry (Ca2+ with SO4 2- / PO4 3-)',
  'https://scienceinhydroponics.com/',
  'CC-BY-SA-4.0 (Growlog compilation)',
  '2026-10-22T00:00:00Z'::timestamptz,
  'spot_checked'::public.nutrient_verification_status,
  'high'::public.nutrient_trust_level
) on conflict (slug) do nothing;

insert into public.nutrient_incompatibility_rules (
  rule_code,
  description,
  form_keys_a,
  form_keys_b,
  severity,
  source_id,
  license,
  retrieved_at,
  trust_level
) values (
  'ca_vs_sulfate_stock',
  'Calcium-bearing fertilizers must not share concentrated stock with sulfate donors (gypsum precipitation risk).',
  array['Ca', 'CaO', 'Ca(NO3)', 'Ca(NO3)2', 'Ca(NO3)2·4H2O', 'CaCO3'],
  array['SO4', 'SO3', 'S', 'MgSO4', 'MgSO4*7H2O'],
  'hard',
  '73ed614d-2c5b-47ea-a853-1e03ce6af322'::uuid,
  'CC-BY-SA-4.0 (Growlog compilation)',
  '2026-10-22T00:00:00Z'::timestamptz,
  'high'::public.nutrient_trust_level
) on conflict (rule_code) do update set
  description = excluded.description,
  form_keys_a = excluded.form_keys_a,
  form_keys_b = excluded.form_keys_b,
  severity = excluded.severity,
  source_id = excluded.source_id,
  license = excluded.license,
  retrieved_at = excluded.retrieved_at,
  trust_level = excluded.trust_level,
  updated_at = now();

insert into public.nutrient_incompatibility_rules (
  rule_code,
  description,
  form_keys_a,
  form_keys_b,
  severity,
  source_id,
  license,
  retrieved_at,
  trust_level
) values (
  'ca_vs_phosphate_stock',
  'Calcium-bearing fertilizers must not share concentrated stock with phosphate donors (TCP / brushite precipitation risk).',
  array['Ca', 'CaO', 'Ca(NO3)', 'Ca(NO3)2', 'Ca(NO3)2·4H2O', 'CaCO3'],
  array['P', 'P2O5', 'PO4', 'H2PO4', 'HPO4', 'KH2PO4', 'NaH2PO4'],
  'hard',
  '73ed614d-2c5b-47ea-a853-1e03ce6af322'::uuid,
  'CC-BY-SA-4.0 (Growlog compilation)',
  '2026-10-22T00:00:00Z'::timestamptz,
  'high'::public.nutrient_trust_level
) on conflict (rule_code) do update set
  description = excluded.description,
  form_keys_a = excluded.form_keys_a,
  form_keys_b = excluded.form_keys_b,
  severity = excluded.severity,
  source_id = excluded.source_id,
  license = excluded.license,
  retrieved_at = excluded.retrieved_at,
  trust_level = excluded.trust_level,
  updated_at = now();
