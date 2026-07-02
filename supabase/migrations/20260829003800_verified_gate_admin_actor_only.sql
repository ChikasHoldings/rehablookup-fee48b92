-- =============================================================================
-- Close the self-verify hole in enforce_facility_verified_gate().
--
-- The previous gate (20260720000000) validated only ROW STATE: verified=true
-- was allowed when the row is claimed (user_id + claimed_at) or is an
-- approved provider/self_listed/manual/admin_created entry. It never checked
-- WHO is doing the write. Because the provider-update RLS policy on
-- facilities has no column restrictions and facilities.data_source defaults
-- to 'admin_created' for client inserts, a Free provider could run
--   UPDATE facilities SET verified = true WHERE id = <their own approved row>
-- and succeed. The public badge is has_active_pro-masked in public_facilities,
-- but raw-column readers (serve-badge, get_embed_badge) would show a verified
-- badge for a provider who never paid and was never verified by an admin.
--
-- Fix: verified=true may only be set by an admin JWT or a service-role /
-- SQL pipeline (claim approval, admin approval — both qualify). The row-state
-- conditions from 20260720000000 are preserved on top of the actor check.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_facility_verified_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.verified IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.verified = true THEN
    RETURN NEW;
  END IF;

  -- Actor gate: only admins or service-role/SQL pipelines may flip
  -- verified on. Providers can never self-verify.
  IF NOT (
    current_setting('role', true) = 'service_role'
    OR auth.role() = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin', 'service_role')
    OR (SELECT auth.uid()) IS NULL
    OR public.has_role((SELECT auth.uid()), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION
      'Cannot set facilities.verified=true on facility %: verification is '
      'granted by claim approval or admin approval, not by the listing owner.',
      NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Row-state conditions (unchanged from 20260720000000).
  IF NEW.user_id IS NOT NULL AND NEW.claimed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved'
     AND NEW.data_source IN ('provider', 'self_listed', 'manual', 'admin_created') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Cannot set facilities.verified=true on facility %: row is not '
    'claimed (user_id=%, claimed_at=%) and is not an admin-approved '
    'provider/self-listed/manual entry (status=%, data_source=%). '
    'Claim approval or admin approval of a provider-listed facility '
    'is required first.',
    NEW.id, NEW.user_id, NEW.claimed_at, NEW.status, NEW.data_source
    USING ERRCODE = 'check_violation';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_facility_verified_gate() FROM PUBLIC, anon, authenticated;
