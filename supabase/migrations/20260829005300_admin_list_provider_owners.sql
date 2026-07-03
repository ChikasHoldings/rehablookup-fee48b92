-- =============================================================================
-- admin_list_provider_owners() — owner-account-level rollup for the new
-- Admin › Providers › Owners tab.
--
-- WHY A SERVER-SIDE RPC
--   The Owners tab needs to filter/sort by AGGREGATE fields (most facilities,
--   plan state, action-needed) which is only correct when the aggregation
--   happens before pagination. Doing it client-side per visible page would
--   filter/sort only the current page. This one additive, admin-gated,
--   SECURITY DEFINER read does the rollup once; the client then searches /
--   filters / sorts / paginates the (small) owner set.
--
-- SECURITY
--   Admin-only: gated on public.user_is_admin(auth.uid()) (the same
--   user_roles.role='admin' check used by storage policies). Non-admins get an
--   insufficient_privilege error. Read-only; no RLS change; reads existing
--   canonical sources only:
--     - profiles                 identity (email_verified_at, onboarding_completed_at, created_at)
--     - facilities               owned listings + per-status counts + last update
--     - facility_subscriptions   Pro/past_due/incomplete/canceled + stripe customer presence
--     - provider_plan_grants     active courtesy (grace) period + expiry
--   Plan state is derived from facility_subscriptions (NOT profiles.plan), matching
--   has_active_pro semantics (active-within-period is Pro; past_due surfaced
--   distinctly for billing attention; grace never counts as Pro).
--
-- ROLLBACK: DROP FUNCTION IF EXISTS public.admin_list_provider_owners();
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_list_provider_owners()
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  created_at timestamptz,
  email_verified_at timestamptz,
  onboarding_completed_at timestamptz,
  total_facilities integer,
  live_count integer,
  pending_count integer,
  rejected_count integer,
  suspended_count integer,
  plan_state text,
  grace_expires_at timestamptz,
  has_stripe_customer boolean,
  last_facility_update timestamptz,
  facility_names text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.user_is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'admin role required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH owners AS (
    SELECT DISTINCT o.uid AS user_id
    FROM (
      SELECT f.user_id AS uid FROM public.facilities f WHERE f.user_id IS NOT NULL
      UNION
      SELECT pos.user_id FROM public.provider_onboarding_state pos WHERE pos.user_id IS NOT NULL
      UNION
      SELECT fs.provider_id FROM public.facility_subscriptions fs WHERE fs.provider_id IS NOT NULL
    ) o
  ),
  fac AS (
    SELECT
      f.user_id AS uid,
      count(*)::int AS total,
      count(*) FILTER (WHERE f.status = 'approved' AND COALESCE(f.suspended, false) = false)::int AS live,
      count(*) FILTER (WHERE f.status IN ('pending', 'pending_review') AND COALESCE(f.suspended, false) = false)::int AS pending,
      count(*) FILTER (WHERE f.status IN ('rejected', 'needs_edits'))::int AS rejected,
      count(*) FILTER (WHERE COALESCE(f.suspended, false) = true)::int AS suspended,
      max(f.updated_at) AS last_update,
      array_agg(f.name ORDER BY f.name) FILTER (WHERE f.name IS NOT NULL) AS names
    FROM public.facilities f
    WHERE f.user_id IS NOT NULL
    GROUP BY f.user_id
  ),
  subs AS (
    SELECT
      fs.provider_id AS uid,
      bool_or(fs.tier = 'pro' AND fs.status = 'active'
              AND (fs.current_period_end IS NULL OR fs.current_period_end > now())) AS any_active_pro,
      bool_or(fs.tier = 'pro' AND fs.status = 'past_due') AS any_past_due,
      bool_or(fs.tier = 'pro' AND fs.status = 'incomplete') AS any_incomplete,
      bool_or(fs.tier = 'pro' AND fs.status IN ('canceled', 'cancelled')) AS any_canceled,
      bool_or(fs.stripe_customer_id IS NOT NULL) AS has_customer
    FROM public.facility_subscriptions fs
    WHERE fs.provider_id IS NOT NULL
    GROUP BY fs.provider_id
  ),
  grants AS (
    SELECT g.provider_id AS uid, max(g.expires_at) AS grace_expires
    FROM public.provider_plan_grants g
    WHERE g.kind = 'facility_cap_grace'
      AND g.revoked_at IS NULL
      AND g.expires_at > now()
    GROUP BY g.provider_id
  )
  SELECT
    ow.user_id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.created_at,
    p.email_verified_at,
    p.onboarding_completed_at,
    COALESCE(fac.total, 0),
    COALESCE(fac.live, 0),
    COALESCE(fac.pending, 0),
    COALESCE(fac.rejected, 0),
    COALESCE(fac.suspended, 0),
    CASE
      WHEN COALESCE(subs.any_active_pro, false) THEN 'pro'
      WHEN COALESCE(subs.any_past_due, false)  THEN 'past_due'
      WHEN gr.grace_expires IS NOT NULL        THEN 'grace'
      WHEN COALESCE(subs.any_incomplete, false) THEN 'incomplete'
      WHEN COALESCE(subs.any_canceled, false)  THEN 'canceled'
      ELSE 'free'
    END AS plan_state,
    gr.grace_expires,
    COALESCE(subs.has_customer, false),
    fac.last_update,
    COALESCE(fac.names, ARRAY[]::text[])
  FROM owners ow
  JOIN public.profiles p ON p.user_id = ow.user_id
  LEFT JOIN fac    ON fac.uid = ow.user_id
  LEFT JOIN subs   ON subs.uid = ow.user_id
  LEFT JOIN grants gr ON gr.uid = ow.user_id
  -- Stable default ordering (newest account first) so the client renders
  -- deterministically before the user picks a sort.
  ORDER BY p.created_at DESC NULLS LAST, ow.user_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_list_provider_owners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_provider_owners() TO authenticated;
