-- ============================================================================
-- Revert the broad column REVOKEs from the previous migration. Admins
-- authenticate as `authenticated` from the browser and need direct column
-- access via the admin RLS policy. We instead protect provider reads by
-- replacing their row-level SELECT policy with a strictly-scoped RPC that
-- returns only safe columns.
-- ============================================================================

-- 1. Restore column SELECT grants on facilities for authenticated callers.
GRANT SELECT (
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
) ON public.facilities TO authenticated;

-- 2. Restore column SELECT grants on concierge_inquiries for authenticated.
GRANT SELECT (
  stripe_customer_id,
  stripe_payment_intent_id,
  checkout_session_id,
  payment_amount_cents,
  provider_fee_cents,
  provider_fee_status,
  provider_fee_type,
  provider_invoice_id,
  admin_notes,
  admin_matched_facility_ids,
  match_scores,
  match_count,
  matched_facility_ids,
  suicide_history,
  payment_reminder_count,
  abandoned_cart_email_sent_at,
  introductions_sent_at,
  introductions_sent_count,
  idempotency_key
) ON public.concierge_inquiries TO authenticated;

-- 3. Drop the broad provider SELECT policy and replace with a narrow RPC.
DROP POLICY IF EXISTS "Providers can view disclosed inquiries" ON public.concierge_inquiries;

-- Note: admins still see everything via "Admins can view all concierge inquiries".
-- Seekers still see their own row via "Seekers can view own inquiries".
-- Service role still has full access via "Service role can manage concierge inquiries".

-- 4. Provider-side disclosed-inquiry RPC: returns ONLY safe fields, with
--    PII (name/email/phone) gated on the same disclosure rules the policy
--    used to enforce (admin disclosure OR seeker selected this facility).

CREATE OR REPLACE FUNCTION public.get_disclosed_inquiry_for_provider(p_inquiry_id uuid)
RETURNS TABLE (
  id uuid,
  -- Always-safe fields for an introduced provider
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
  substance_use_frequency text,
  prior_treatment_history boolean,
  prior_treatment_notes text,
  current_medications text,
  current_living_situation text,
  assessment_preference text,
  amenity_preferences jsonb,
  preferred_language text,
  preferred_environment text,
  faith_based_preference text,
  holistic_interest boolean,
  mobility_needs text,
  budget_range text,
  notes text,
  created_at timestamptz,
  seeker_confirmed boolean,
  seeker_confirmed_at timestamptz,
  placement_confirmed boolean,
  placement_confirmed_at timestamptz,
  placed_facility_id uuid,
  -- PII (only when disclosed)
  user_name text,
  user_email text,
  user_phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  decision_maker_name text,
  decision_maker_phone text,
  insurance_member_id text,
  insurance_group_number text,
  pii_unlocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_intro RECORD;
  v_inquiry RECORD;
  v_facility_owned boolean;
  v_pii_unlocked boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT ci.* INTO v_inquiry
  FROM public.concierge_inquiries ci
  WHERE ci.id = p_inquiry_id;

  IF v_inquiry IS NULL THEN
    RETURN;
  END IF;

  -- The caller must own a facility that has an introduction to this inquiry.
  SELECT
    intro.admin_disclosed_pii_at,
    intro.facility_id
  INTO v_intro
  FROM public.concierge_introductions intro
  JOIN public.facilities f ON f.id = intro.facility_id
  WHERE intro.inquiry_id = p_inquiry_id
    AND f.user_id = v_caller
  ORDER BY intro.created_at DESC
  LIMIT 1;

  IF v_intro IS NULL THEN
    -- Caller has no introduction → no access at all.
    RETURN;
  END IF;

  v_pii_unlocked :=
    v_intro.admin_disclosed_pii_at IS NOT NULL
    OR (v_inquiry.seeker_confirmed = true AND v_inquiry.placed_facility_id = v_intro.facility_id);

  RETURN QUERY SELECT
    v_inquiry.id,
    v_inquiry.level_of_care,
    v_inquiry.payment_type,
    v_inquiry.timeline_urgency,
    v_inquiry.preferred_state,
    v_inquiry.preferred_city,
    v_inquiry.status,
    v_inquiry.age_range,
    v_inquiry.gender,
    v_inquiry.primary_concern,
    v_inquiry.insurance_carrier,
    v_inquiry.detox_needed,
    v_inquiry.co_occurring_concerns,
    v_inquiry.substance_use_duration,
    v_inquiry.substance_use_frequency,
    v_inquiry.prior_treatment_history,
    v_inquiry.prior_treatment_notes,
    v_inquiry.current_medications,
    v_inquiry.current_living_situation,
    v_inquiry.assessment_preference,
    v_inquiry.amenity_preferences,
    v_inquiry.preferred_language,
    v_inquiry.preferred_environment,
    v_inquiry.faith_based_preference,
    v_inquiry.holistic_interest,
    v_inquiry.mobility_needs,
    v_inquiry.budget_range,
    v_inquiry.notes,
    v_inquiry.created_at,
    v_inquiry.seeker_confirmed,
    v_inquiry.seeker_confirmed_at,
    v_inquiry.placement_confirmed,
    v_inquiry.placement_confirmed_at,
    v_inquiry.placed_facility_id,
    -- PII fields gated
    CASE WHEN v_pii_unlocked THEN v_inquiry.user_name
         ELSE split_part(COALESCE(v_inquiry.user_name, ''), ' ', 1) END,
    CASE WHEN v_pii_unlocked THEN v_inquiry.user_email ELSE NULL END,
    CASE WHEN v_pii_unlocked THEN v_inquiry.user_phone ELSE NULL END,
    CASE WHEN v_pii_unlocked THEN v_inquiry.emergency_contact_name ELSE NULL END,
    CASE WHEN v_pii_unlocked THEN v_inquiry.emergency_contact_phone ELSE NULL END,
    CASE WHEN v_pii_unlocked THEN v_inquiry.decision_maker_name ELSE NULL END,
    CASE WHEN v_pii_unlocked THEN v_inquiry.decision_maker_phone ELSE NULL END,
    CASE WHEN v_pii_unlocked THEN v_inquiry.insurance_member_id ELSE NULL END,
    CASE WHEN v_pii_unlocked THEN v_inquiry.insurance_group_number ELSE NULL END,
    v_pii_unlocked;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_disclosed_inquiry_for_provider(uuid) TO authenticated;
