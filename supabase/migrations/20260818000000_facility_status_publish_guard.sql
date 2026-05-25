-- Server-side backstop against self-publishing facility listings.
--
-- Public visibility is gated by status='approved' (public_facilities view +
-- facilities_select_public RLS). New listings are created status='pending' by
-- both creation flows (onboarding ProviderSignup + the add-location wizard),
-- and admins flip them to 'approved' after review. But the facilities INSERT
-- and UPDATE RLS only proved ownership — nothing stopped a facility owner from
-- POSTing status='approved' directly via the API and self-publishing
-- unverified data. enforce_facility_verified_gate guards the `verified` badge,
-- not `status`, so it didn't cover this.
--
-- This trigger blocks the pending->approved transition (and INSERT-as-approved)
-- for anyone who isn't an admin or a service-role edge function. Verified safe:
--   • Creation flows set status='pending' (allowed).
--   • A provider editing an already-approved listing keeps status='approved'
--     (OLD.status='approved' short-circuit — normal edit, allowed).
--   • Admin approval runs as an admin user (has_role) or the
--     admin-bulk-update-provider-status edge fn (service role, auth.uid() NULL).
--   • handle_claim_request_approval sets verified/user_id, never status.

CREATE OR REPLACE FUNCTION public.enforce_facility_status_gate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Only a transition into the public-visible 'approved' state matters.
  IF NEW.status IS DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;

  -- Editing an already-approved listing is a normal provider edit, not a
  -- (re)publish — the row was approved by an admin previously.
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Allowed publishers: service-role edge functions (no auth.uid()) and
  -- admins approving via the review surfaces.
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Facility listings cannot be self-approved. New and edited listings stay pending until an admin reviews them.'
    USING ERRCODE = 'check_violation';
END;
$function$;

DROP TRIGGER IF EXISTS enforce_facility_status_gate_trg ON public.facilities;
CREATE TRIGGER enforce_facility_status_gate_trg
  BEFORE INSERT OR UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION public.enforce_facility_status_gate();
