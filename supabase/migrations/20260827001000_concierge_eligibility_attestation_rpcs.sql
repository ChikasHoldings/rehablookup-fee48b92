-- Concierge Partner eligibility attestation RPCs (self-attest + admin-revoke).

-- Sticky revoke: a revoked partner is NOT introducible until an admin lifts
-- the revoke (re-attestation alone can't clear it).
CREATE OR REPLACE FUNCTION public.is_eligible_concierge_partner(p_facility_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.facilities f
      JOIN public.facility_subscriptions s ON s.facility_id = f.id
     WHERE f.id = p_facility_id
       AND f.status = 'approved'
       AND s.has_concierge_partner = true
       AND s.status = 'active'
       AND f.concierge_eligibility_attested_at IS NOT NULL
       AND f.concierge_eligibility_revoked_at IS NULL
  );
$$;

-- Provider self-attestation (profile complete + license # + accepts emergency).
-- Owner or admin only; blocked while revoked (unless admin); requires >=80%
-- profile completeness. Unlocks introducibility immediately.
CREATE OR REPLACE FUNCTION public.attest_concierge_eligibility(
  p_facility_id uuid,
  p_license_number text,
  p_accepts_emergency boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_completeness int;
  v_revoked timestamptz;
  v_is_admin boolean;
BEGIN
  SELECT user_id, COALESCE(listing_completeness_score, 0), concierge_eligibility_revoked_at
    INTO v_owner, v_completeness, v_revoked
    FROM public.facilities WHERE id = p_facility_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Facility not found';
  END IF;
  v_is_admin := public.has_role(auth.uid(), 'admin'::app_role);
  IF auth.uid() <> v_owner AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Not authorized for this facility';
  END IF;
  IF NOT public.is_active_concierge_partner(p_facility_id) THEN
    RAISE EXCEPTION 'Only active Concierge Partners can attest eligibility';
  END IF;
  IF NOT p_accepts_emergency THEN
    RAISE EXCEPTION 'Concierge Partners must be able to accept families in an emergency';
  END IF;
  IF length(COALESCE(trim(p_license_number), '')) < 3 THEN
    RAISE EXCEPTION 'A valid license number is required';
  END IF;
  IF v_completeness < 80 THEN
    RAISE EXCEPTION 'Complete your profile (at least 80%%) before attesting';
  END IF;
  IF v_revoked IS NOT NULL AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Eligibility was revoked by an admin. Contact support to restore it.';
  END IF;

  UPDATE public.facilities
     SET concierge_license_number = trim(p_license_number),
         concierge_accepts_emergency = true,
         concierge_eligibility_attested_at = now(),
         concierge_eligibility_revoked_at = CASE WHEN v_is_admin THEN NULL ELSE concierge_eligibility_revoked_at END,
         concierge_eligibility_revoked_reason = CASE WHEN v_is_admin THEN NULL ELSE concierge_eligibility_revoked_reason END,
         updated_at = now()
   WHERE id = p_facility_id;
END;
$$;

-- Admin-only revoke / restore.
CREATE OR REPLACE FUNCTION public.set_concierge_eligibility_revoked(
  p_facility_id uuid,
  p_revoked boolean,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  UPDATE public.facilities
     SET concierge_eligibility_revoked_at = CASE WHEN p_revoked THEN now() ELSE NULL END,
         concierge_eligibility_revoked_reason = CASE WHEN p_revoked THEN p_reason ELSE NULL END,
         updated_at = now()
   WHERE id = p_facility_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attest_concierge_eligibility(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_concierge_eligibility_revoked(uuid, boolean, text) TO authenticated;
