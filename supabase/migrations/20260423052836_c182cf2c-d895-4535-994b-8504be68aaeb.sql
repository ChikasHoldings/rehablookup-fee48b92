-- ============================================================================
-- Client (Seeker/User) Panel Hardening — P0/P1 Security Fixes
-- ============================================================================

-- ============================================================================
-- FIX 1 (P0): Lock down seeker UPDATE on concierge_inquiries
-- Current policy lets seekers escalate PII access by setting
-- seeker_confirmed=true + placed_facility_id, which exposes their full
-- record (substance use, suicide history, insurance) to that provider.
-- ============================================================================

DROP POLICY IF EXISTS "Seekers can update own inquiry for confirmation"
  ON public.concierge_inquiries;

-- Trigger-based column-level guard: prevents seekers from changing
-- placement / confirmation / admin-only fields on their own inquiry.
CREATE OR REPLACE FUNCTION public.guard_seeker_inquiry_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Admins and service role bypass guard entirely.
  v_is_admin := has_role(auth.uid(), 'admin'::app_role);
  IF v_is_admin OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only the inquiry's owning seeker is allowed past this guard.
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify another user''s inquiry';
  END IF;

  -- Block changes to admin / placement-controlled columns.
  IF NEW.placed_facility_id          IS DISTINCT FROM OLD.placed_facility_id          OR
     NEW.placement_confirmed         IS DISTINCT FROM OLD.placement_confirmed         OR
     NEW.placement_confirmed_at      IS DISTINCT FROM OLD.placement_confirmed_at      OR
     NEW.assigned_advisor_id         IS DISTINCT FROM OLD.assigned_advisor_id         OR
     NEW.matched_facility_ids        IS DISTINCT FROM OLD.matched_facility_ids        OR
     NEW.admin_matched_facility_ids  IS DISTINCT FROM OLD.admin_matched_facility_ids  OR
     NEW.match_scores                IS DISTINCT FROM OLD.match_scores                OR
     NEW.admin_notes                 IS DISTINCT FROM OLD.admin_notes                 OR
     NEW.status                      IS DISTINCT FROM OLD.status                      OR
     NEW.payment_status              IS DISTINCT FROM OLD.payment_status              OR
     NEW.payment_amount_cents        IS DISTINCT FROM OLD.payment_amount_cents        OR
     NEW.provider_invoice_id         IS DISTINCT FROM OLD.provider_invoice_id         OR
     NEW.provider_fee_status         IS DISTINCT FROM OLD.provider_fee_status         OR
     NEW.tour_coordination_status    IS DISTINCT FROM OLD.tour_coordination_status    OR
     NEW.admission_status            IS DISTINCT FROM OLD.admission_status            OR
     NEW.admission_substatus         IS DISTINCT FROM OLD.admission_substatus         OR
     NEW.stripe_customer_id          IS DISTINCT FROM OLD.stripe_customer_id          OR
     NEW.stripe_payment_intent_id    IS DISTINCT FROM OLD.stripe_payment_intent_id    OR
     NEW.checkout_session_id         IS DISTINCT FROM OLD.checkout_session_id         OR
     NEW.idempotency_key             IS DISTINCT FROM OLD.idempotency_key             OR
     NEW.draft_id                    IS DISTINCT FROM OLD.draft_id                    OR
     NEW.user_id                     IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'You are not permitted to modify these inquiry fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_seeker_inquiry_update_trg ON public.concierge_inquiries;
CREATE TRIGGER guard_seeker_inquiry_update_trg
  BEFORE UPDATE ON public.concierge_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_seeker_inquiry_update();

-- Re-create the seeker UPDATE policy. The trigger enforces the field whitelist.
CREATE POLICY "Seekers can update limited inquiry fields"
  ON public.concierge_inquiries
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- FIX 2 (P1): Lock down account_activity_log INSERT to service_role only
-- Previous policy `WITH CHECK (true)` allowed any anon/authenticated client
-- to forge activity entries for any user_id. Restrict to service_role.
-- ============================================================================

DROP POLICY IF EXISTS "Service role can insert activity"      ON public.account_activity_log;
DROP POLICY IF EXISTS "Service role can insert activity logs" ON public.account_activity_log;

CREATE POLICY "Service role can insert activity logs"
  ON public.account_activity_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- FIX 3 (P1): Server-side RPC for seekers to confirm placement safely.
