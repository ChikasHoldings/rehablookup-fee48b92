-- Automatic public review request after a concierge placement. Once a case is
-- placed (placement_confirmed) and has settled, the seeker is invited to leave
-- a public review of the facility they chose — benefiting the placed partner's
-- profile and closing the family journey (pick -> admit -> review).

ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS placement_review_requested_at timestamptz;

-- Ownership-free, system-only review-request creator (the standard
-- create_review_request requires facility ownership + Pro, which a
-- placement-driven request can't satisfy). Attributes the request to the
-- placed facility's owner as sender. Idempotent via placement_review_requested_at.
CREATE OR REPLACE FUNCTION public.create_placement_review_request(p_inquiry_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inq record;
  v_fac record;
  v_existing record;
  v_new record;
  v_email text;
BEGIN
  SELECT id, user_name, user_email, placed_facility_id, placement_confirmed, placement_review_requested_at
    INTO v_inq
    FROM public.concierge_inquiries
   WHERE id = p_inquiry_id;
  IF v_inq.id IS NULL THEN RETURN NULL; END IF;

  IF v_inq.placed_facility_id IS NULL
     OR v_inq.placement_confirmed IS NOT TRUE
     OR v_inq.placement_review_requested_at IS NOT NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, name, city, state, user_id INTO v_fac
    FROM public.facilities WHERE id = v_inq.placed_facility_id;

  v_email := lower(btrim(coalesce(v_inq.user_email, '')));

  -- Claim it first so concurrent cron ticks / unclaimed-facility cases don't
  -- loop. (Unclaimed facility or bad email => stamped + skipped.)
  UPDATE public.concierge_inquiries SET placement_review_requested_at = now() WHERE id = p_inquiry_id;

  IF v_fac.id IS NULL OR v_fac.user_id IS NULL THEN RETURN NULL; END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RETURN NULL; END IF;

  -- Reuse a still-pending request for this facility+seeker if one exists.
  SELECT id, recipient_name, recipient_email INTO v_existing
    FROM public.review_requests
   WHERE facility_id = v_inq.placed_facility_id
     AND lower(recipient_email) = v_email
     AND status = 'pending' AND expires_at > now() AND review_submitted_at IS NULL
   ORDER BY created_at DESC LIMIT 1;
  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'request_id', v_existing.id, 'facility_id', v_inq.placed_facility_id,
      'recipient_name', v_existing.recipient_name, 'recipient_email', v_existing.recipient_email,
      'facility_name', v_fac.name, 'facility_city', v_fac.city, 'facility_state', v_fac.state,
      'duplicate', true
    );
  END IF;

  INSERT INTO public.review_requests (facility_id, sender_user_id, recipient_name, recipient_email, status)
  VALUES (v_inq.placed_facility_id, v_fac.user_id, left(btrim(v_inq.user_name), 100), v_email, 'pending')
  RETURNING id, recipient_name, recipient_email INTO v_new;

  RETURN jsonb_build_object(
    'request_id', v_new.id, 'facility_id', v_inq.placed_facility_id,
    'recipient_name', v_new.recipient_name, 'recipient_email', v_new.recipient_email,
    'facility_name', v_fac.name, 'facility_city', v_fac.city, 'facility_state', v_fac.state,
    'duplicate', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_placement_review_request(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_placement_review_request(uuid) TO service_role;

-- Hourly cron → send-placement-review-requests edge function.
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('send-placement-review-requests');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END
$$;

SELECT cron.schedule(
  'send-placement-review-requests',
  '17 * * * *',
  $cron$
    SELECT extensions.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_url' LIMIT 1) || '/send-placement-review-requests',
      body := '{}'::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      )::jsonb,
      timeout_milliseconds := 30000
    );
  $cron$
);
