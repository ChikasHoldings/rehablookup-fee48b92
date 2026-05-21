-- ROUND 20 follow-up: three more functions referenced defunct legacy
-- tables (public.pro_subscriptions, public.provider_credits,
-- public.credit_transactions, public.lead_unlocks) and would crash 42P01
-- if invoked.
--
-- 1. handle_claim_request_approval (TRIGGER on facility_claim_requests):
--    fires when an admin flips status='approved' to transfer facility
--    ownership + materialize pending_enrichments. Had a dead
--    INSERT INTO public.provider_credits block. Without this fix, every
--    claim approval would crash, blocking providers from inheriting
--    facilities they claim.
--
-- 2. increment_provider_credits(uuid,uuid,integer) RPC: entirely orphan
--    (stripe-webhook has no caller; only the old test file references it).
--    Drop.
--
-- 3. purge_provider_data(uuid,boolean) — admin GDPR deletion tool.
--    References pro_subscriptions / provider_credits / credit_transactions
--    all of which are gone. Without this fix, every admin "delete provider
--    account" call would crash.
--
-- All three rewrites preserve the live business logic and only strip the
-- dead legacy lines.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. handle_claim_request_approval — drop provider_credits INSERT block
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_claim_request_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_enrich jsonb;
  v_contact jsonb;
  v_service text;
  v_insurance text;
  v_accred jsonb;
  v_gallery text[];
  v_new_logo_url text;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

    UPDATE public.facilities
    SET user_id = NEW.claimant_user_id,
        claimed_at = COALESCE(claimed_at, now()),
        updated_at = now()
    WHERE id = NEW.facility_id;

    -- ⊘ removed: INSERT INTO public.provider_credits — credit-unlock model
    -- deprecated by EKRA flat-fee refactor.

    v_enrich := COALESCE(NEW.pending_enrichments, '{}'::jsonb);

    IF v_enrich ? 'description' AND length(coalesce(v_enrich->>'description', '')) > 0 THEN
      UPDATE public.facilities
        SET description = v_enrich->>'description', updated_at = now()
        WHERE id = NEW.facility_id;
    END IF;

    v_contact := v_enrich->'corrected_contact';
    IF v_contact IS NOT NULL THEN
      UPDATE public.facilities SET
        phone   = COALESCE(NULLIF(v_contact->>'phone', ''),   phone),
        email   = COALESCE(NULLIF(v_contact->>'email', ''),   email),
        website = COALESCE(NULLIF(v_contact->>'website', ''), website),
        updated_at = now()
      WHERE id = NEW.facility_id;
    END IF;

    IF v_enrich ? 'logo_path' AND length(coalesce(v_enrich->>'logo_path', '')) > 0 THEN
      v_new_logo_url := v_enrich->>'logo_path';
      UPDATE public.facilities SET logo_url = v_new_logo_url, updated_at = now()
        WHERE id = NEW.facility_id;
    END IF;

    IF v_enrich ? 'photo_paths' AND jsonb_typeof(v_enrich->'photo_paths') = 'array' THEN
      v_gallery := ARRAY(SELECT jsonb_array_elements_text(v_enrich->'photo_paths'));
      IF array_length(v_gallery, 1) > 0 THEN
        UPDATE public.facilities SET gallery_urls = v_gallery, updated_at = now()
          WHERE id = NEW.facility_id;
      END IF;
    END IF;

    IF v_enrich ? 'services' AND jsonb_typeof(v_enrich->'services') = 'array' THEN
      FOR v_service IN SELECT jsonb_array_elements_text(v_enrich->'services') LOOP
        INSERT INTO public.facility_services (facility_id, service_name)
          VALUES (NEW.facility_id, lower(trim(v_service)))
          ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    IF v_enrich ? 'insurances' AND jsonb_typeof(v_enrich->'insurances') = 'array' THEN
      FOR v_insurance IN SELECT jsonb_array_elements_text(v_enrich->'insurances') LOOP
        INSERT INTO public.facility_insurance (facility_id, insurance_name)
          VALUES (NEW.facility_id, lower(trim(v_insurance)))
          ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    IF v_enrich ? 'accreditations' AND jsonb_typeof(v_enrich->'accreditations') = 'array' THEN
      FOR v_accred IN SELECT * FROM jsonb_array_elements(v_enrich->'accreditations') LOOP
        INSERT INTO public.facility_accreditations (
          facility_id, accreditation_type, verification_number, verification_url,
          document_url, document_name, issuing_authority, notes, verified
        ) VALUES (
          NEW.facility_id,
          v_accred->>'type',
          NULLIF(v_accred->>'number', ''),
          NULLIF(v_accred->>'verification_url', ''),
          NULLIF(v_accred->>'document_path', ''),
          NULLIF(v_accred->>'document_name', ''),
          NULLIF(v_accred->>'issuing_authority', ''),
          NULLIF(v_accred->>'notes', ''),
          false
        );
      END LOOP;
    END IF;

    UPDATE public.facility_claim_requests
    SET status = 'rejected',
        rejection_reason = 'Another claim was approved for this facility',
        reviewed_by = NEW.reviewed_by,
        reviewed_at = now()
    WHERE facility_id = NEW.facility_id
      AND id != NEW.id
      AND status IN ('pending', 'under_review');
  END IF;

  RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Drop orphan increment_provider_credits RPC
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.increment_provider_credits(uuid, uuid, integer);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. purge_provider_data — strip references to defunct tables, keep all
-- live cleanup.
-- ─────────────────────────────────────────────────────────────────────────

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
    -- removed: DELETE FROM public.lead_unlocks (table dropped EKRA refactor)
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

  DELETE FROM public.placement_case_providers WHERE facility_id = p_facility_id;
  DELETE FROM public.placement_invoices WHERE facility_id = p_facility_id;
  DELETE FROM public.placement_fee_events WHERE facility_id = p_facility_id;
  DELETE FROM public.placement_agreements WHERE facility_id = p_facility_id;

  -- removed: pro_subscriptions, provider_credits, credit_transactions
  -- (all dropped during EKRA refactor); subscriptions now live in
  -- facility_subscriptions:
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
