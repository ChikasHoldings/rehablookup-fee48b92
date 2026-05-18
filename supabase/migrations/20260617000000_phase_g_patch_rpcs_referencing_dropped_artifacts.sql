-- =============================================================================
-- Phase G — patch three RPCs that still reference tables/columns dropped
-- during the monetization rebuild. None of these are called from the
-- frontend today (`get_admin_dashboard_stats`, `get_provider_facility_placements`)
-- or are called but would fail on dropped table refs (`purge_provider_data`,
-- invoked by the admin-delete-provider edge function). All three throw at
-- runtime in their current form.
--
-- Refs to fix:
--   - placement_cases             (dropped in 20260516010000)
--   - placement_invoices          (dropped in 20260516010000)
--   - placement_fee_events        (dropped in 20260516010000)
--   - placement_agreements        (dropped in 20260516010000)
--   - placement_case_providers    (dropped in 20260516010000)
--   - concierge_inquiries.provider_fee_cents / _status / _type / provider_invoice_id
--     (dropped in 20260516010000)
-- =============================================================================

-- 1. get_admin_dashboard_stats — replace the now-broken placement_cases
--    sub-query with an international_placement_cases lookup (the surviving
--    active table) and drop the dead `unlocked_leads: 0` placeholder.
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized: admin role required';
  END IF;
  SELECT jsonb_build_object(
    'total_facilities', (SELECT count(*) FROM facilities),
    'pending_approval', (SELECT count(*) FROM facilities WHERE status = 'pending_review'),
    'approved_facilities', (SELECT count(*) FROM facilities WHERE status = 'approved'),
    'total_providers', (SELECT count(DISTINCT user_id) FROM facilities WHERE user_id IS NOT NULL),
    'total_seekers', (SELECT count(*) FROM seeker_profiles),
    'total_leads', (SELECT count(*) FROM leads),
    'active_subscriptions', (SELECT count(*) FROM facility_subscriptions WHERE status = 'active' AND tier = 'pro'),
    'open_support_tickets', (SELECT count(*) FROM support_tickets WHERE status = 'open'),
    'open_escalations', (SELECT count(*) FROM admin_escalations WHERE status NOT IN ('resolved', 'closed')),
    'active_international_cases', (SELECT count(*) FROM international_placement_cases WHERE status NOT IN ('completed', 'cancelled')),
    'total_reviews', (SELECT count(*) FROM facility_reviews),
    'pending_reviews', (SELECT count(*) FROM facility_reviews WHERE status = 'pending')
  ) INTO result;
  RETURN result;
END;
$function$;

