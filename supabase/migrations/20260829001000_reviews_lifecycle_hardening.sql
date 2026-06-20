-- ============================================================================
-- Provider Reviews / Reputation lifecycle hardening
--
-- F1 (CRITICAL — proven via role-sim): the facility_reviews INSERT policy
-- ("Authenticated users can insert reviews") validated user_id, facility
-- approval, and non-ownership, but NOT status. The 'pending' value came solely
-- from the column default, which a client trivially overrides by supplying the
-- column — so an authenticated user could insert status='approved' directly via
-- PostgREST and self-publish a review, bypassing moderation entirely. Add the
-- status='pending' guard to the WITH CHECK (mirrors the UPDATE policy which
-- already constrains status='pending'). The token path (submit_review_via_token)
-- is SECURITY DEFINER and hardcodes 'pending', so it is unaffected.
--   Role-sim (authenticated non-owner): status=approved → BLOCKED (42501);
--   status=pending → SUCCEEDED.
--
-- R1 (HIGH — proven via role-sim): review_responses INSERT validated only
-- facility ownership, never that review_id belongs to that facility. A provider
-- could attach a public response to ANOTHER facility's approved review
-- (cross-tenant injection) or occupy the UNIQUE(review_id) slot to block a
-- competitor from responding. Add a BEFORE INSERT/UPDATE trigger enforcing the
-- review_id↔facility_id linkage, plus HTML-stripping + non-empty + length
-- validation (review_responses had no server-side validation, unlike
-- facility_reviews).
--   Role-sim: own-facility response → SUCCEEDED; cross-tenant → BLOCKED (23514).
--
-- F2 (HIGH): create_review_request let a provider send a tokenized review link
-- to their OWN account/facility email; the resulting token review lands with
-- user_id=NULL so validate_review_data's self-review guard (keyed on user_id)
-- never fires → provider self-review. Block recipient emails matching the
-- facility owner's account email or the facility's contact emails.
--
-- F4 (MEDIUM): submit_review_via_token accepted up to 4000 chars but the
-- validate_review_data trigger rejects >2000, so 2001–4000-char token reviews
-- hard-failed with a raw DB error. Align the token RPC to 2000 to match the
-- trigger + the seeker form (the public form's REVIEW_MAX is also lowered to
-- 2000 in the same change).
--
-- ROLLBACK: restore the INSERT policy without `AND status='pending'`; drop
-- validate_review_response_trg + function; restore create_review_request /
-- submit_review_via_token from 20260827000600 / 20260728000000.
-- ============================================================================

-- ---- F1: status guard on review INSERT ------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.facility_reviews;
CREATE POLICY "Authenticated users can insert reviews"
  ON public.facility_reviews AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    ((SELECT auth.uid()) = user_id)
    AND (facility_id IN (SELECT facilities.id FROM public.facilities WHERE facilities.status = 'approved'))
    AND (NOT user_owns_facility(facility_id, (SELECT auth.uid())))
    AND (status = 'pending')
  );

-- ---- R1: review_responses integrity + sanitization ------------------------
CREATE OR REPLACE FUNCTION public.validate_review_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- The response's review_id MUST belong to the facility the responder owns
  -- (facility_id is already ownership-checked by RLS). Without this, a provider
  -- could attach a public response to another facility's review, or squat the
  -- UNIQUE(review_id) slot to block the legitimate facility from responding.
  IF NOT EXISTS (
    SELECT 1 FROM public.facility_reviews fr
    WHERE fr.id = NEW.review_id AND fr.facility_id = NEW.facility_id
  ) THEN
    RAISE EXCEPTION 'Review % does not belong to facility %', NEW.review_id, NEW.facility_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Strip HTML/script and enforce non-empty + length (parity with
  -- validate_review_data; review_responses previously had no validation).
  IF NEW.response_text IS NOT NULL THEN
    NEW.response_text := regexp_replace(NEW.response_text, '<[^>]*>', '', 'g');
    NEW.response_text := regexp_replace(NEW.response_text, 'javascript:', '', 'gi');
    NEW.response_text := regexp_replace(NEW.response_text, 'data:', '', 'gi');
    NEW.response_text := btrim(NEW.response_text);
  END IF;
  IF NEW.response_text IS NULL OR NEW.response_text = '' THEN
    RAISE EXCEPTION 'Response text is required';
  END IF;
  IF length(NEW.response_text) > 1000 THEN
    RAISE EXCEPTION 'Response text must be 1000 characters or less';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_review_response_trg ON public.review_responses;
CREATE TRIGGER validate_review_response_trg
  BEFORE INSERT OR UPDATE ON public.review_responses
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_response();

