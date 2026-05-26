-- track-featured-analytics did a non-atomic select-then-update/insert to bump
-- featured_placement_analytics.event_count, so concurrent events for the same
-- (facility_id, event_type, event_date) could lose increments or collide on the
-- unique index. Replace it with an atomic upsert-increment via this RPC, which
-- relies on the existing unique index
-- (facility_id, event_type, event_date).

create or replace function public.increment_featured_event(
  p_facility_id uuid,
  p_event_type text,
  p_event_date date,
  p_metadata jsonb default '{}'::jsonb
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.featured_placement_analytics
    (facility_id, event_type, event_date, event_count, metadata)
  values
    (p_facility_id, p_event_type, p_event_date, 1, coalesce(p_metadata, '{}'::jsonb))
  on conflict (facility_id, event_type, event_date)
  do update set
    event_count = public.featured_placement_analytics.event_count + 1,
    metadata = coalesce(excluded.metadata, public.featured_placement_analytics.metadata);
$$;

-- Only the track-featured-analytics edge function (service role) calls this.
revoke execute on function public.increment_featured_event(uuid, text, date, jsonb) from public, anon, authenticated;