-- 2. get_provider_facility_placements — concierge_inquiries no longer has
--    provider_fee_cents / _status / _type (EKRA-driven removal). Replace
--    those column reads with NULL placeholders so the return signature
--    stays stable for any future caller while the function executes
--    without error.
CREATE OR REPLACE FUNCTION public.get_provider_facility_placements(p_facility_id uuid)
RETURNS TABLE(
  id uuid,
  case_kind text,
  user_name text,
  status text,
  placed_facility_id uuid,
  placement_confirmed boolean,
  placement_confirmed_at timestamp with time zone,
  provider_fee_cents integer,
  provider_fee_status text,
  provider_fee_type text,
  level_of_care text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.facilities
    WHERE id = p_facility_id AND user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'Not authorized for this facility' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  -- Domestic concierge placements. EKRA-compliant: domestic concierge is
  -- free to seekers and there is no provider fee. Fee fields are NULL.
  SELECT
    ci.id,
    'domestic'::text AS case_kind,
    ci.user_name,
    ci.status,
    ci.placed_facility_id,
    ci.placement_confirmed,
    ci.placement_confirmed_at,
    NULL::integer AS provider_fee_cents,
    NULL::text    AS provider_fee_status,
    NULL::text    AS provider_fee_type,
    ci.level_of_care,
    ci.created_at,
    ci.updated_at
  FROM public.concierge_inquiries ci
  WHERE ci.placed_facility_id = p_facility_id
    AND ci.status IN ('admitted', 'billed', 'completed')

  UNION ALL

  -- International placements accepted at this facility. International
  -- still has a facility fee — surface it on the existing fee columns.
  SELECT
    ipc.id,
    'international'::text AS case_kind,
    ipc.client_name AS user_name,
    ipc.status,
    ipc.accepted_facility_id AS placed_facility_id,
    (ipc.admission_confirmed_at IS NOT NULL) AS placement_confirmed,
    ipc.admission_confirmed_at AS placement_confirmed_at,
    ipc.facility_fee_cents AS provider_fee_cents,
    CASE
      WHEN ipc.facility_fee_paid THEN 'paid'
      WHEN ipc.facility_fee_cents > 0 THEN 'pending'
      ELSE 'none'
    END AS provider_fee_status,
    'flat_fee'::text AS provider_fee_type,
    NULL::text AS level_of_care,
    ipc.created_at,
    ipc.updated_at
  FROM public.international_placement_cases ipc
  WHERE ipc.accepted_facility_id = p_facility_id
    AND ipc.status IN ('admitted', 'billed', 'completed')

  ORDER BY placement_confirmed_at DESC NULLS LAST;
END;
$function$;

-- 3. purge_provider_data — drop the DELETE statements for the four
--    placement_* tables that were removed in 20260516010000. Everything
--    else in the function still references live tables.
CREATE OR REPLACE FUNCTION public.purge_provider_data(p_facility_id uuid, p_delete_user boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_other_facilities int;
  v_user_email text;
  v_lead_ids uuid[];
  v_review_ids uuid[];
  v_inquiry_ids uuid[];
  v_result jsonb;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.facilities
  WHERE id = p_facility_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Facility % not found', p_facility_id;
  END IF;

  SELECT email::text INTO v_user_email FROM auth.users WHERE id = v_user_id;

  SELECT array_agg(id) INTO v_lead_ids FROM public.leads WHERE facility_id = p_facility_id;
  SELECT array_agg(id) INTO v_review_ids FROM public.facility_reviews WHERE facility_id = p_facility_id;
  SELECT array_agg(id) INTO v_inquiry_ids FROM public.concierge_inquiries WHERE placed_facility_id = p_facility_id;

  IF v_lead_ids IS NOT NULL THEN
    DELETE FROM public.lead_notes WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.lead_emails WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.lead_distributions WHERE lead_id = ANY(v_lead_ids);
    DELETE FROM public.lead_routing_logs WHERE lead_id = ANY(v_lead_ids);
  END IF;

  IF v_review_ids IS NOT NULL THEN
    DELETE FROM public.review_helpful_votes WHERE review_id = ANY(v_review_ids);
    DELETE FROM public.review_responses WHERE review_id = ANY(v_review_ids);
    DELETE FROM public.review_disputes WHERE review_id = ANY(v_review_ids);
  END IF;

  IF v_inquiry_ids IS NOT NULL THEN
    UPDATE public.concierge_inquiries
       SET placed_facility_id = NULL,
           placement_confirmed = false,
           placement_confirmed_at = NULL
     WHERE id = ANY(v_inquiry_ids);
  END IF;

  DELETE FROM public.concierge_engagements WHERE facility_id = p_facility_id;
  DELETE FROM public.concierge_introductions WHERE facility_id = p_facility_id;
  DELETE FROM public.concierge_tour_requests WHERE facility_id = p_facility_id;
  DELETE FROM public.concierge_threads WHERE facility_id = p_facility_id;
  DELETE FROM public.concierge_rejected_facilities WHERE facility_id = p_facility_id;

  -- placement_case_providers / placement_invoices / placement_fee_events /
  -- placement_agreements removed in 20260516010000 monetization rebuild
  -- (EKRA pay-per-admission retirement). DELETEs dropped from this purge.

  DELETE FROM public.facility_subscriptions WHERE facility_id = p_facility_id OR provider_id = v_user_id;
  DELETE FROM public.provider_payment_methods WHERE facility_id = p_facility_id;

  DELETE FROM public.facility_staff WHERE facility_id = p_facility_id;
  DELETE FROM public.leads WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_views WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_interactions WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_services WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_insurance WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_age_groups WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_credentials WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_accreditations WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_credential_documents WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_reviews WHERE facility_id = p_facility_id;
  DELETE FROM public.facility_pending_changes WHERE facility_id = p_facility_id;
  DELETE FROM public.provider_events WHERE facility_id = p_facility_id;
  DELETE FROM public.provider_notifications WHERE facility_id = p_facility_id;
  DELETE FROM public.featured_placement_analytics WHERE facility_id = p_facility_id;
  DELETE FROM public.flagged_images WHERE facility_id = p_facility_id;
  DELETE FROM public.reply_email_verification_codes WHERE facility_id = p_facility_id;
  DELETE FROM public.request_help_analytics WHERE facility_id = p_facility_id;
  DELETE FROM public.user_favorites WHERE facility_id = p_facility_id;
  DELETE FROM public.badge_impressions WHERE facility_id = p_facility_id;
  DELETE FROM public.lead_routing_logs WHERE assigned_provider_id = p_facility_id OR requested_facility_id = p_facility_id;

  DELETE FROM public.facilities WHERE id = p_facility_id;

  IF p_delete_user THEN
    SELECT COUNT(*) INTO v_other_facilities FROM public.facilities WHERE user_id = v_user_id;
    IF v_other_facilities = 0 THEN
      DELETE FROM public.profiles WHERE user_id = v_user_id;
      DELETE FROM public.notification_preferences WHERE user_id = v_user_id;
      DELETE FROM public.user_roles WHERE user_id = v_user_id;
      DELETE FROM public.user_sessions WHERE user_id = v_user_id;
      DELETE FROM public.account_activity_log WHERE user_id = v_user_id;
      DELETE FROM public.subscription_alerts WHERE user_id = v_user_id;
      DELETE FROM public.subscription_events WHERE user_id = v_user_id;
      IF v_user_email IS NOT NULL THEN
        DELETE FROM public.email_verification_codes WHERE email = LOWER(v_user_email);
      END IF;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'facility_id', p_facility_id,
    'user_id', v_user_id,
    'user_email', v_user_email,
    'leads_deleted', COALESCE(array_length(v_lead_ids, 1), 0),
    'reviews_deleted', COALESCE(array_length(v_review_ids, 1), 0),
    'inquiries_unlinked', COALESCE(array_length(v_inquiry_ids, 1), 0),
    'user_eligible_for_deletion', p_delete_user AND COALESCE(v_other_facilities, 0) = 0
  );

  RETURN v_result;
END;
$function$;
