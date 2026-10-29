-- Link a photo_capture media asset to a parent timeline event (e.g. procedure action_taken).

create or replace function public.link_media_to_event(
  p_farm_id uuid,
  p_parent_event_id uuid,
  p_media_asset_id uuid,
  p_photo_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent public.events;
  v_photo public.events;
  v_asset public.media_assets;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_farm_id is null or p_farm_id not in (select public.user_farm_ids()) then
    raise exception 'Invalid farm access';
  end if;

  select * into v_parent
  from public.events
  where id = p_parent_event_id and farm_id = p_farm_id;

  if v_parent.id is null then
    raise exception 'Parent event not found';
  end if;

  select * into v_photo
  from public.events
  where id = p_photo_event_id and farm_id = p_farm_id;

  if v_photo.id is null then
    raise exception 'Photo event not found';
  end if;
  if v_photo.event_type <> 'photo_capture' then
    raise exception 'Photo event must be photo_capture';
  end if;

  select * into v_asset
  from public.media_assets
  where id = p_media_asset_id and farm_id = p_farm_id;

  if v_asset.id is null then
    raise exception 'Media asset not found';
  end if;

  update public.events
  set payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
    'media_asset_id', p_media_asset_id,
    'storage_path', v_asset.storage_path
  )
  where id = p_parent_event_id and farm_id = p_farm_id;

  update public.events
  set payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
    'parent_event_id', p_parent_event_id::text
  )
  where id = p_photo_event_id and farm_id = p_farm_id;

  if not exists (
    select 1 from public.event_entities
    where farm_id = p_farm_id
      and event_id = p_parent_event_id
      and entity_type = 'photo'
      and entity_id = p_media_asset_id
  ) then
    insert into public.event_entities (farm_id, event_id, entity_type, entity_id, role)
    values (p_farm_id, p_parent_event_id, 'photo', p_media_asset_id, 'attachment');
  end if;

  return jsonb_build_object(
    'parent_event_id', p_parent_event_id,
    'photo_event_id', p_photo_event_id,
    'media_asset_id', p_media_asset_id
  );
end;
$$;

grant execute on function public.link_media_to_event(uuid, uuid, uuid, uuid) to authenticated;
