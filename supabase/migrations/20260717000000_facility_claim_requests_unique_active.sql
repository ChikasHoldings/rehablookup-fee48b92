-- Prevent duplicate active claim requests for the same (facility, claimant).
--
-- The submit-facility-claim edge function (v2) has a check-then-insert
-- pattern: SELECT the existing claim, if found UPDATE, otherwise INSERT.
-- Between the SELECT and the INSERT there's a race window where two
-- concurrent requests from the same claimant for the same facility both
-- find no row, both insert, and both succeed — leaving the DB with
-- duplicate pending claims keyed by (facility_id, claimant_user_id).
--
-- The edge function already has a 23505 unique-violation catch path
-- (lines 202-213) that re-queries on conflict and returns the
-- pre-existing claim — that path was effectively dead code without a
-- DB-level uniqueness guard. This migration adds the partial unique
-- index so the catch path actually fires and double-submissions
-- collapse into a single canonical row.
--
-- Partial index (status IN ('pending','under_review')) so that
-- terminal-state rows (approved, rejected, withdrawn) don't block a
-- legitimate re-submission down the road. A claimant whose claim was
-- previously rejected can submit a new one.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS facility_claim_requests_active_unique
  ON public.facility_claim_requests (facility_id, claimant_user_id)
  WHERE status IN ('pending', 'under_review');

COMMENT ON INDEX public.facility_claim_requests_active_unique IS
  'Partial unique index preventing duplicate active claims by the same '
  'claimant for the same facility. Backstops the check-then-insert '
  'race in submit-facility-claim. Excludes terminal-state rows so '
  'rejected claimants can re-submit.';

COMMIT;
