-- =============================================================================
-- Scoped, admin-only, auto-expiring provider plan grants.
--
-- Product decision (2026-07-03): the provider caught by the entitlement-leak
-- audit gets a one-time 30-day courtesy period to keep managing the 3
-- facilities they created while the Free=1 cap was missing. This mechanism
-- implements that WITHOUT marking anyone Pro:
--
--   * kind='facility_cap_grace' raises ONLY the facility listing cap
--     (enforce_facility_limit). It grants nothing else — no verified badge
--     exposure, no 10-photo cap, no analytics/embeds/ranking (all of those
--     key off has_active_pro(), which is untouched).
--   * Grants are admin-only: no client or signup path can create one (RLS
--     below), so this cannot become a global loophole.
--   * Every insert/update/delete is recorded in admin_audit_log.
--   * Expiry is a timestamp comparison — an expired grant grants nothing,
--     even if the enforcement cron never runs.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.provider_plan_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('facility_cap_grace')),
  max_facilities int NOT NULL CHECK (max_facilities BETWEEN 1 AND 10),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  reason text NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Set when an admin revokes early or the expiry cron enforces the end of
  -- the window (idempotency marker for the cron's suspension step).
  revoked_at timestamptz,
  enforced_at timestamptz,
  CHECK (expires_at > starts_at)
);

CREATE INDEX IF NOT EXISTS provider_plan_grants_provider_idx
  ON public.provider_plan_grants (provider_id, expires_at DESC);

ALTER TABLE public.provider_plan_grants ENABLE ROW LEVEL SECURITY;

-- Admins manage grants.
DROP POLICY IF EXISTS plan_grants_admin_all ON public.provider_plan_grants;
CREATE POLICY plan_grants_admin_all
  ON public.provider_plan_grants FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::app_role));

-- Providers may READ their own grants (for the courtesy-period banner).
-- Deliberately no INSERT/UPDATE/DELETE policy for non-admins.
DROP POLICY IF EXISTS plan_grants_own_select ON public.provider_plan_grants;
CREATE POLICY plan_grants_own_select
  ON public.provider_plan_grants FOR SELECT TO authenticated
  USING (provider_id = (SELECT auth.uid()));

