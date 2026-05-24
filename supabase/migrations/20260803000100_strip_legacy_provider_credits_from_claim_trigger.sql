-- handle_claim_request_approval() carried a leftover INSERT into the
-- long-since-retired provider_credits table. Any claim flipping to
-- 'approved' (manual admin OR the new auto-approve path) errored with
-- 42P01 "relation public.provider_credits does not exist".
--
-- Strip the INSERT. The retired-credit-model cleanup
-- (20260517010300_retire_legacy_lead_unlock_credit_model) removed the
-- table; a later trigger respin reintroduced the reference. Same body
-- as today, INSERT block excised.

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

  END IF;

  RETURN NEW;
END;
$$;
