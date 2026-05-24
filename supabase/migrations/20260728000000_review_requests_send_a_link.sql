-- Review-request send-a-link funnel.
--
-- Wires the empty review_requests table to a real provider flow:
--   1. Provider submits {recipient_name, recipient_email} via the
--      portal → create_review_request inserts a row.
--   2. Edge function (send-review-request) emails the recipient a
--      tokenized link https://rehablookup.com/review/<request_id>
--      and stores the Resend message id on the row.
--   3. Recipient clicks → public /review/:id page loads via the
--      anon-callable get_review_request_by_token RPC.
--   4. Recipient submits → submit_review_via_token writes a
--      facility_reviews row with status='pending' and the request's
--      review_submitted_at gets stamped.
--
-- Schema tweaks:
--   * facility_reviews.user_id becomes NULLABLE — token-submitted
--     reviews don't have a seeker account. The CHECK ensures the
--     row still has a known origin (either authenticated seeker OR
--     a valid review_request).
--   * facility_reviews gains review_request_id (FK → review_requests,
--     SET NULL on delete) so the moderation tools and admin audit
--     can trace where each review came from.
--   * review_requests gains expires_at (defaulted to created_at + 30d)
--     so old links can't be re-used indefinitely.
--
-- Idempotent.

BEGIN;

-- ─── 1. facility_reviews schema ───────────────────────────────────────
ALTER TABLE public.facility_reviews
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS review_request_id uuid REFERENCES public.review_requests(id) ON DELETE SET NULL;

-- Make sure every facility_review row is traceable to an authenticated
-- seeker OR a verifiable review request. The CHECK is added with
-- NOT VALID + VALIDATE to avoid scanning existing rows on weak DBs,
-- but since the table has 0 rows pre-launch the validate step is free.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'facility_reviews_origin_chk'
  ) THEN
    ALTER TABLE public.facility_reviews
      ADD CONSTRAINT facility_reviews_origin_chk
      CHECK (user_id IS NOT NULL OR review_request_id IS NOT NULL) NOT VALID;
    ALTER TABLE public.facility_reviews VALIDATE CONSTRAINT facility_reviews_origin_chk;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS facility_reviews_review_request_id_idx
  ON public.facility_reviews (review_request_id)
  WHERE review_request_id IS NOT NULL;

-- ─── 2. review_requests expiry column + index ─────────────────────────
ALTER TABLE public.review_requests
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Backfill any existing rows (table is currently empty pre-launch, but
-- guard for forwards-compat) and set the default for new rows.
UPDATE public.review_requests
  SET expires_at = created_at + interval '30 days'
  WHERE expires_at IS NULL;

ALTER TABLE public.review_requests
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days'),
  ALTER COLUMN expires_at SET NOT NULL;

-- Speeds up the open/click webhook joining on resend_id.
CREATE INDEX IF NOT EXISTS review_requests_resend_id_idx
  ON public.review_requests (resend_id)
  WHERE resend_id IS NOT NULL;


