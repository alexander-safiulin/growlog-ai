-- Grower-facing RU label for curing stage (пролечка).

create or replace function public.grower_stage_label_ru(p_stage text)
returns text
language sql
immutable
as $$
  select case p_stage
    when 'propagation' then 'проращивание'
    when 'veg' then 'вегетация'
    when 'preflower' then 'предцвет'
    when 'flower' then 'цветение'
    when 'drying' then 'сушка'
    when 'curing' then 'пролечка'
    when 'completed' then 'завершён'
    else coalesce(p_stage, '')
  end;
$$;
