-- Harden the facility-claim approval pipeline with safety guards and a
-- facility-snapshot audit trail.
--
-- Background: the existing handle_claim_request_approval() trigger
-- (migration 20260530000000) fires whenever a claim row is updated to
-- status='approved'. The admin UI client-side gates that update on
-- verification_status='verified', but the DB trusts the caller — a
-- buggy code path, a manual SQL approval, or a service-role script
-- could bypass the verification gate or approve a row with a NULL
-- claimant_user_id, orphaning the facility.
--
-- This migration:
--   H2 — Refuses approval when claimant_user_id IS NULL (would
--        otherwise set facilities.user_id = NULL, orphaning).
--   H3 — Refuses approval when verification_status is set to anything
--        other than 'verified' (NULL is allowed for legacy modal-path
--        rows that predate verification_method).
--   M2 — Snapshots the facility's pre-approval state into the claim's
--        `previous_facility_snapshot` column before enrichments
--        overwrite it. Disputes about "the description / contact / logo
--        changed without my approval" can now be resolved by diffing
--        this column against the live row.
--   H4 — Queues an admin_notifications row for every competing claim
--        that the trigger auto-rejects, so the affected claimants
--        appear in the admin queue (and a follow-up rejection email
--        can be sent by the existing /admin/claims workflow).
--
-- Idempotent: ALTER TABLE ... ADD COLUMN IF NOT EXISTS for the new
-- column, CREATE OR REPLACE FUNCTION for the trigger body. Trigger
-- itself is unchanged — same name, same firing condition.

BEGIN;

-- M2: pre-approval snapshot column.
ALTER TABLE public.facility_claim_requests
  ADD COLUMN IF NOT EXISTS previous_facility_snapshot jsonb;

COMMENT ON COLUMN public.facility_claim_requests.previous_facility_snapshot IS
  'Snapshot of the facility row (description, contact fields, logo, '
  'gallery, etc.) taken at the moment the claim was approved, BEFORE '
  'any pending_enrichments materialized over it. Populated by '
  'handle_claim_request_approval(). Used for dispute resolution + '
  'admin audit when a claimant''s enrichments overwrote pre-existing '
  'data.';

-- Replace the trigger function with the hardened version.
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
  v_facility_snapshot jsonb;
  v_competing record;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

    -- H2: never approve a claim that has no claimant. The submit
    -- edge function extracts claimant_user_id from the JWT so the
    -- public path can't hit this, but a manual SQL insert / a
    -- service-role script could. Refuse rather than orphan the
    -- facility by setting user_id = NULL.
    IF NEW.claimant_user_id IS NULL THEN
      RAISE EXCEPTION
        'Cannot approve claim %: claimant_user_id is NULL. Approval '
        'would orphan facility %.', NEW.id, NEW.facility_id
        USING ERRCODE = 'check_violation';
    END IF;

    -- H3: require verification when verification_status was set.
    -- Legacy modal-path rows leave verification_status NULL (no
    -- explicit method was chosen); those are still admin-reviewable
    -- on the trust of the evidence_url / evidence_notes the claimant
    -- provided. New wizard-path rows set verification_method +
    -- verification_status, and those MUST be 'verified' before the
    -- ownership transfer can fire.
    IF NEW.verification_status IS NOT NULL
       AND NEW.verification_status != 'verified' THEN
      RAISE EXCEPTION
        'Cannot approve claim %: verification_status is "%" (expected '
        '"verified" or NULL).', NEW.id, NEW.verification_status
        USING ERRCODE = 'check_violation';
    END IF;

    -- M2: snapshot the canonical facility row + child rows so the
    -- enrichment materialization below can be audited / reversed.
    -- We grab the columns the trigger overwrites: description,
    -- phone/email/website, logo_url, gallery_urls. Service /
    -- insurance / accreditation join tables are appended-only via
    -- ON CONFLICT DO NOTHING, so they don't need snapshotting.
    SELECT jsonb_build_object(
        'description', description,
        'phone', phone,
        'email', email,
        'website', website,
        'logo_url', logo_url,
        'gallery_urls', gallery_urls,
        'snapshot_at', now()
      )
      INTO v_facility_snapshot
      FROM public.facilities
      WHERE id = NEW.facility_id;

    UPDATE public.facility_claim_requests
      SET previous_facility_snapshot = v_facility_snapshot
      WHERE id = NEW.id;

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

    -- H4: notify admin that competing claims were auto-rejected so a
    -- rejection email can be sent through the existing /admin/claims
    -- workflow. Previously the auto-reject was silent — affected
    -- claimants only learned of the outcome by visiting their
    -- /provider/claims page. Queueing into admin_notifications surfaces
    -- the action in the admin inbox and gives ops a hook for the
    -- follow-up "you were not approved" comm.
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

COMMENT ON FUNCTION public.handle_claim_request_approval() IS
  'Approval-time side-effects for facility_claim_requests v2: '
  'verifies claimant_user_id IS NOT NULL and verification_status is '
  'either NULL or "verified" before any writes; snapshots the pre-'
  'approval facility row into previous_facility_snapshot for audit; '
  'transfers ownership; seeds provider_credits; materializes the '
  'pending_enrichments jsonb (description, contact, logo, gallery, '
  'services, insurance, accreditations); auto-rejects competing '
  'pending claims and queues admin notifications for the follow-up '
  'rejection emails.';

COMMIT;
