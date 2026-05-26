-- Make create_review_request team-aware.
--
-- Review requests are a marketing / review-management action, which the team
-- feature explicitly grants to managers ("respond to inquiries & reviews,
-- manage marketing"). review_responses (review_responses_team_cud),
-- review_disputes, leads, and facility edits are all already manager-capable,
-- but create_review_request was still owner-only (user_owns_facility) — so a
-- manager hit a 403 dead-end on "Request a review".
--
-- Only the ownership gate changes: user_owns_facility -> user_can_edit_facility
-- (= facility_role IN (owner, manager)). The 24h rate limit is facility-scoped,
-- so managers can't bypass it; viewers remain excluded; Pro gating unchanged.

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
