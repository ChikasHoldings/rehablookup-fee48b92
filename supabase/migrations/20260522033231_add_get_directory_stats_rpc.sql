-- Single source of truth for the homepage trust-bar facility / state counts.
--
-- Backstory: the homepage hero badge briefly rendered "0+ Verified Facilities"
-- / "0 States Covered" on first paint because the useCountUp hook initialized
-- to 0 and only animated to the hardcoded constant (3800 / 50) once the bar
-- entered the viewport. Meanwhile a slightly different "3,800+ verified
-- facilities · All 50 states covered" copy lived in TrustRibbon and
-- RecoveryJourneyCTA. Two static numbers that could drift, and a first-paint
-- "0" that undermined the YMYL trust signal.
--
-- This RPC moves the count to a single live source of truth. Both the hero
-- badge and the TrustRibbon now read from public.get_directory_stats(); a
-- build-time prebuild step also inlines the result into index.html as a
-- <meta name="rl:stats"> tag so the very first paint shows real numbers
-- with no CLS.
--
-- Security posture:
--   - SECURITY INVOKER + STABLE so RLS on public_facilities applies. The view
--     already filters to status='approved' AND NOT suspended, so the count
--     is exactly what an unauthenticated user could enumerate by paginating
--     the directory. No new information is exposed.
--   - search_path pinned to public, pg_catalog (matches the project-wide
--     security-definer-hardening posture even though this is INVOKER).
--   - REVOKE all from PUBLIC to make the GRANT explicit.
--   - GRANT EXECUTE to anon + authenticated so the unauthenticated homepage
--     can call it directly via PostgREST RPC.
create or replace function public.get_directory_stats()
returns table(facility_count bigint, state_count bigint)
language sql
security invoker
stable
set search_path = public, pg_catalog
as $$
  select
    (select count(*) from public.public_facilities where status = 'approved')::bigint as facility_count,
    (select count(distinct state) from public.public_facilities where status = 'approved' and state is not null)::bigint as state_count;
$$;

revoke all on function public.get_directory_stats() from public;
grant execute on function public.get_directory_stats() to anon, authenticated;

comment on function public.get_directory_stats() is
  'Single source of truth for the homepage trust-bar facility / state counts. Returns approved facility count and distinct state count. SECURITY INVOKER + STABLE so RLS on public_facilities applies and the planner can cache within a statement. Grants EXECUTE to anon + authenticated so the unauthenticated homepage can call it directly.';
