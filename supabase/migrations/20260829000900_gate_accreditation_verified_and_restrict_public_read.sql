-- ============================================================================
-- Provider Listing Management: gate facility_accreditations.verified and stop
-- publicly exposing unverified accreditations.
--
-- PROBLEM 1 (verified self-grant): facility_accreditations had NO trigger, and
-- its provider write policies (facility_accreditations_team_cud =
-- user_can_edit_facility; legacy "Users can insert ..." = facility_id IN owned)
-- are ROW-level only with no column guard. An owner/manager could therefore
--   INSERT/UPDATE facility_accreditations ... SET verified=true
-- via a direct PostgREST call and self-grant a publicly-visible "Verified"
-- accreditation badge (CARF/JCAHO/LegitScript/SAMHSA) with no admin review.
-- Verified accreditations render on /center/:slug. This mirrors the API-direct
-- trust/revenue bypass already gated for facilities.featured
-- (enforce_facility_featured_gate, 20260829000700) and facilities.verified
-- (enforce_facility_verified_gate, 20260720000000); facility_accreditations was
-- simply never given the equivalent gate. (Confirmed exploitable via role-sim:
-- an authenticated owner INSERT with verified=true succeeded.)
--
-- FIX 1: a BEFORE INSERT OR UPDATE trigger blocks asserting verified=true
-- unless the actor is service_role / postgres / an admin / a moderator. The
-- legitimate provider flow (AccreditationVerificationCard) always inserts
-- verified=false and only edits non-verification columns, so it is unaffected.
-- Admin/moderator verification (can_moderate_users / "Moderators can update
-- accreditations") still works.
--
-- PROBLEM 2 (public over-exposure): two permissive public SELECT policies exist
-- and OR together:
--   facility_accreditations_select_public      = verified=true AND is_approved
--   facility_accreditations_select_public_all  = is_approved        (no verified!)
-- The second nullifies the verified gate of the first, so anon can read EVERY
-- accreditation row of an approved facility — including unverified/rejected ones
-- and their internal notes/rejection_reason — and CenterProfile renders every
-- returned row as a badge without checking `verified`.
--
-- FIX 2: drop facility_accreditations_select_public_all so public reads fall
-- back to the verified-only policy. All current rows are verified=true, so this
-- changes nothing for existing public rendering; it only closes the future hole
-- opened together with FIX 1. Owner/team/admin reads use separate authenticated
-- policies and are unaffected.
--
-- ROLLBACK: DROP TRIGGER + FUNCTION; recreate policy
--   facility_accreditations_select_public_all FOR SELECT TO public
--   USING (is_approved_facility(facility_id));
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_facility_accreditation_verified_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Allow any write that is NOT asserting verified=true.
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.verified, false) = false THEN
      RETURN NEW;
    END IF;
  ELSE  -- UPDATE
    -- Untouched verification fields, or turning verified OFF, is always fine
    -- (provider editing verification_number/notes on an already admin-verified
    -- row, or removing their own badge).
    IF NEW.verified IS NOT DISTINCT FROM OLD.verified
       AND NEW.verified_by IS NOT DISTINCT FROM OLD.verified_by THEN
      RETURN NEW;
    END IF;
    IF COALESCE(NEW.verified, false) = false THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Reaching here means verified is being asserted true by this write.
  -- Only the platform (service role / admin / moderator) may do that.
  IF current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR has_role((SELECT auth.uid()), 'admin'::app_role)
     OR public.can_moderate_users((SELECT auth.uid())) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Cannot set facility_accreditations.verified = true directly on facility %. '
    'Accreditation verification is performed by RehabLookup moderators.', NEW.facility_id
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS enforce_facility_accreditation_verified_gate_trg ON public.facility_accreditations;
CREATE TRIGGER enforce_facility_accreditation_verified_gate_trg
  BEFORE INSERT OR UPDATE ON public.facility_accreditations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_facility_accreditation_verified_gate();

DROP POLICY IF EXISTS "facility_accreditations_select_public_all" ON public.facility_accreditations;
