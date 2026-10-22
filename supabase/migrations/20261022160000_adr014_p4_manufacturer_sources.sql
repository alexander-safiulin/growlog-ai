-- ADR-014 P4: manufacturer provenance sources, GHE Flora feed chart, HydroBuddy salt (idempotent).

insert into public.nutrient_data_sources (
  id, slug, name, source_type, citation, url, license, retrieved_at, verification_status, trust_level, notes
) values
  (
    '863eb08c-0bbe-43da-adfa-7549f78a5b94'::uuid,
    'terra-aquatica-ghe-flora-feedchart',
    'Terra Aquatica Flora Series feed charts',
    'manufacturer_feedchart',
    'Terra Aquatica Growers Corner — Flora Series feeding programs (ml/L).',
    'https://www.terraaquatica.com/growers-corner/feed-charts/',
    'Manufacturer published chart; verify before redistribution.',
    '2026-10-22T00:00:00Z'::timestamptz,
    'spot_checked'::public.nutrient_verification_status,
    'high'::public.nutrient_trust_level,
    '{"provenance_class":"manufacturer_feedchart","catalog_version":"p4-2026-10-22"}'::jsonb
  ),
  (
    '69fd1994-9ce2-4805-a898-a1fef97d7236'::uuid,
    'hydrobuddy-salts-community',
    'HydroBuddy salt composition reference',
    'open_source_db',
    'HydroBuddy (GPL upstream); facts re-verified independently.',
    'https://github.com/danielfppps/hydrobuddy',
    'Facts transcribed independently; no GPL code in Growlog repo.',
    '2026-10-22T00:00:00Z'::timestamptz,
    'spot_checked'::public.nutrient_verification_status,
    'low'::public.nutrient_trust_level,
    '{"provenance_class":"community"}'::jsonb
  ),
  (
    '7acc36bf-c445-407a-a3f9-700917bbf62b'::uuid,
    'advanced-nutrients-external-ref',
    'Advanced Nutrients (external reference)',
    'external_reference',
    'Not imported in P4 — awaiting public label snapshots.',
    'https://www.advancednutrients.com/',
    'Manufacturer site; data not imported.',
    '2026-10-22T00:00:00Z'::timestamptz,
    'unverified'::public.nutrient_verification_status,
    'unverified'::public.nutrient_trust_level,
    '{"provenance_class":"manufacturer_label","not_imported":true}'::jsonb
  ),
  (
    'a8f3e1c2-4b5d-6e7f-8091-a2b3c4d5e6f7'::uuid,
    'canna-external-ref',
    'Canna (external reference)',
    'external_reference',
    'Not imported in P4.',
    'https://www.canna.com/',
    'Manufacturer site; data not imported.',
    '2026-10-22T00:00:00Z'::timestamptz,
    'unverified'::public.nutrient_verification_status,
    'unverified'::public.nutrient_trust_level,
    '{"provenance_class":"manufacturer_label","not_imported":true}'::jsonb
  ),
  (
    'b9e4f2d3-5c6e-7f80-9123-b4c5d6e7f809'::uuid,
    'biobizz-external-ref',
    'BioBizz (external reference)',
    'external_reference',
    'Not imported in P4.',
    'https://www.biobizz.com/',
    'Manufacturer site; data not imported.',
    '2026-10-22T00:00:00Z'::timestamptz,
    'unverified'::public.nutrient_verification_status,
    'unverified'::public.nutrient_trust_level,
    '{"provenance_class":"manufacturer_label","not_imported":true}'::jsonb
  ),
  (
    'cae5a3e4-6d7f-8091-a234-c5d6e7f8091a'::uuid,
    'athena-external-ref',
    'Athena (external reference)',
    'external_reference',
    'Not imported in P4.',
    'https://www.athenaag.com/',
    'Manufacturer site; data not imported.',
    '2026-10-22T00:00:00Z'::timestamptz,
    'unverified'::public.nutrient_verification_status,
    'unverified'::public.nutrient_trust_level,
    '{"provenance_class":"manufacturer_feedchart","not_imported":true}'::jsonb
  ),
  (
    'dbf6b4f5-7e80-9123-b345-d6e7f8091a2b'::uuid,
    'plagron-external-ref',
    'Plagron (external reference)',
    'external_reference',
    'Not imported in P4.',
    'https://www.plagron.com/',
    'Manufacturer site; data not imported.',
    '2026-10-22T00:00:00Z'::timestamptz,
    'unverified'::public.nutrient_verification_status,
    'unverified'::public.nutrient_trust_level,
    '{"provenance_class":"manufacturer_label","not_imported":true}'::jsonb
  ),
  (
    'ecf7c506-8f91-a234-c456-e7f8091a2b3c'::uuid,
    'house-garden-external-ref',
    'House & Garden (external reference)',
    'external_reference',
    'Not imported in P4.',
    'https://www.house-garden.com/',
    'Manufacturer site; data not imported.',
    '2026-10-22T00:00:00Z'::timestamptz,
    'unverified'::public.nutrient_verification_status,
    'unverified'::public.nutrient_trust_level,
    '{"provenance_class":"manufacturer_feedchart","not_imported":true}'::jsonb
  )
