-- ADR-014 P3: tag existing single-salt Hydroodo products with solubility_key (idempotent).

update public.fertilizer_products
set metadata = coalesce(metadata, '{}'::jsonb) || '{"solubility_key":"Ca(NO3)2·4H2O"}'::jsonb,
    updated_at = now()
where external_key = 'буйские удобрения|кальциевая селитра';

update public.fertilizer_products
set metadata = coalesce(metadata, '{}'::jsonb) || '{"solubility_key":"K2SO4"}'::jsonb,
    updated_at = now()
where external_key = 'буйские удобрения|сульфат калия';

update public.fertilizer_products
set metadata = coalesce(metadata, '{}'::jsonb) || '{"solubility_key":"Mg(NO3)2·6H2O"}'::jsonb,
    updated_at = now()
where external_key = 'буйские удобрения|магниевая селитра';

update public.fertilizer_products
set metadata = coalesce(metadata, '{}'::jsonb) || '{"solubility_key":"KH2PO4"}'::jsonb,
    updated_at = now()
where external_key = 'буйские удобрения|монофосфат калия';

update public.fertilizer_products
set metadata = coalesce(metadata, '{}'::jsonb) || '{"solubility_key":"MgSO4·7H2O"}'::jsonb,
    updated_at = now()
where external_key = 'буйские удобрения|сульфат магния';