-- ---- F2: block provider self-review via review-request --------------------
CREATE OR REPLACE FUNCTION public.create_review_request(p_facility_id uuid, p_recipient_name text, p_recipient_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_name text;
  v_email text;
  v_recent_count int;
  v_row record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501';
  END IF;
  IF NOT user_can_edit_facility(p_facility_id, v_user_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  IF NOT public.has_active_pro(p_facility_id) THEN
    RAISE EXCEPTION 'Pro subscription required to send review requests'
      USING ERRCODE='42501';
  END IF;

  v_name := btrim(coalesce(p_recipient_name, ''));
  v_email := lower(btrim(coalesce(p_recipient_email, '')));
  IF length(v_name) = 0 OR length(v_name) > 100 THEN
    RAISE EXCEPTION 'Recipient name must be 1..100 chars';
  END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid recipient email';
  END IF;
  IF length(v_email) > 254 THEN
    RAISE EXCEPTION 'Recipient email too long';
  END IF;

  -- Block obvious self-review: a provider must not request a review from their
  -- own account / facility contact addresses. The token review lands with
  -- user_id=NULL, so validate_review_data's self-review guard cannot catch it.
  IF EXISTS (
    SELECT 1
    FROM public.facilities f
    LEFT JOIN public.profiles p ON p.user_id = f.user_id
    WHERE f.id = p_facility_id
      AND v_email IN (
        lower(coalesce(p.email, '')),
        lower(coalesce(f.email, '')),
        lower(coalesce(f.claim_email, '')),
        lower(coalesce(f.reply_email, ''))
      )
  ) THEN
    RAISE EXCEPTION 'You cannot request a review from your own facility or account email address.'
      USING ERRCODE='42501';
  END IF;

  SELECT count(*) INTO v_recent_count
  FROM public.review_requests
  WHERE facility_id = p_facility_id AND created_at > now() - interval '24 hours';
  IF v_recent_count >= 20 THEN
    RAISE EXCEPTION 'Daily limit reached (20 review requests per facility / 24h). Try again tomorrow.'
      USING ERRCODE='23P01';
  END IF;

  SELECT id, facility_id, recipient_name, recipient_email, status, created_at, sent_at, review_submitted_at, expires_at
  INTO v_row
  FROM public.review_requests
  WHERE facility_id = p_facility_id AND lower(recipient_email) = v_email
    AND status = 'pending' AND expires_at > now() AND review_submitted_at IS NULL
  ORDER BY created_at DESC LIMIT 1;
  IF v_row.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'request_id', v_row.id, 'facility_id', v_row.facility_id,
      'recipient_name', v_row.recipient_name, 'recipient_email', v_row.recipient_email,
      'status', v_row.status, 'created_at', v_row.created_at, 'duplicate', true
    );
  END IF;

  INSERT INTO public.review_requests (facility_id, sender_user_id, recipient_name, recipient_email, status)
  VALUES (p_facility_id, v_user_id, v_name, v_email, 'pending')
  RETURNING id, facility_id, recipient_name, recipient_email, status, created_at INTO v_row;

  RETURN jsonb_build_object(
    'request_id', v_row.id, 'facility_id', v_row.facility_id,
    'recipient_name', v_row.recipient_name, 'recipient_email', v_row.recipient_email,
    'status', v_row.status, 'created_at', v_row.created_at, 'duplicate', false
  );
END;
$function$;

-- ---- F4: align token review length to the 2000-char trigger ---------------
CREATE OR REPLACE FUNCTION public.submit_review_via_token(p_request_id uuid, p_rating integer, p_review_text text, p_reviewer_display_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request record;
  v_review_id uuid;
  v_text text;
  v_name text;
BEGIN
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Missing request id'; END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'Rating must be 1-5'; END IF;
  v_text := btrim(coalesce(p_review_text, ''));
  v_name := btrim(coalesce(p_reviewer_display_name, ''));
  IF length(v_text) > 2000 THEN RAISE EXCEPTION 'Review text too long (2000 char max)'; END IF;
  IF length(v_name) = 0 OR length(v_name) > 80 THEN RAISE EXCEPTION 'Display name must be 1..80 chars'; END IF;
  SELECT id, facility_id, review_submitted_at, expires_at
  INTO v_request FROM public.review_requests WHERE id = p_request_id FOR UPDATE;
  IF v_request.id IS NULL THEN RAISE EXCEPTION 'Invalid link'; END IF;
  IF v_request.review_submitted_at IS NOT NULL THEN RAISE EXCEPTION 'Review already submitted for this link'; END IF;
  IF v_request.expires_at < now() THEN RAISE EXCEPTION 'This link has expired'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.facilities
    WHERE id = v_request.facility_id AND status = 'approved' AND COALESCE(suspended, false) = false
  ) THEN RAISE EXCEPTION 'Facility unavailable'; END IF;
  INSERT INTO public.facility_reviews (facility_id, user_id, review_request_id, rating, review_text, reviewer_display_name, status)
  VALUES (v_request.facility_id, NULL, p_request_id, p_rating, NULLIF(v_text,''), v_name, 'pending')
  RETURNING id INTO v_review_id;
  UPDATE public.review_requests
  SET review_submitted_at = now(), status='submitted', updated_at = now()
  WHERE id = p_request_id;
  RETURN jsonb_build_object('review_id',v_review_id,'state','submitted');
END;
$function$;
