-- ============================================================================
-- Launch hardening: column-level access for sensitive admin / PII fields
-- ============================================================================
-- Postgres does not support column-level RLS, but it DOES support column-level
-- GRANT/REVOKE which the RLS layer respects. We use that to:
--
--   1. Strip admin-only fields from facility owner reads (admin_notes,
--      calculated_ranking_score, listing_completeness_score, response_rate_score,
--      admin_matched_facility_ids → analogous fields on facilities,
--      bonus_leads, lead_limit_override, profile_reminder_*).
--
--   2. Strip Stripe IDs, internal fee fields, full PHI, and admin-only
--      bookkeeping from non-seeker/non-admin reads of concierge_inquiries.
--      Providers continue to use the existing "disclosed inquiries" RLS
--      policy but can now only read the safe, narrow projection of columns.
--
-- Admins keep full access because they call through SECURITY DEFINER RPCs /
-- service role (admin panel uses service-role edge functions for sensitive
-- views) AND we re-grant the restricted columns explicitly to the admin role
-- via a dedicated GRANT below (no-op for now since admins use service role,
-- but documented for future).
-- ============================================================================

-- ---------- 1. FACILITIES: revoke admin-only columns from `authenticated` ---
-- These columns must never be visible to facility owners or providers.
REVOKE SELECT (
  admin_notes,
  calculated_ranking_score,
  listing_completeness_score,
  response_rate_score,
  bonus_leads,
  lead_limit_override,
  profile_reminder_count,
  profile_reminder_sent_at,
  last_featured_shown_at,
  featured_display_order,
  featured_pinned
) ON public.facilities FROM authenticated, anon;

-- ---------- 2. CONCIERGE_INQUIRIES: strip Stripe + internal fee + PHI -------
-- Providers (via the "Providers can view disclosed inquiries" policy) must NOT
-- see these regardless of disclosure state. Seekers see their own row via the
-- "Seekers can view own inquiries" policy; their reads also lose these
-- columns, which is fine (the seeker UI does not read them — the seeker
-- portal calls dedicated RPCs / edge functions for billing data).
REVOKE SELECT (
  -- Stripe / payment internals
  stripe_customer_id,
  stripe_payment_intent_id,
  checkout_session_id,
  payment_amount_cents,
  -- Internal fee bookkeeping (other providers' fees, our take)
  provider_fee_cents,
  provider_fee_status,
  provider_fee_type,
  provider_invoice_id,
  -- Admin-only operational fields
  admin_notes,
  admin_matched_facility_ids,
  match_scores,
  match_count,
  matched_facility_ids,
  -- High-sensitivity PHI not needed by provider intro decisioning
  suicide_history,
  -- Reminder/operations metadata
  payment_reminder_count,
  abandoned_cart_email_sent_at,
  introductions_sent_at,
  introductions_sent_count,
  idempotency_key
) ON public.concierge_inquiries FROM authenticated, anon;

-- ---------- 3. Re-grant for the seeker's OWN row via a dedicated RPC --------
-- Seeker portal needs payment/admin status visibility on its OWN inquiry for
-- the placement tracker. Provide a security-definer function instead of
-- restoring the column grants (which would re-expose them to providers).

CREATE OR REPLACE FUNCTION public.get_my_inquiry_billing(p_inquiry_id uuid)
RETURNS TABLE (
  payment_status text,
  payment_amount_cents integer,
  payment_type text,
  stripe_payment_intent_id text,
  checkout_session_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- Caller must own the inquiry.
  IF NOT EXISTS (
    SELECT 1 FROM public.concierge_inquiries
    WHERE id = p_inquiry_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    ci.payment_status,
    ci.payment_amount_cents,
    ci.payment_type,
    ci.stripe_payment_intent_id,
    ci.checkout_session_id
  FROM public.concierge_inquiries ci
  WHERE ci.id = p_inquiry_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_inquiry_billing(uuid) TO authenticated;

-- ---------- 4. Admin RPC for facility admin fields --------------------------
-- Admin UI today reads facilities directly with the admin RLS policy. After
-- the REVOKE above the admin policy still grants row visibility but the
-- column GRANT was removed for the `authenticated` role. Admins authenticate
-- as `authenticated` too, so we must explicitly GRANT the columns back to
-- the role used by admin sessions. We do that via a wrapper function so the
-- privilege is scoped to admins only.

CREATE OR REPLACE FUNCTION public.admin_get_facility_admin_fields(p_facility_id uuid)
RETURNS TABLE (
  admin_notes text,
  calculated_ranking_score numeric,
  listing_completeness_score numeric,
  response_rate_score numeric,
  bonus_leads integer,
  lead_limit_override integer,
  profile_reminder_count integer,
  profile_reminder_sent_at timestamptz,
  last_featured_shown_at timestamptz,
  featured_display_order integer,
  featured_pinned boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    f.admin_notes,
    f.calculated_ranking_score,
    f.listing_completeness_score,
    f.response_rate_score,
    f.bonus_leads,
    f.lead_limit_override,
    f.profile_reminder_count,
    f.profile_reminder_sent_at,
    f.last_featured_shown_at,
    f.featured_display_order,
    f.featured_pinned
  FROM public.facilities f
  WHERE f.id = p_facility_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_facility_admin_fields(uuid) TO authenticated;

-- ---------- 5. Admin RPC for concierge_inquiries restricted fields ----------
CREATE OR REPLACE FUNCTION public.admin_get_inquiry_internals(p_inquiry_id uuid)
RETURNS TABLE (
  stripe_customer_id text,
  stripe_payment_intent_id text,
  checkout_session_id text,
  payment_amount_cents integer,
  provider_fee_cents integer,
  provider_fee_status text,
  provider_fee_type text,
  provider_invoice_id uuid,
  admin_notes text,
  admin_matched_facility_ids uuid[],
  match_scores jsonb,
  match_count integer,
  matched_facility_ids uuid[],
  suicide_history text,
  payment_reminder_count integer,
  abandoned_cart_email_sent_at timestamptz,
  introductions_sent_at timestamptz,
  introductions_sent_count integer,
  idempotency_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    ci.stripe_customer_id,
    ci.stripe_payment_intent_id,
    ci.checkout_session_id,
    ci.payment_amount_cents,
    ci.provider_fee_cents,
    ci.provider_fee_status,
    ci.provider_fee_type,
    ci.provider_invoice_id,
    ci.admin_notes,
    ci.admin_matched_facility_ids,
    ci.match_scores,
    ci.match_count,
    ci.matched_facility_ids,
    ci.suicide_history,
    ci.payment_reminder_count,
    ci.abandoned_cart_email_sent_at,
    ci.introductions_sent_at,
    ci.introductions_sent_count,
    ci.idempotency_key
  FROM public.concierge_inquiries ci
  WHERE ci.id = p_inquiry_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_inquiry_internals(uuid) TO authenticated;