-- This is the *only* path that should set seeker_confirmed=true or
-- placed_facility_id, so the trigger above can stay strict.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seeker_confirm_placement(
  p_inquiry_id uuid,
  p_facility_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_inquiry RECORD;
  v_intro_exists boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, user_id, status, placed_facility_id, seeker_confirmed
  INTO v_inquiry
  FROM public.concierge_inquiries
  WHERE id = p_inquiry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inquiry not found';
  END IF;

  IF v_inquiry.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'You do not own this inquiry';
  END IF;

  -- The facility must have been formally introduced for this inquiry.
  SELECT EXISTS (
    SELECT 1 FROM public.concierge_introductions ci
    WHERE ci.inquiry_id = p_inquiry_id
      AND ci.facility_id = p_facility_id
  ) INTO v_intro_exists;

  IF NOT v_intro_exists THEN
    RAISE EXCEPTION 'Facility was not introduced for this inquiry';
  END IF;

  -- Trigger guard is bypassed because this function is SECURITY DEFINER
  -- (admin-equivalent). It writes the canonical placement choice.
  UPDATE public.concierge_inquiries
  SET
    placed_facility_id      = p_facility_id,
    seeker_confirmed        = true,
    seeker_confirmed_at     = COALESCE(seeker_confirmed_at, now()),
    placement_confirmed     = true,
    placement_confirmed_at  = COALESCE(placement_confirmed_at, now()),
    updated_at              = now()
  WHERE id = p_inquiry_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seeker_confirm_placement(uuid, uuid) TO authenticated;

-- Allow the seeker_confirm_placement function to bypass the seeker update
-- guard. We detect SECURITY DEFINER context by checking a session-level GUC
-- the function sets. Simpler: skip guard when current_setting matches.
CREATE OR REPLACE FUNCTION public.guard_seeker_inquiry_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_bypass text;
BEGIN
  -- Admins, service role, and SECURITY DEFINER RPCs bypass the guard.
  v_is_admin := has_role(auth.uid(), 'admin'::app_role);
  v_bypass := current_setting('app.bypass_seeker_inquiry_guard', true);

  IF v_is_admin OR auth.uid() IS NULL OR v_bypass = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify another user''s inquiry';
  END IF;

  IF NEW.placed_facility_id          IS DISTINCT FROM OLD.placed_facility_id          OR
     NEW.placement_confirmed         IS DISTINCT FROM OLD.placement_confirmed         OR
     NEW.placement_confirmed_at      IS DISTINCT FROM OLD.placement_confirmed_at      OR
     NEW.seeker_confirmed            IS DISTINCT FROM OLD.seeker_confirmed            OR
     NEW.seeker_confirmed_at         IS DISTINCT FROM OLD.seeker_confirmed_at         OR
     NEW.assigned_advisor_id         IS DISTINCT FROM OLD.assigned_advisor_id         OR
     NEW.matched_facility_ids        IS DISTINCT FROM OLD.matched_facility_ids        OR
     NEW.admin_matched_facility_ids  IS DISTINCT FROM OLD.admin_matched_facility_ids  OR
     NEW.match_scores                IS DISTINCT FROM OLD.match_scores                OR
     NEW.admin_notes                 IS DISTINCT FROM OLD.admin_notes                 OR
     NEW.status                      IS DISTINCT FROM OLD.status                      OR
     NEW.payment_status              IS DISTINCT FROM OLD.payment_status              OR
     NEW.payment_amount_cents        IS DISTINCT FROM OLD.payment_amount_cents        OR
     NEW.provider_invoice_id         IS DISTINCT FROM OLD.provider_invoice_id         OR
     NEW.provider_fee_status         IS DISTINCT FROM OLD.provider_fee_status         OR
     NEW.tour_coordination_status    IS DISTINCT FROM OLD.tour_coordination_status    OR
     NEW.admission_status            IS DISTINCT FROM OLD.admission_status            OR
     NEW.admission_substatus         IS DISTINCT FROM OLD.admission_substatus         OR
     NEW.stripe_customer_id          IS DISTINCT FROM OLD.stripe_customer_id          OR
     NEW.stripe_payment_intent_id    IS DISTINCT FROM OLD.stripe_payment_intent_id    OR
     NEW.checkout_session_id         IS DISTINCT FROM OLD.checkout_session_id         OR
     NEW.idempotency_key             IS DISTINCT FROM OLD.idempotency_key             OR
     NEW.draft_id                    IS DISTINCT FROM OLD.draft_id                    OR
     NEW.user_id                     IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'You are not permitted to modify these inquiry fields';
  END IF;

  RETURN NEW;
END;
$$;

-- Update RPC to set the bypass GUC during its UPDATE.
CREATE OR REPLACE FUNCTION public.seeker_confirm_placement(
  p_inquiry_id uuid,
  p_facility_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_inquiry RECORD;
  v_intro_exists boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, user_id INTO v_inquiry
  FROM public.concierge_inquiries WHERE id = p_inquiry_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Inquiry not found'; END IF;
  IF v_inquiry.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'You do not own this inquiry';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.concierge_introductions ci
    WHERE ci.inquiry_id = p_inquiry_id AND ci.facility_id = p_facility_id
  ) INTO v_intro_exists;

  IF NOT v_intro_exists THEN
    RAISE EXCEPTION 'Facility was not introduced for this inquiry';
  END IF;

  PERFORM set_config('app.bypass_seeker_inquiry_guard', 'on', true);
  UPDATE public.concierge_inquiries
  SET placed_facility_id      = p_facility_id,
      seeker_confirmed        = true,
      seeker_confirmed_at     = COALESCE(seeker_confirmed_at, now()),
      placement_confirmed     = true,
      placement_confirmed_at  = COALESCE(placement_confirmed_at, now()),
      updated_at              = now()
  WHERE id = p_inquiry_id;
  PERFORM set_config('app.bypass_seeker_inquiry_guard', 'off', true);
END;
$$;

-- ============================================================================
-- FIX 4 (P0/GDPR): SECURITY DEFINER function to fully purge a seeker's data.
-- Used by the delete-seeker-account edge function so we don't have to keep
-- the table list in sync in TypeScript.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.purge_seeker_data(p_user_id uuid, p_user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  -- Concierge surface: messages first (FK to threads), threads, tour requests,
  -- introductions (no user link, leave intact for audit), rejected facilities,
  -- inquiries last.
  DELETE FROM public.concierge_messages
    WHERE sender_id = p_user_id;

  DELETE FROM public.concierge_tour_requests
    WHERE user_id = p_user_id;

  DELETE FROM public.concierge_rejected_facilities
    WHERE user_id = p_user_id;

  DELETE FROM public.concierge_threads
    WHERE user_id = p_user_id;

  -- Detach inquiries from the user (preserve admission/billing audit trail
  -- for accounting; PII fields can be wiped).
  UPDATE public.concierge_inquiries
  SET user_id = NULL,
      user_name = '[deleted]',
      user_email = 'deleted+' || id::text || '@deleted.invalid',
      user_phone = '',
      emergency_contact_name = NULL,
      emergency_contact_phone = NULL,
      alternative_contact_name = NULL,
      alternative_contact_phone = NULL,
      decision_maker_name = NULL,
      decision_maker_phone = NULL,
      insurance_member_id = NULL,
      insurance_group_number = NULL,
      current_medications = NULL,
      prior_treatment_notes = NULL,
      notes = NULL,
      seeker_feedback = NULL,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Notification + alert surface
  DELETE FROM public.seeker_notifications        WHERE user_id = p_user_id;
  DELETE FROM public.seeker_facility_alerts      WHERE user_id = p_user_id;
  DELETE FROM public.seeker_onboarding_drip      WHERE user_id = p_user_id;
  DELETE FROM public.notification_preferences    WHERE user_id = p_user_id;

  -- Engagement surface
  DELETE FROM public.user_favorites              WHERE user_id = p_user_id;
  DELETE FROM public.review_helpful_votes        WHERE user_id = p_user_id;
  DELETE FROM public.facility_reviews            WHERE user_id = p_user_id;

  -- Sessions + activity
  DELETE FROM public.user_sessions               WHERE user_id = p_user_id;
  DELETE FROM public.account_activity_log        WHERE user_id = p_user_id;

  -- Email verification artefacts
  IF p_user_email IS NOT NULL THEN
    DELETE FROM public.email_verification_codes WHERE LOWER(email) = LOWER(p_user_email);
  END IF;

  -- Roles + profile last
  DELETE FROM public.user_roles                  WHERE user_id = p_user_id;
  DELETE FROM public.seeker_profiles             WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_seeker_data(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_seeker_data(uuid, text) TO service_role;