on conflict (slug) do update set
  name = excluded.name,
  citation = excluded.citation,
  url = excluded.url,
  license = excluded.license,
  retrieved_at = excluded.retrieved_at,
  verification_status = excluded.verification_status,
  trust_level = excluded.trust_level,
  notes = excluded.notes,
  updated_at = now();

-- GHE Flora 3-part feed schedule (soft water veg mid strength).
insert into public.feed_schedules (
  id, slug, name, manufacturer, profile_id, source_id, license, retrieved_at, trust_level, verification_status, metadata
) values (
  '6840975b-ce73-498b-a788-179c7db4bbdd'::uuid,
  'ghe-flora-3part-softwater-veg-mid',
  'Flora 3-part — soft water, vegetative (mid strength)',
  'Terra Aquatica / GHE',
  null,
  '863eb08c-0bbe-43da-adfa-7549f78a5b94'::uuid,
  'Manufacturer published chart; verify before redistribution.',
  '2026-10-22T00:00:00Z'::timestamptz,
  'high'::public.nutrient_trust_level,
  'spot_checked'::public.nutrient_verification_status,
  '{"provenance_class":"manufacturer_feedchart","chart_url":"https://www.terraaquatica.com/growers-corner/feed-charts/"}'::jsonb
) on conflict (slug) do update set
  name = excluded.name,
  manufacturer = excluded.manufacturer,
  source_id = excluded.source_id,
  license = excluded.license,
  retrieved_at = excluded.retrieved_at,
  trust_level = excluded.trust_level,
  verification_status = excluded.verification_status,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.feed_schedule_steps (
  schedule_id, step_order, label, profile_id, notes, source_id, license, retrieved_at, trust_level
) values
  (
    (select id from public.feed_schedules where slug = 'ghe-flora-3part-softwater-veg-mid'),
    1,
    'FloraGro',
    null,
    '{"product_external_key":"ghe (general hydroponics) france|floragro","dose_per_l":4,"unit":"ml_per_L"}'::text,
    '863eb08c-0bbe-43da-adfa-7549f78a5b94'::uuid,
    'Manufacturer published chart; verify before redistribution.',
    '2026-10-22T00:00:00Z'::timestamptz,
    'high'::public.nutrient_trust_level
  ),
  (
    (select id from public.feed_schedules where slug = 'ghe-flora-3part-softwater-veg-mid'),
    2,
    'FloraMicro Softwater',
    null,
    '{"product_external_key":"ghe (general hydroponics) france|floramicro softwater","dose_per_l":4,"unit":"ml_per_L"}'::text,
    '863eb08c-0bbe-43da-adfa-7549f78a5b94'::uuid,
    'Manufacturer published chart; verify before redistribution.',
    '2026-10-22T00:00:00Z'::timestamptz,
    'high'::public.nutrient_trust_level
  ),
  (
    (select id from public.feed_schedules where slug = 'ghe-flora-3part-softwater-veg-mid'),
    3,
    'FloraBloom',
    null,
    '{"product_external_key":"ghe (general hydroponics) france|florabloom","dose_per_l":0,"unit":"ml_per_L"}'::text,
    '863eb08c-0bbe-43da-adfa-7549f78a5b94'::uuid,
    'Manufacturer published chart; verify before redistribution.',
    '2026-10-22T00:00:00Z'::timestamptz,
    'high'::public.nutrient_trust_level
  )
