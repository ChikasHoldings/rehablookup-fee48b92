-- Vendor the handle_claim_request_approval() trigger that ships
-- approval side-effects: ownership transfer, provider_credits seed,
-- and materialization of pending_enrichments into the canonical
-- facility row + join tables (services, insurance, accreditations).
--
-- The trigger was authored directly on the live database during an
-- earlier phase and lived only there. Vendoring it makes the claim
-- completion path reproducible from a fresh DB.
--
-- Idempotent: CREATE OR REPLACE FUNCTION + trigger creation gated on
-- pg_trigger.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_claim_request_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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

    -- a) Transfer ownership
    UPDATE public.facilities
    SET user_id = NEW.claimant_user_id,
        claimed_at = COALESCE(claimed_at, now()),
        updated_at = now()
    WHERE id = NEW.facility_id;

    -- b) Initialize provider_credits for the new owner
    INSERT INTO public.provider_credits (provider_id, facility_id, balance_cents)
    VALUES (NEW.claimant_user_id, NEW.facility_id, 0)
    ON CONFLICT (provider_id) DO NOTHING;

    -- c) Materialize pending_enrichments
    v_enrich := COALESCE(NEW.pending_enrichments, '{}'::jsonb);

    IF v_enrich ? 'description' AND length(coalesce(v_enrich->>'description', '')) > 0 THEN
      UPDATE public.facilities
        SET description = v_enrich->>'description', updated_at = now()
        WHERE id = NEW.facility_id;
    END IF;

    -- Corrected contact (overwrites SAMHSA defaults where the
    -- claimant supplied a non-empty value).
    v_contact := v_enrich->'corrected_contact';
    IF v_contact IS NOT NULL THEN
      UPDATE public.facilities SET
        phone   = COALESCE(NULLIF(v_contact->>'phone', ''),   phone),
        email   = COALESCE(NULLIF(v_contact->>'email', ''),   email),
        website = COALESCE(NULLIF(v_contact->>'website', ''), website),
        updated_at = now()
      WHERE id = NEW.facility_id;
    END IF;

    -- Logo: enrichments stores the storage path; frontend resolves
    -- bare paths into public URLs from existing usage.
    IF v_enrich ? 'logo_path' AND length(coalesce(v_enrich->>'logo_path', '')) > 0 THEN
      v_new_logo_url := v_enrich->>'logo_path';
      UPDATE public.facilities SET logo_url = v_new_logo_url, updated_at = now()
        WHERE id = NEW.facility_id;
    END IF;

    -- Photos / gallery
    IF v_enrich ? 'photo_paths' AND jsonb_typeof(v_enrich->'photo_paths') = 'array' THEN
      v_gallery := ARRAY(SELECT jsonb_array_elements_text(v_enrich->'photo_paths'));
      IF array_length(v_gallery, 1) > 0 THEN
        UPDATE public.facilities SET gallery_urls = v_gallery, updated_at = now()
          WHERE id = NEW.facility_id;
      END IF;
    END IF;

    -- Services (insert any new ones; ignore duplicates)
    IF v_enrich ? 'services' AND jsonb_typeof(v_enrich->'services') = 'array' THEN
      FOR v_service IN SELECT jsonb_array_elements_text(v_enrich->'services') LOOP
        INSERT INTO public.facility_services (facility_id, service_name)
          VALUES (NEW.facility_id, lower(trim(v_service)))
          ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    -- Insurance
    IF v_enrich ? 'insurances' AND jsonb_typeof(v_enrich->'insurances') = 'array' THEN
      FOR v_insurance IN SELECT jsonb_array_elements_text(v_enrich->'insurances') LOOP
        INSERT INTO public.facility_insurance (facility_id, insurance_name)
          VALUES (NEW.facility_id, lower(trim(v_insurance)))
          ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    -- Accreditations (each row starts verified=false so admin still
    -- reviews each certificate individually via the existing UI).
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

    -- d) Auto-reject competing pending claims
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
$$;

COMMENT ON FUNCTION public.handle_claim_request_approval() IS
  'Approval-time side-effects for facility_claim_requests: transfers '
  'facility ownership, seeds provider_credits, and materializes the '
  'pending_enrichments jsonb (description, contact, logo, gallery, '
  'services, insurance, accreditations) into the canonical row + '
  'join tables.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_claim_request_approval'
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_claim_request_approval '
            'AFTER UPDATE OF status ON public.facility_claim_requests '
            'FOR EACH ROW EXECUTE FUNCTION public.handle_claim_request_approval()';
  END IF;
END $$;

COMMIT;
