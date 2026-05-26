-- The admin Featured analytics dashboard read impressions from
-- featured_placement_analytics (which only ever receives card "click" events),
-- then FABRICATED impressions (days*50) and used a profile-view "click proxy"
-- when no data existed — so admins saw invented numbers that diverged from the
-- provider widget + get-facility-analytics (both read featured_impressions +
-- featured_phone_clicks).
--
-- This RPC returns the REAL per-facility impression + phone-click counts for a
-- pool of facilities over a window, in one query, so the dashboard can drop the
-- fabrication. Admin-gated (security definer).

create or replace function public.get_featured_pool_analytics(
  p_facility_ids uuid[],
  p_since timestamptz
)
returns table (facility_id uuid, impressions bigint, phone_clicks bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin((select auth.uid())) then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return query
  select f.fid as facility_id,
         coalesce(i.cnt, 0)::bigint as impressions,
         coalesce(c.cnt, 0)::bigint as phone_clicks
  from unnest(p_facility_ids) as f(fid)
  left join (
    select fi.facility_id, count(*) as cnt
    from public.featured_impressions fi
    where fi.facility_id = any(p_facility_ids) and fi.occurred_at >= p_since
    group by fi.facility_id
  ) i on i.facility_id = f.fid
  left join (
    select fpc.facility_id, count(*) as cnt
    from public.featured_phone_clicks fpc
    where fpc.facility_id = any(p_facility_ids) and fpc.clicked_at >= p_since
    group by fpc.facility_id
  ) c on c.facility_id = f.fid;
end;
$$;

revoke execute on function public.get_featured_pool_analytics(uuid[], timestamptz) from public, anon;
grant execute on function public.get_featured_pool_analytics(uuid[], timestamptz) to authenticated;
