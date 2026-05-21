-- Two security-advisor lints from round 29 hardening pass:
--
-- 1. `public.leads_provider_view` was running SECURITY DEFINER by
--    default (postgres 15 default for views with no reloptions). The
--    view DOES have a WHERE clause gating on auth.uid() but the
--    recommended pattern is security_invoker=true so the caller's RLS
--    context applies to the underlying leads table too — defense in
--    depth.
--
-- 2. `public.immutable_unaccent` (added in round 25 to support indexed
--    fuzzy search) had a role-mutable search_path. Lock it down to
--    `extensions, pg_temp` since it only calls extensions.unaccent.

ALTER VIEW public.leads_provider_view SET (security_invoker = true);

ALTER FUNCTION public.immutable_unaccent(text)
  SET search_path = 'extensions', 'pg_temp';

COMMENT ON FUNCTION public.immutable_unaccent(text) IS
  'IMMUTABLE wrapper for extensions.unaccent so it can be used in functional indexes. Locked search_path.';
