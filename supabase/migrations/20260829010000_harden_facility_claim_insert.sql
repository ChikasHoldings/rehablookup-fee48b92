-- Harden facility_claim_requests against self-verified and re-pointed claims.
--
-- A successful bogus claim transfers a real business's listing — and every
-- inbound patient lead — to the attacker, so this table is the highest-value
-- target in the product. Two gaps let a plain authenticated user do exactly
-- that without ever receiving an OTP.
--
-- 1. SELF-VERIFIED CLAIM
--    The INSERT policy's WITH CHECK was only `auth.uid() = claimant_user_id`,
--    and `authenticated` holds INSERT on every column, with no BEFORE INSERT
--    trigger to sanitise. So a user could POST straight to PostgREST with
--    verification_status = 'verified' and verified_at = now(), skipping the
--    OTP entirely. The admin review panel enables Approve solely on
--    `verification_status === 'verified'`, and the DB-side approval guard
--    re-reads that same attacker-written column — so the row arrives in the
--    queue wearing a green "Verified" badge that nothing ever earned.
--
--    New claims must now start from the same neutral state the legitimate
--    path produces. These values are the column defaults, so an honest insert
--    is unaffected; only a hand-crafted one is rejected.
--
-- 2. RE-POINTED CLAIM
--    facility_id was mutable. The claimant UPDATE branch permits a row to be
--    moved to 'withdrawn', and nothing pinned the facility, so an attacker
--    could pass the OTP against a facility they genuinely control, then swap
--    facility_id to a victim before confirming. Verification would be measured
--    against one facility and ownership handed over for another. Ownership
--    identity is now immutable for non-service-role callers.
--
-- Safe for the real flow: submit-facility-claim creates rows with the SERVICE
-- ROLE client, which bypasses RLS, and its payload sets none of these columns
-- (they take defaults). No client-side code inserts into this table at all —
-- every src/ reference is a SELECT or an admin UPDATE.

-- ---------------------------------------------------------------------------
-- 1. Claims must be born unverified and unreviewed.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS facility_claim_requests_insert ON public.facility_claim_requests;

CREATE POLICY facility_claim_requests_insert
  ON public.facility_claim_requests
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = claimant_user_id
    AND status = 'pending'
    AND verification_status = 'not_started'
    AND verified_at IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

-- ---------------------------------------------------------------------------
-- 2. A claim may never change which facility (or claimant) it is about.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_claim_identity_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Service role runs the trusted edge functions and admin tooling; everything
  -- else (including a logged-in claimant hitting PostgREST directly) is pinned.
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.facility_id IS DISTINCT FROM OLD.facility_id THEN
    RAISE EXCEPTION 'facility_id is immutable on a claim request'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.claimant_user_id IS DISTINCT FROM OLD.claimant_user_id THEN
    RAISE EXCEPTION 'claimant_user_id is immutable on a claim request'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_claim_identity_immutable ON public.facility_claim_requests;

CREATE TRIGGER trg_claim_identity_immutable
  BEFORE UPDATE ON public.facility_claim_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_claim_identity_immutable();

COMMENT ON FUNCTION public.enforce_claim_identity_immutable() IS
  'Pins facility_id and claimant_user_id on facility_claim_requests. Without this a claimant could pass an OTP against a facility they control and then re-point the claim at a victim before confirmation, so verification is measured against one facility and ownership transferred for another.';
