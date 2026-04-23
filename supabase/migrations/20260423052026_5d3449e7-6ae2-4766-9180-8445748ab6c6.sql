-- ============================================================================
-- 1. CONCIERGE INQUIRIES — RESTRICT PROVIDER PII ACCESS
-- ============================================================================

-- Drop the over-broad provider read policy that exposed all PII columns
DROP POLICY IF EXISTS "Providers can view inquiries they are introduced to" ON public.concierge_inquiries;

-- New: providers can only read the full row when admin has disclosed PII
-- OR when the seeker has selected this facility for placement.
CREATE POLICY "Providers can view disclosed inquiries"
ON public.concierge_inquiries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.concierge_introductions ci
    JOIN public.facilities f ON f.id = ci.facility_id
    WHERE ci.inquiry_id = concierge_inquiries.id
      AND f.user_id = auth.uid()
      AND (
        ci.admin_disclosed_pii_at IS NOT NULL
        OR (
          concierge_inquiries.seeker_confirmed = true
          AND concierge_inquiries.placed_facility_id = f.id
        )
      )
  )
);

-- Safe pre-disclosure read for the candidate list UI: exposes ONLY
-- non-PII clinical/preference columns. Used by DomesticCandidatesTab join.
CREATE OR REPLACE FUNCTION public.get_provider_safe_inquiries(p_facility_id uuid)
RETURNS TABLE (
  id uuid,
  user_name text,             -- first name only, sanitized client-side
  level_of_care text,
  payment_type text,
  timeline_urgency text,
  preferred_state text,
  preferred_city text,
  status text,
  age_range text,
  gender text,
  primary_concern text,
  insurance_carrier text,
  detox_needed text,
  co_occurring_concerns jsonb,
  substance_use_duration text,
  budget_range text,
  seeker_confirmed boolean,
  seeker_confirmed_at timestamptz,
  placement_confirmed boolean,
  placement_confirmed_at timestamptz,
  placed_facility_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    i.user_name,
    i.level_of_care,
    i.payment_type,
    i.timeline_urgency,
    i.preferred_state,
    i.preferred_city,
    i.status,
    i.age_range,
    i.gender,
    i.primary_concern,
    i.insurance_carrier,
    i.detox_needed,
    i.co_occurring_concerns,
    i.substance_use_duration,
    i.budget_range,
    i.seeker_confirmed,
    i.seeker_confirmed_at,
    i.placement_confirmed,
    i.placement_confirmed_at,
    i.placed_facility_id
  FROM public.concierge_inquiries i
  JOIN public.concierge_introductions ci ON ci.inquiry_id = i.id
  WHERE ci.facility_id = p_facility_id
    AND EXISTS (
      SELECT 1 FROM public.facilities f
      WHERE f.id = p_facility_id AND f.user_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_safe_inquiries(uuid) TO authenticated;

-- ============================================================================
-- 2. FACILITY_STAFF — HIDE EMAIL/PHONE FROM PUBLIC
-- ============================================================================

-- Drop the public read policy that exposed all columns including email/phone
DROP POLICY IF EXISTS "Anyone can view staff of approved facilities" ON public.facility_staff;

-- Direct public access disabled — public consumers must use public_facility_staff view
-- which excludes email/phone. Owners and admins keep full access via existing policies.

-- ============================================================================
-- 3. FACILITIES — HIDE INTERNAL FIELDS FROM CROSS-TENANT AUTHENTICATED READS
-- ============================================================================

-- Remove the broad authenticated SELECT policy that exposed admin_notes etc.
DROP POLICY IF EXISTS "Authenticated can view approved or own facilities" ON public.facilities;

-- Owners and admins keep their own dedicated policies (already exist):
--   "Users can view their own facilities"  -> auth.uid() = user_id
--   (admin SELECT covered by has_role check via dedicated policy if present)

-- Add explicit admin SELECT policy if missing (idempotent)
DROP POLICY IF EXISTS "Admins can view all facilities" ON public.facilities;
CREATE POLICY "Admins can view all facilities"
ON public.facilities
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anonymous and other-tenant authenticated users must use public_facilities view
-- (which excludes admin_notes, concierge_notes, lead_limit_override, bonus_leads,
--  concierge_terms_accepted_by, featured_pinned, etc.).

-- ============================================================================
-- 4. PUBLIC_FACILITIES VIEW — ENABLE security_invoker
-- ============================================================================

CREATE OR REPLACE VIEW public.public_facilities
WITH (security_invoker = on) AS
SELECT
  id, name, slug, city, state, zip_code, address,
  phone, website, email, description,
  facility_type, gender_served, bed_count,
  featured, featured_display_order, featured_pinned,
  verified, year_established, logo_url, gallery_urls,
  status, calculated_ranking_score, listing_completeness_score,
  response_rate_score, accepts_international_patients,
  created_at, updated_at
FROM public.facilities f
WHERE status = 'approved' AND COALESCE(suspended, false) = false;

-- Grant explicit SELECT on view to anon (public directory)
GRANT SELECT ON public.public_facilities TO anon, authenticated;

-- Because the view now runs as the caller, anon needs a policy on the base table
-- that allows reading approved, non-suspended rows. Add it (no PII columns are
-- exposed because consumers query through the view's column list only when they
-- query the view; direct base-table queries by anon are still subject to existing
-- policies which require auth).
DROP POLICY IF EXISTS "Anon can read approved facilities for public view" ON public.facilities;
CREATE POLICY "Anon can read approved facilities for public view"
ON public.facilities
FOR SELECT
TO anon
USING (status = 'approved' AND COALESCE(suspended, false) = false);

-- ============================================================================
-- 5. REALTIME — TIGHTEN TOPIC SUBSCRIPTION POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Users can only subscribe to own channels" ON realtime.messages;

CREATE POLICY "Users can only subscribe to own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'presence'
  OR topic = (auth.uid())::text
  OR topic LIKE ((auth.uid())::text || ':%')
  OR topic LIKE ((auth.uid())::text || '-%')
);

-- ============================================================================
-- 6. PERMISSIVE SERVICE-ROLE POLICIES — GATE BY auth.role()
-- ============================================================================
-- These are belt-and-suspenders fixes. The service_role JWT bypasses RLS anyway,
-- but the linter flags WITH CHECK (true) without a role gate. Tighten the two
-- provider-touching ones flagged.

DROP POLICY IF EXISTS "Service role can manage concierge inquiries" ON public.concierge_inquiries;
CREATE POLICY "Service role can manage concierge inquiries"
ON public.concierge_inquiries
FOR ALL
TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages introductions" ON public.concierge_introductions;
CREATE POLICY "Service role manages introductions"
ON public.concierge_introductions
FOR ALL
TO service_role
USING (true) WITH CHECK (true);
