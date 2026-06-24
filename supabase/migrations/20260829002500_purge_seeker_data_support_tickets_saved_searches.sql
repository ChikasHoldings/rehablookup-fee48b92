-- Harden purge_seeker_data: clear residual seeker PII left behind on account
-- deletion. Three gaps closed (the rest of the purge is unchanged):
--   1. support_tickets / support_ticket_messages — keyed by sender_user_id with
--      NO foreign key to auth.users, so auth.admin.deleteUser does NOT cascade
--      them. A deleted seeker's tickets kept sender_name, sender_email, and the
--      full message body indefinitely. Purge the seeker's ticket threads plus
--      any messages they authored.
--   2. saved_searches — never purged and no auth.users cascade; the deleted
--      seeker's saved location/care criteria stayed orphaned on a dangling
--      user_id. Delete them.
--   3. concierge_inquiries.intake_data — the column-level anonymization wiped the
--      individual PII columns but not this JSONB blob (a potential PHI duplicate).
--      It is currently always NULL in production, but null it in the same UPDATE
--      as defense-in-depth so a future write can never survive deletion.
--
-- SECURITY DEFINER + service_role-only grant are preserved. Idempotent
-- (CREATE OR REPLACE), runs only during account deletion, so it cannot affect
-- normal operation.

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
      intake_data = NULL,
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
  DELETE FROM public.saved_searches              WHERE user_id = p_user_id;

  -- Support surface: support_tickets has NO FK to auth.users, so the auth-user
  -- deletion does not cascade it. Purge the seeker's ticket threads (their
  -- tickets' messages + tickets) and any messages they authored elsewhere.
  DELETE FROM public.support_ticket_messages
    WHERE sender_user_id = p_user_id;
  DELETE FROM public.support_ticket_messages
    WHERE ticket_id IN (SELECT id FROM public.support_tickets WHERE sender_user_id = p_user_id);
  DELETE FROM public.support_tickets
    WHERE sender_user_id = p_user_id;

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
