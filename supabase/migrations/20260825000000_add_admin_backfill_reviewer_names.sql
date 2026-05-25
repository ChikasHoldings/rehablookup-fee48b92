-- Super-admin maintenance RPC: backfill facility_reviews.reviewer_display_name
-- for rows where it is missing, resolving the name the same way the review
-- write-path does (seeker_profiles first/last/display_name, then auth metadata).
-- The "Backfill Names" button in AdminReviews calls this; previously the RPC
-- did not exist so the button always errored.
create or replace function public.admin_backfill_reviewer_names()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Not authorized: super admin only';
  end if;

  with candidates as (
    select
      fr.id,
      nullif(btrim(
        coalesce(
          nullif(btrim(sp.first_name), ''),
          nullif(split_part(coalesce(sp.display_name, ''), ' ', 1), ''),
          nullif(btrim(au.raw_user_meta_data->>'first_name'), ''),
          nullif(split_part(coalesce(au.raw_user_meta_data->>'full_name', ''), ' ', 1), '')
        )
        || ' ' ||
        coalesce(
          nullif(btrim(sp.last_name), ''),
          nullif(btrim(regexp_replace(coalesce(sp.display_name, ''), '^\S+\s*', '')), ''),
          nullif(btrim(au.raw_user_meta_data->>'last_name'), ''),
          nullif(btrim(regexp_replace(coalesce(au.raw_user_meta_data->>'full_name', ''), '^\S+\s*', '')), ''),
          ''
        )
      ), '') as resolved_name
    from public.facility_reviews fr
    left join public.seeker_profiles sp on sp.user_id = fr.user_id
    left join auth.users au on au.id = fr.user_id
    where fr.reviewer_display_name is null or btrim(fr.reviewer_display_name) = ''
  )
  update public.facility_reviews fr
  set reviewer_display_name = c.resolved_name
  from candidates c
  where fr.id = c.id
    and c.resolved_name is not null
    and btrim(c.resolved_name) <> '';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_backfill_reviewer_names() from public, anon;
grant execute on function public.admin_backfill_reviewer_names() to authenticated;

comment on function public.admin_backfill_reviewer_names() is
  'Super-admin only. Backfills facility_reviews.reviewer_display_name for rows missing it, resolving from seeker_profiles then auth metadata. Returns the number of rows updated.';
