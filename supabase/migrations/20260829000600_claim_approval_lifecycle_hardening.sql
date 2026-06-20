-- Claim approval lifecycle hardening (Provider Onboarding + Claim Listing pass)
--
-- Two focused, justified changes to the facility-claim approval path:
--
-- 1) ONE-APPROVED-PER-FACILITY GUARANTEE
--    The approval trigger auto-rejects competing pending/under_review claims
--    when one is approved, but two claims flipped to 'approved' in concurrent
--    transactions (e.g. an auto-approval racing a manual approval, or two
--    admins) would each miss the other (both saw the other as still pending at
--    snapshot time), producing two 'approved' rows for one facility. Add a
--    partial unique index so the second commit fails cleanly at the DB level.
--    (0 approved claims exist today, so this cannot conflict with live data.)
--
-- 2) AUTO-APPROVAL PROVIDER NOTIFICATION + EMAIL
--    finalize_claim_decision() (verification engine) can set a claim to
--    'approved' entirely in the DB, with NO reviewed_by and no client in the
--    loop. The manual /admin/claims approve flow fires two side-effects after
--    its own update — an in-app provider notification (create_provider_
--    notification RPC) and the send-claim-approval-email edge function — but
--    the auto-approval path fired neither, so an auto-approved provider
--    silently gained ownership and was never told. handle_claim_request_
--    approval() now fires both equivalents when (and only when) the approval
--    has no reviewer (the auto-approval signature; the manual path always
--    stamps reviewed_by, so this never double-notifies). The email reuses the
--    vault service-role-key + pg_net pattern established by
--    handle_facility_approval(); send-claim-approval-email accepts the
--    service-role key as a trusted system caller.
--
-- ROLLBACK:
--   DROP INDEX IF EXISTS public.facility_claim_requests_one_approved_per_facility;
--   -- and restore handle_claim_request_approval() from
--   -- 20260803000100_strip_legacy_provider_credits_from_claim_trigger.sql

-- 1) ----------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS facility_claim_requests_one_approved_per_facility
  ON public.facility_claim_requests (facility_id)
  WHERE status = 'approved';

-- 2) ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_claim_request_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrich jsonb;
  v_contact jsonb;
  v_service text;
  v_insurance text;
  v_accred jsonb;
  v_gallery text[];
  v_new_logo_url text;
  v_facility_snapshot jsonb;
  v_competing record;
  v_functions_url text;
  v_service_role_key text;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

    IF NEW.claimant_user_id IS NULL THEN
      RAISE EXCEPTION
        'Cannot approve claim %: claimant_user_id is NULL. Approval '
        'would orphan facility %.', NEW.id, NEW.facility_id
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.verification_status IS NOT NULL
       AND NEW.verification_status != 'verified' THEN
      RAISE EXCEPTION
        'Cannot approve claim %: verification_status is "%" (expected '
        '"verified" or NULL).', NEW.id, NEW.verification_status
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT jsonb_build_object(
        'description', description,
        'phone', phone,
        'email', email,
        'website', website,
        'logo_url', logo_url,
        'gallery_urls', gallery_urls,
        'verified', verified,
        'snapshot_at', now()
      )
      INTO v_facility_snapshot
      FROM public.facilities
      WHERE id = NEW.facility_id;

    UPDATE public.facility_claim_requests
      SET previous_facility_snapshot = v_facility_snapshot
      WHERE id = NEW.id;

    UPDATE public.facilities
    SET user_id = NEW.claimant_user_id,
        claimed_at = COALESCE(claimed_at, now()),
        verified = true,
        updated_at = now()
    WHERE id = NEW.facility_id;

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

    FOR v_competing IN
      SELECT id, claimant_user_id, claimant_email, claimant_name
        FROM public.facility_claim_requests
        WHERE facility_id = NEW.facility_id
          AND id != NEW.id
          AND status = 'rejected'
          AND reviewed_at = now()
    LOOP
      INSERT INTO public.admin_notifications (type, title, message, metadata)
      VALUES (
        'facility_claim_auto_rejected',
        'Competing claim auto-rejected',
        format(
          'Claim %s by %s (%s) was auto-rejected because claim %s was approved for facility %s. Send rejection email via /admin/claims.',
          v_competing.id,
          COALESCE(v_competing.claimant_name, 'unknown'),
          COALESCE(v_competing.claimant_email, 'no-email'),
          NEW.id,
          NEW.facility_id
        ),
        jsonb_build_object(
          'rejected_claim_id', v_competing.id,
          'approved_claim_id', NEW.id,
          'facility_id', NEW.facility_id,
          'claimant_user_id', v_competing.claimant_user_id,
          'claimant_email', v_competing.claimant_email,
          'needs_rejection_email', true
        )
      );
    END LOOP;

    -- ----------------------------------------------------------------------
    -- Auto-approval side-effects (verification-engine path only).
    --
    -- finalize_claim_decision() sets status='approved' with NO reviewed_by
    -- and no client in the loop, so neither the in-app provider notification
    -- nor the approval email (both fired by the manual /admin/claims flow)
    -- would otherwise be sent. reviewed_by IS NULL is the auto-approval
    -- signature — the manual path always stamps reviewed_by, so this branch
    -- never double-notifies a manually approved claim.
    -- ----------------------------------------------------------------------
    IF NEW.reviewed_by IS NULL THEN
      -- (a) In-app bell + /provider/claims notification. Direct insert; the
      --     SECURITY DEFINER owner (postgres) bypasses RLS (not forced).
      --     Mirrors the create_provider_notification RPC the admin client calls.
      INSERT INTO public.provider_notifications
        (user_id, facility_id, type, title, message, metadata)
      SELECT
        NEW.claimant_user_id,
        NEW.facility_id,
        'claim_approved',
        'Facility claim approved',
        'Your claim for ' || COALESCE(f.name, 'your facility')
          || ' has been approved — you now manage this listing.',
        jsonb_build_object('link', '/provider/claims', 'claim_id', NEW.id, 'auto_approved', true)
      FROM public.facilities f
      WHERE f.id = NEW.facility_id;

      -- (b) Approval email via the send-claim-approval-email edge function,
      --     reusing the vault service-role-key + pg_net pattern from
      --     handle_facility_approval(). Best-effort: ownership has already
      --     transferred, so a missing pg_net extension or vault secret must
      --     never roll back the approval — log a NOTICE and continue.
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        SELECT decrypted_secret INTO v_functions_url
          FROM vault.decrypted_secrets WHERE name = 'functions_url' LIMIT 1;
        SELECT decrypted_secret INTO v_service_role_key
          FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
        IF v_functions_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
          PERFORM net.http_post(
            url := v_functions_url || '/send-claim-approval-email',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || v_service_role_key
            ),
            body := jsonb_build_object('claimRequestId', NEW.id),
            timeout_milliseconds := 5000
          );
        ELSE
          RAISE NOTICE 'Vault secrets missing — auto-approval email for claim % not dispatched', NEW.id;
        END IF;
      ELSE
        RAISE NOTICE 'pg_net not installed — auto-approval email for claim % not dispatched', NEW.id;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;
