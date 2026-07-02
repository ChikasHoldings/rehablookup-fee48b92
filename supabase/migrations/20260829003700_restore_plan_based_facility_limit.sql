-- =============================================================================
-- Restore the plan-based facility listing cap (Free = 1, Pro = 5).
--
-- Root cause of the 2026-07-02 entitlement leak (docs/audit/
-- pro-entitlement-leak-2026-07-02.md): migration 20260615000000 dropped
-- enforce_facility_limit() under a since-abandoned "flat-fee unlimited
-- listings" model, so a Free provider could create unlimited facilities from
-- the signup wizard / Add Location — the reported real case listed 3
-- facilities (and 10 photos across them) on a $0 plan.
--
-- The current monetization model (create-checkout, ForProviders) is:
--   Free → 1 facility
--   Pro  → up to 5 facilities
--
-- Differences from the pre-retirement trigger this replaces:
--   * Pro is determined ONLY from facility_subscriptions (webhook-confirmed
--     payment), with the same grace semantics as has_active_pro():
--     active-within-period OR past_due. The old trigger read the
--     profiles.plan mirror first, which can drift.
--   * purchased_listing_slots is gone (table dropped in 20260615000000).
--   * Admin / service-role writers bypass the cap (imports, support fixes) —
--     same actor test as enforce_facility_featured_gate.
--   * Unowned rows (user_id IS NULL — SAMHSA imports) skip the cap.
--
-- Existing over-limit providers are grandfathered: the cap only rejects NEW
-- inserts, it never mutates or deletes existing rows.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_facility_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  current_count int;
  is_pro boolean;
  max_allowed int;
BEGIN
  -- Unowned rows (SAMHSA / bulk imports) are not provider listings.
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins and service-role pipelines may create listings past the cap
  -- (an explicit human/ops decision, visible in admin_audit_log).
  IF current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR public.has_role((SELECT auth.uid()), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.facilities
  WHERE user_id = NEW.user_id;

  -- Webhook-confirmed Pro only. Mirrors has_active_pro() (which is keyed by
  -- facility): any of the provider's facilities carrying an entitled Pro row
  -- makes the PROVIDER Pro for the listing cap.
  SELECT EXISTS (
    SELECT 1 FROM public.facility_subscriptions
    WHERE provider_id = NEW.user_id
      AND tier = 'pro'
      AND (
        (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
        OR status = 'past_due'
      )
  ) INTO is_pro;

  max_allowed := CASE WHEN is_pro THEN 5 ELSE 1 END;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION
      'Facility limit reached: the % plan allows up to % listing(s). Upgrade to Pro to add more locations.',
      CASE WHEN is_pro THEN 'Pro' ELSE 'Free' END, max_allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger-only function: not client-callable (same hardening pattern as
-- 20260820000100_revoke_execute_trigger_functions.sql).
REVOKE EXECUTE ON FUNCTION public.enforce_facility_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_facility_limit_trigger ON public.facilities;
CREATE TRIGGER enforce_facility_limit_trigger
  BEFORE INSERT ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.enforce_facility_limit();
