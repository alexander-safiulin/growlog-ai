-- ADR-014 P3: drop legacy aggregate N from published_ppm_macros (N_NO3 is canonical).

update public.nutrient_catalog_recipes
set metadata = metadata #- '{published_ppm_macros,N}',
    updated_at = now()
where slug in ('hoagland-standard-salts', 'long-ashton-salts');
