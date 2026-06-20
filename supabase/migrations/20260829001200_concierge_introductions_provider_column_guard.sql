-- ============================================================================
-- Concierge introductions — provider column-write guard (PII self-disclosure fix)
--
-- CONFIRMED CRITICAL (live role-simulation, before fix): a facility owner could
-- self-disclose the seeker's PII. The provider UPDATE policy
-- `concierge_introductions_update_consolidated` is ownership-scoped but has NO
-- column restriction, and there was NO BEFORE UPDATE column-guard trigger
-- (only phi_audit_* AFTER triggers + trg_introduction_decline_release). So an
-- owner could run, via their user JWT through PostgREST:
--     update concierge_introductions set admin_disclosed_pii_at = now()
--     where id = <their intro row>;
-- and then read the seeker's full name/email/phone/clinical intake, because
-- BOTH the PII gate in get_provider_introduction_cases AND the
-- concierge_inquiries SELECT policy key on
--     ci.admin_disclosed_pii_at IS NOT NULL
-- Proof (synthetic seeker, rolled back): RPC client_name baseline=NULL ->
-- post=<SYNTH_SEEKER>; concierge_inquiries owner-read count baseline=0 -> 1.
-- The same unrestricted UPDATE also let a provider forge case-state columns
-- (seeker_contacted / response_deadline_at / disclosed_by_admin_id, etc.),
-- corrupting analytics + the brokerage disclosure boundary.
--
-- FIX: a BEFORE UPDATE column-guard trigger. Privileged callers (service_role,
-- postgres/supabase_admin, or an admin user) may write any column — that is how
-- the advisor/admin disclosure (admin/concierge UI, admin role) and the
-- service-role cron/webhook paths set admin_disclosed_pii_at legitimately. A
-- non-privileged caller (the facility owner responding to an introduction) may
-- change ONLY provider_response and provider_responded_at — exactly what the
-- responder UI writes (ConciergeIntroductionResponder.tsx). Any change to any
-- other column is rejected. The jsonb-diff form catches every other column
-- without enumerating them, so new columns are protected by default.
--
-- This mirrors the existing enforce_facility_featured_gate() privilege idiom
-- (current_setting('role') / auth.role() / current_user / has_role admin). It
-- is additive (a new trigger) and changes no data, no RLS policy, and no
-- existing trigger. Legitimate provider responses and admin disclosures are
-- unaffected; only the self-disclosure / case-state-forgery vector is closed.
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS enforce_concierge_introduction_provider_columns
--     ON public.concierge_introductions;
--   DROP FUNCTION IF EXISTS public.enforce_concierge_introduction_provider_columns();
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_concierge_introduction_provider_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Privileged callers may write any column: the Stripe webhook / crons
  -- (service_role), direct DB maintenance (postgres/supabase_admin), and the
  -- admin concierge UI (an authenticated user holding the 'admin' role) — this
  -- is the legitimate advisor/admin PII-disclosure path.
  IF current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR has_role((SELECT auth.uid()), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Non-privileged caller (facility owner responding to an introduction):
  -- only provider_response / provider_responded_at may change. If ANY other
  -- column differs from the stored row, reject — this blocks self-setting
  -- admin_disclosed_pii_at / disclosed_by_admin_id (PII disclosure) and
  -- forging seeker_contacted / response_deadline_at (case-state integrity).
  IF (to_jsonb(NEW) - 'provider_response' - 'provider_responded_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'provider_response' - 'provider_responded_at') THEN
    RAISE EXCEPTION
      'Providers may only set provider_response / provider_responded_at on '
      'concierge_introductions (%). PII disclosure and case-state columns are '
      'controlled by the advisor/admin.', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_concierge_introduction_provider_columns
  ON public.concierge_introductions;

CREATE TRIGGER enforce_concierge_introduction_provider_columns
  BEFORE UPDATE ON public.concierge_introductions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_concierge_introduction_provider_columns();