on conflict (schedule_id, step_order) do update set
  label = excluded.label,
  notes = excluded.notes,
  source_id = excluded.source_id,
  license = excluded.license,
  retrieved_at = excluded.retrieved_at,
  trust_level = excluded.trust_level,
  updated_at = now();

-- Link GHE France Flora SKUs to manufacturer label provenance.
update public.fertilizer_products fp
set metadata = coalesce(fp.metadata, '{}'::jsonb) || jsonb_build_object(
      'provenance_class', 'manufacturer_label',
      'label_url', 'https://www.terraaquatica.com/product/flora-series/',
      'manufacturer_source_slug', 'terra-aquatica-ghe-flora-feedchart'
    ),
    source_id = '863eb08c-0bbe-43da-adfa-7549f78a5b94'::uuid,
    trust_level = 'high'::public.nutrient_trust_level,
    verification_status = 'spot_checked'::public.nutrient_verification_status,
    retrieved_at = '2026-10-22T00:00:00Z'::timestamptz,
    updated_at = now()
where fp.external_key in (
  'ghe (general hydroponics) france|floragro',
  'ghe (general hydroponics) france|floramicro softwater',
  'ghe (general hydroponics) france|florabloom'
);

-- HydroBuddy community salt (skip if external_key already present).
insert into public.fertilizer_products (
  id, external_key, brand, name, physical_form, dose_unit, is_custom, source_id, license, retrieved_at,
  trust_level, verification_status, metadata
) values (
  'd6fa069e-5acd-4255-a499-51be7d21fa60'::uuid,
  'hydrobuddy|k2so4',
  'HydroBuddy reference',
  'K2SO4 (potassium sulfate)',
  'solid',
  'g_per_L',
  false,
  '69fd1994-9ce2-4805-a898-a1fef97d7236'::uuid,
  'Facts transcribed independently; upstream HydroBuddy GPL.',
  '2026-10-22T00:00:00Z'::timestamptz,
  'low'::public.nutrient_trust_level,
  'spot_checked'::public.nutrient_verification_status,
  '{"provenance_class":"community","citation":"Typical fertilizer-grade K2SO4; CRC stoichiometry spot-check."}'::jsonb
) on conflict (external_key) do update set
  source_id = excluded.source_id,
  metadata = excluded.metadata,
  trust_level = excluded.trust_level,
  verification_status = excluded.verification_status,
  retrieved_at = excluded.retrieved_at,
  updated_at = now();

insert into public.fertilizer_composition_lines (
  product_id, form_key, value_pct, source_id, license, retrieved_at, trust_level, verification_status
) values
  (
    (select id from public.fertilizer_products where external_key = 'hydrobuddy|k2so4'),
    'K2O',
    53,
    '69fd1994-9ce2-4805-a898-a1fef97d7236'::uuid,
    'Facts transcribed independently; upstream HydroBuddy GPL.',
    '2026-10-22T00:00:00Z'::timestamptz,
    'low'::public.nutrient_trust_level,
    'spot_checked'::public.nutrient_verification_status
  ),
  (
    (select id from public.fertilizer_products where external_key = 'hydrobuddy|k2so4'),
    'S',
    18,
    '69fd1994-9ce2-4805-a898-a1fef97d7236'::uuid,
    'Facts transcribed independently; upstream HydroBuddy GPL.',
    '2026-10-22T00:00:00Z'::timestamptz,
    'low'::public.nutrient_trust_level,
    'spot_checked'::public.nutrient_verification_status
  )
on conflict (product_id, form_key) do update set
  value_pct = excluded.value_pct,
  source_id = excluded.source_id,
  retrieved_at = excluded.retrieved_at,
  updated_at = now();

-- Tag Hydroodo catalog with legacy provenance (metadata only).
update public.fertilizer_products fp
set metadata = coalesce(fp.metadata, '{}'::jsonb) || '{"provenance_class":"hydroodo_legacy"}'::jsonb,
    updated_at = now()
where fp.source_id = (select id from public.nutrient_data_sources where slug = 'hydroodo-0.4b18')
  and (fp.metadata->>'provenance_class') is null;