-- ─── Audit every change ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_plan_grant_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_actor uuid;
BEGIN
  -- Actor: the JWT'd admin if present, else the grant's granter (covers
  -- cron/service-role enforced_at updates, which have no auth.uid but do
  -- carry the original granted_by). admin_audit_log.admin_user_id is NOT
  -- NULL; if we truly have no actor (system write on a granter-less row),
  -- skip the audit row rather than crash the grant operation.
  v_actor := COALESCE((SELECT auth.uid()), NEW.granted_by, OLD.granted_by);
  IF v_actor IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  INSERT INTO public.admin_audit_log (admin_user_id, action_type, target_type, target_id, details)
  VALUES (
    v_actor,
    CASE TG_OP
      WHEN 'INSERT' THEN 'plan_grant_created'
      WHEN 'UPDATE' THEN 'plan_grant_updated'
      ELSE 'plan_grant_deleted'
    END,
    'provider',
    COALESCE(NEW.provider_id, OLD.provider_id),
    jsonb_build_object(
      'grant_id', COALESCE(NEW.id, OLD.id),
      'kind', COALESCE(NEW.kind, OLD.kind),
      'max_facilities', COALESCE(NEW.max_facilities, OLD.max_facilities),
      'starts_at', COALESCE(NEW.starts_at, OLD.starts_at),
      'expires_at', COALESCE(NEW.expires_at, OLD.expires_at),
      'reason', COALESCE(NEW.reason, OLD.reason),
      'revoked_at', CASE WHEN TG_OP = 'DELETE' THEN OLD.revoked_at ELSE NEW.revoked_at END,
      'op', TG_OP
    )
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.log_plan_grant_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS log_plan_grant_change_trg ON public.provider_plan_grants;
CREATE TRIGGER log_plan_grant_change_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.provider_plan_grants
  FOR EACH ROW EXECUTE FUNCTION public.log_plan_grant_change();

-- ─── Grant-aware facility cap ────────────────────────────────────────────────
-- Same function as 20260829003700, plus: max allowed = GREATEST(plan cap,
-- active unexpired grant cap). GREATEST means a grant can never REDUCE a paid
-- entitlement, and an expired/revoked grant contributes nothing.
CREATE OR REPLACE FUNCTION public.enforce_facility_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  current_count int;
  is_pro boolean;
  grant_cap int;
  max_allowed int;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF current_setting('role', true) = 'service_role'
     OR (SELECT auth.role()) = 'service_role'
     OR COALESCE(current_setting('request.jwt.claims', true), '') = ''
     OR public.has_role((SELECT auth.uid()), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.facilities
  WHERE user_id = NEW.user_id;

  SELECT EXISTS (
    SELECT 1 FROM public.facility_subscriptions
    WHERE provider_id = NEW.user_id
      AND tier = 'pro'
      AND (
        (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
        OR status = 'past_due'
      )
  ) INTO is_pro;

  SELECT COALESCE(MAX(max_facilities), 0) INTO grant_cap
  FROM public.provider_plan_grants
  WHERE provider_id = NEW.user_id
    AND kind = 'facility_cap_grace'
    AND revoked_at IS NULL
    AND starts_at <= now()
    AND expires_at > now();

  max_allowed := GREATEST(CASE WHEN is_pro THEN 5 ELSE 1 END, grant_cap);

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION
      'Facility limit reached: the % plan allows up to % listing(s). Upgrade to Pro to add more locations.',
      CASE WHEN is_pro THEN 'Pro' ELSE 'Free' END, max_allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_facility_limit() FROM PUBLIC, anon, authenticated;

-- ─── Provider-facing reads ───────────────────────────────────────────────────
-- Active grace for the caller (banner + countdown). NULL when none.
CREATE OR REPLACE FUNCTION public.get_my_plan_grace()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT to_jsonb(g) FROM (
    SELECT id, kind, max_facilities, starts_at, expires_at
    FROM public.provider_plan_grants
    WHERE provider_id = (SELECT auth.uid())
      AND kind = 'facility_cap_grace'
      AND revoked_at IS NULL
      AND starts_at <= now()
      AND expires_at > now()
    ORDER BY expires_at DESC
    LIMIT 1
  ) g;
$$;

REVOKE ALL ON FUNCTION public.get_my_plan_grace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_plan_grace() TO authenticated;

-- The caller's facility allowance, computed EXACTLY like the trigger so the
-- UI (useFacilityLimits / AddLocation / the embedded add-listing path) can
-- never disagree with the server gate.
CREATE OR REPLACE FUNCTION public.get_my_facility_allowance()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_used int;
  v_is_pro boolean;
  v_grant record;
  v_max int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_used FROM public.facilities WHERE user_id = v_user;

  SELECT EXISTS (
    SELECT 1 FROM public.facility_subscriptions
    WHERE provider_id = v_user
      AND tier = 'pro'
      AND (
        (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
        OR status = 'past_due'
      )
  ) INTO v_is_pro;

  SELECT max_facilities, expires_at INTO v_grant
  FROM public.provider_plan_grants
  WHERE provider_id = v_user
    AND kind = 'facility_cap_grace'
    AND revoked_at IS NULL
    AND starts_at <= now()
    AND expires_at > now()
  ORDER BY max_facilities DESC
  LIMIT 1;

  v_max := GREATEST(CASE WHEN v_is_pro THEN 5 ELSE 1 END, COALESCE(v_grant.max_facilities, 0));

  RETURN jsonb_build_object(
    'used', v_used,
    'max_allowed', v_max,
    'plan', CASE WHEN v_is_pro THEN 'pro' ELSE 'free' END,
    'grace_active', v_grant.max_facilities IS NOT NULL,
    'grace_expires_at', v_grant.expires_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_facility_allowance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_facility_allowance() TO authenticated;

-- ─── Daily enforcement cron ──────────────────────────────────────────────────
-- T-7 / T-1 reminders + expiry enforcement live in the enforce-plan-grace-cron
-- edge function; unique minute offset to avoid the other jobs.
SELECT cron.unschedule('plan_grace_enforcement')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'plan_grace_enforcement');

SELECT cron.schedule(
  'plan_grace_enforcement',
  '40 6 * * *',
  $$ SELECT scheduled.call_edge_function('enforce-plan-grace-cron'); $$
);
