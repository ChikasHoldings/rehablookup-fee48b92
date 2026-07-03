-- =============================================================================
-- Close the facilities privileged-column UPDATE bypass (provider integrity pass).
--
-- ROOT CAUSE
--   The facilities owner-UPDATE RLS (facilities_update_consolidated /
--   facilities_team_update) is ROW-scoped but COLUMN-unrestricted: a provider
--   may update any column of their own row. `verified`, `status`, and the
--   `featured*` columns are each guarded by a dedicated BEFORE-trigger, but the
--   following moderation / ranking / provenance columns had NO guard, so a
--   provider could set them directly via PostgREST / RPC / raw SQL:
--
--     * suspended                    → self-unsuspend an admin-hidden listing
--                                      (public_facilities filters suspended=false,
--                                      so this re-lists a moderated facility)
--     * calculated_ranking_score     → forge top placement (exposed in
--                                      public_facilities, drives search/rails sort)
--     * listing_completeness_score   → forge secondary ranking/quality signal
--     * response_rate_score          → forge secondary ranking/quality signal
--     * data_source                  → corrupt de-dup / admin provenance
--
--   Proven on production (rolled back): as the facility owner,
--     UPDATE facilities SET suspended=false WHERE id=<own admin-suspended row>
--   returned 1 row and flipped suspended→false.
--
-- FIX
--   One BEFORE INSERT/UPDATE trigger, mirroring enforce_facility_featured_gate
--   / enforce_facility_verified_gate: only a service-role writer (Stripe webhook,
--   grace cron, ranking cron), a DB/SQL pipeline (postgres, no-JWT maintenance),
--   or an admin may change these columns. A facility owner editing their own
--   listing via the client is blocked. Normal listing-field edits (name, phone,
--   description, hours, gallery, …) are untouched — the trigger only fires when
--   a guarded column actually changes.
--
--   When `suspended` changes and there is a real admin actor (auth.uid()), an
--   entry is written to admin_audit_log. System/cron suspends (service role,
--   no auth.uid()) are already logged by their own flows (enforce-plan-grace-cron
--   admin_notifications, admin moderation RPCs) and admin_audit_log.admin_user_id
--   is NOT NULL, so those are intentionally not double-logged here.
--
-- ROLLBACK
--   DROP TRIGGER IF EXISTS enforce_facility_privileged_columns_gate_trg ON public.facilities;
--   DROP FUNCTION IF EXISTS public.enforce_facility_privileged_columns_gate();
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_facility_privileged_columns_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_actor uuid;
  v_privileged boolean;
BEGIN
  -- Only act when a guarded column actually changes (UPDATE) or is set to a
  -- non-default value (INSERT). Normal edits fall straight through.
  IF TG_OP = 'UPDATE'
     AND NEW.suspended IS NOT DISTINCT FROM OLD.suspended
     AND NEW.calculated_ranking_score IS NOT DISTINCT FROM OLD.calculated_ranking_score
     AND NEW.listing_completeness_score IS NOT DISTINCT FROM OLD.listing_completeness_score
     AND NEW.response_rate_score IS NOT DISTINCT FROM OLD.response_rate_score
     AND NEW.data_source IS NOT DISTINCT FROM OLD.data_source THEN
    RETURN NEW;
  END IF;

  -- On INSERT, ignore rows that leave the guarded columns at their harmless
  -- defaults (the normal client/import case). data_source is intentionally NOT
  -- gated on INSERT: client inserts default it to 'admin_created' and the
  -- verified gate is the real control there — gating it on INSERT would break
  -- the standard provider "add a listing" path. Only suspended / score forgery
  -- on INSERT is blocked.
  IF TG_OP = 'INSERT'
     AND COALESCE(NEW.suspended, false) = false
     AND NEW.calculated_ranking_score IS NULL
     AND NEW.listing_completeness_score IS NULL
     AND NEW.response_rate_score IS NULL THEN
    RETURN NEW;
  END IF;

  -- Privileged writers only (same actor test as the featured/verified gates).
  v_privileged := (
    current_setting('role', true) = 'service_role'
    OR auth.role() = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin', 'service_role')
    OR (SELECT auth.uid()) IS NULL
    OR public.has_role((SELECT auth.uid()), 'admin'::app_role)
  );

  IF NOT v_privileged THEN
    RAISE EXCEPTION
      'Cannot modify moderation/ranking/provenance columns on facility % '
      '(suspended, calculated_ranking_score, listing_completeness_score, '
      'response_rate_score, data_source). These are set by admin moderation, '
      'the ranking pipeline, or billing — not by the listing owner.', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Audit suspended flips performed by a real admin actor.
  IF TG_OP = 'UPDATE'
     AND NEW.suspended IS DISTINCT FROM OLD.suspended THEN
    v_actor := (SELECT auth.uid());
    IF v_actor IS NOT NULL THEN
      INSERT INTO public.admin_audit_log (admin_user_id, action_type, target_type, target_id, details)
      VALUES (
        v_actor,
        CASE WHEN COALESCE(NEW.suspended, false) THEN 'facility_suspended' ELSE 'facility_unsuspended' END,
        'facility',
        NEW.id,
        jsonb_build_object(
          'old_suspended', OLD.suspended,
          'new_suspended', NEW.suspended,
          'facility_name', NEW.name
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_facility_privileged_columns_gate() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_facility_privileged_columns_gate_trg ON public.facilities;
CREATE TRIGGER enforce_facility_privileged_columns_gate_trg
  BEFORE INSERT OR UPDATE OF suspended, calculated_ranking_score,
    listing_completeness_score, response_rate_score, data_source
  ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.enforce_facility_privileged_columns_gate();
