-- Drop the anon-facing SELECT policy on facility_verification_state. It
-- exposed the full row (incl. remediation_deadline, last_trigger) for every
-- approved facility, but nothing public reads this table — the only consumer
-- is the owner's VerificationStateCard (covered by the owner/admin policy),
-- and any future public badge-recency need is served by the SECURITY DEFINER
-- facility_badge_recency view. Removing it closes a minor competitive-info
-- leak with zero app impact. Owner + admin read remains intact.
DROP POLICY IF EXISTS facility_verification_state_select_owner_or_public ON public.facility_verification_state;