-- ─── 3. create_review_request (provider, authenticated) ───────────────
CREATE OR REPLACE FUNCTION public.create_review_request(
  p_facility_id uuid,
  p_recipient_name text,
  p_recipient_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_name text;
  v_email text;
  v_recent_count int;
  v_row record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Ownership: provider can only create requests for their own facilities.
  IF NOT user_owns_facility(p_facility_id, v_user_id) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
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

  -- Rate limit: one provider can't fire more than 20 review requests
  -- per facility in any 24-hour window. Stops mass-mailing abuse and
  -- gives the spam-protection systems room to flag bad batches.
  SELECT count(*) INTO v_recent_count
  FROM public.review_requests
  WHERE facility_id = p_facility_id
    AND created_at > now() - interval '24 hours';

  IF v_recent_count >= 20 THEN
    RAISE EXCEPTION 'Daily limit reached (20 review requests per facility / 24h). Try again tomorrow.'
      USING ERRCODE = '23P01';
  END IF;

  -- Dedupe: if the same recipient_email already has a pending,
  -- non-expired request for this facility, return that row instead of
  -- creating a duplicate. Keeps a misclicked "send" from spamming a
  -- single customer with two identical emails.
  SELECT id, facility_id, recipient_name, recipient_email, status,
         created_at, sent_at, review_submitted_at, expires_at
  INTO v_row
  FROM public.review_requests
  WHERE facility_id = p_facility_id
    AND lower(recipient_email) = v_email
    AND status = 'pending'
    AND expires_at > now()
    AND review_submitted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_row.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'request_id', v_row.id,
      'facility_id', v_row.facility_id,
      'recipient_name', v_row.recipient_name,
      'recipient_email', v_row.recipient_email,
      'status', v_row.status,
      'created_at', v_row.created_at,
      'duplicate', true
    );
  END IF;

  INSERT INTO public.review_requests (
    facility_id, sender_user_id, recipient_name, recipient_email, status
  )
  VALUES (p_facility_id, v_user_id, v_name, v_email, 'pending')
  RETURNING id, facility_id, recipient_name, recipient_email, status, created_at
  INTO v_row;

  RETURN jsonb_build_object(
    'request_id', v_row.id,
    'facility_id', v_row.facility_id,
    'recipient_name', v_row.recipient_name,
    'recipient_email', v_row.recipient_email,
    'status', v_row.status,
    'created_at', v_row.created_at,
    'duplicate', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_review_request(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_review_request(uuid, text, text) TO authenticated;


-- ─── 4. mark_review_request_sent (service role, called by edge fn) ────
CREATE OR REPLACE FUNCTION public.mark_review_request_sent(
  p_request_id uuid,
  p_resend_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.review_requests
  SET sent_at = COALESCE(sent_at, now()),
      resend_id = p_resend_id,
      status = 'sent',
      updated_at = now()
  WHERE id = p_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_review_request_sent(uuid, text) FROM PUBLIC;
-- Only the edge function (running with service-role JWT) needs this.
GRANT EXECUTE ON FUNCTION public.mark_review_request_sent(uuid, text) TO service_role;


-- ─── 5. get_review_request_by_token (anon) ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_review_request_by_token(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_request record;
  v_facility record;
BEGIN
  IF p_request_id IS NULL THEN RETURN NULL; END IF;

  SELECT id, facility_id, recipient_name, sent_at, review_submitted_at, expires_at, status
  INTO v_request
  FROM public.review_requests
  WHERE id = p_request_id
  LIMIT 1;

  IF v_request.id IS NULL THEN RETURN NULL; END IF;

  -- Don't leak whether the link expired vs was already used vs valid —
  -- all three return a single "state" string the public page can use
  -- to render the right message without information disclosure.
  IF v_request.review_submitted_at IS NOT NULL THEN
    RETURN jsonb_build_object('state', 'submitted', 'recipient_name', v_request.recipient_name);
  END IF;
  IF v_request.expires_at < now() THEN
    RETURN jsonb_build_object('state', 'expired', 'recipient_name', v_request.recipient_name);
  END IF;

  SELECT id, name, slug, city, state, logo_url, has_active_pro(id) AS is_pro
  INTO v_facility
  FROM public.facilities
  WHERE id = v_request.facility_id
    AND status = 'approved'
    AND COALESCE(suspended, false) = false;

  IF v_facility.id IS NULL THEN
    -- Facility went away or is suspended → treat as expired so the
    -- recipient sees a graceful "this link is no longer active" page
    -- instead of a confusing missing-facility error.
    RETURN jsonb_build_object('state', 'expired', 'recipient_name', v_request.recipient_name);
  END IF;

  RETURN jsonb_build_object(
    'state', 'valid',
    'request_id', v_request.id,
    'recipient_name', v_request.recipient_name,
    'facility', jsonb_build_object(
      'id',       v_facility.id,
      'name',     v_facility.name,
      'slug',     v_facility.slug,
      'city',     v_facility.city,
      'state',    v_facility.state,
      'logo_url', v_facility.logo_url,
      'is_pro',   v_facility.is_pro,
      'profile_url', 'https://rehablookup.com/center/' || v_facility.slug
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_review_request_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_review_request_by_token(uuid) TO anon, authenticated;


-- ─── 6. submit_review_via_token (anon) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_review_via_token(
  p_request_id uuid,
  p_rating int,
  p_review_text text,
  p_reviewer_display_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
  v_review_id uuid;
  v_text text;
  v_name text;
BEGIN
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'Missing request id';
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be 1-5';
  END IF;

  v_text := btrim(coalesce(p_review_text, ''));
  v_name := btrim(coalesce(p_reviewer_display_name, ''));

  IF length(v_text) > 0 AND length(v_text) > 4000 THEN
    RAISE EXCEPTION 'Review text too long (4000 char max)';
  END IF;
  IF length(v_name) = 0 OR length(v_name) > 80 THEN
    RAISE EXCEPTION 'Display name must be 1..80 chars';
  END IF;

  -- Lock the request row briefly so a double-click on submit can't
  -- result in two facility_reviews inserts. The first call wins; the
  -- second sees review_submitted_at filled and aborts.
  SELECT id, facility_id, review_submitted_at, expires_at
  INTO v_request
  FROM public.review_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Invalid link';
  END IF;
  IF v_request.review_submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Review already submitted for this link';
  END IF;
  IF v_request.expires_at < now() THEN
    RAISE EXCEPTION 'This link has expired';
  END IF;

  -- Make sure the underlying facility is still approved + not
  -- suspended before accepting the review.
  IF NOT EXISTS (
    SELECT 1 FROM public.facilities
    WHERE id = v_request.facility_id
      AND status = 'approved'
      AND COALESCE(suspended, false) = false
  ) THEN
    RAISE EXCEPTION 'Facility unavailable';
  END IF;

  INSERT INTO public.facility_reviews (
    facility_id, user_id, review_request_id, rating, review_text,
    reviewer_display_name, status
  )
  VALUES (
    v_request.facility_id, NULL, p_request_id, p_rating,
    NULLIF(v_text, ''), v_name, 'pending'
  )
  RETURNING id INTO v_review_id;

  UPDATE public.review_requests
  SET review_submitted_at = now(),
      status = 'submitted',
      updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'review_id', v_review_id,
    'state', 'submitted'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_review_via_token(uuid, int, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_review_via_token(uuid, int, text, text) TO anon, authenticated;

COMMIT;
