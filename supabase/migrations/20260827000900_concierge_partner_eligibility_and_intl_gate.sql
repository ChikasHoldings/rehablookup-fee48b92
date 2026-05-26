-- Concierge Partner eligibility gate + partner-exclusive international.
-- Partner-exclusive model: a facility must self-attest (profile complete +
-- license # + accepts emergency admissions) before advisors can introduce it;
-- admins can revoke. International-patient acceptance becomes a partner-only
-- capability.

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS concierge_license_number text,
  ADD COLUMN IF NOT EXISTS concierge_accepts_emergency boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS concierge_eligibility_attested_at timestamptz,
  ADD COLUMN IF NOT EXISTS concierge_eligibility_revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS concierge_eligibility_revoked_reason text;

COMMENT ON COLUMN public.facilities.concierge_eligibility_attested_at IS
  'When the provider completed the Concierge Partner eligibility attestation (profile complete + licensed + accepts emergency). NULL = not yet introducible.';
COMMENT ON COLUMN public.facilities.concierge_eligibility_revoked_at IS
  'When an admin revoked eligibility. If >= attested_at the partner is NOT introducible until they re-attest.';

-- Active Concierge Partner (subscription level) — gates the international capability.
CREATE OR REPLACE FUNCTION public.is_active_concierge_partner(p_facility_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.facility_subscriptions s
     WHERE s.facility_id = p_facility_id
       AND s.has_concierge_partner = true
       AND s.status = 'active'
  );
$$;

-- Eligible (introducible) Concierge Partner: active partner sub + approved +
-- attested + not currently revoked. The matcher gates the partner pool on this;
-- non-partners reach families only through the tier fallback.
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
       AND (f.concierge_eligibility_revoked_at IS NULL
            OR f.concierge_eligibility_revoked_at < f.concierge_eligibility_attested_at)
  );
$$;

-- International acceptance is now Concierge-Partner-exclusive. Reset any
-- non-partner facility that currently has it enabled.
UPDATE public.facilities f
   SET accepts_international_patients = false
 WHERE accepts_international_patients = true
   AND NOT public.is_active_concierge_partner(f.id);

-- Enforce partner-only on opt-in writes (defense-in-depth behind the UI gate).
CREATE OR REPLACE FUNCTION public.enforce_international_partner_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.accepts_international_patients = true
     AND (OLD.accepts_international_patients IS DISTINCT FROM true)
     AND NOT public.is_active_concierge_partner(NEW.id) THEN
    RAISE EXCEPTION 'accepts_international_patients can only be enabled for active Concierge Partners';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_international_partner_only') THEN
    EXECUTE 'CREATE TRIGGER trg_enforce_international_partner_only '
            'BEFORE UPDATE OF accepts_international_patients ON public.facilities '
            'FOR EACH ROW EXECUTE FUNCTION public.enforce_international_partner_only()';
  END IF;
END $$;
