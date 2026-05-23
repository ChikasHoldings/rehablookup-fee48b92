-- Gate the `verified` badge on either (a) a successfully-approved claim
-- or (b) an admin-approved provider-listed facility. SAMHSA-imported
-- rows that nobody has claimed must not display the Verified pill.
--
-- Background: a legacy bulk-update set `facilities.verified = true` on
-- every SAMHSA-imported row (3,817 rows / 99.9% of the import set). The
-- index cards, profile hero, search results card, and admin export all
-- read the boolean directly and rendered the green Verified shield —
-- including on facilities that have never been claimed by their
-- operator, never gone through the provider claim flow, and never been
-- admin-reviewed.
--
-- The Verified pill is a trust signal: it says "we have evidence this
-- facility's listing represents the real operator." Showing it on
-- 3,800+ unclaimed rows is a substantive FTC concern — it's an implied
-- endorsement we have not earned. This migration:
--
--   1. Data cleanup. Set verified=false on every facility that was
--      SAMHSA-imported AND is still unclaimed (no user_id AND no
--      claimed_at). The two genuinely-claimed rows in the system
--      (data_source='self_listed', claimed) keep their verified=true.
--
--   2. Approval trigger. Extend handle_claim_request_approval() so
--      that when a claim is approved (path that already sets
--      facilities.user_id = claimant + claimed_at = now), we also
--      flip facilities.verified = true. Approval is precisely the
--      moment the badge has earned the right to show.
--
--   3. Future-proofing. Add a trigger on facilities BEFORE
--      INSERT/UPDATE that refuses to write verified=true on a row
--      that is neither claimed (user_id + claimed_at) nor an
--      admin-approved provider/self-listed/manual row. This keeps
--      a runaway bulk import or a hand-rolled service-role script
--      from re-introducing the bug. Admin UI toggling of `verified`
--      on a claimed-or-provider row is still allowed.
--
-- Idempotent: UPDATE is filtered, CREATE OR REPLACE FUNCTION + DROP
-- TRIGGER IF EXISTS / CREATE TRIGGER bracket the trigger swap.

BEGIN;

-- 1. Data cleanup — strip verified=true from unclaimed SAMHSA rows.
UPDATE public.facilities
SET verified = false,
    updated_at = now()
WHERE verified = true
  AND data_source = 'samhsa_import'
  AND claimed_at IS NULL
  AND user_id IS NULL;

-- 2. Re-create the claim-approval trigger to also stamp
--    facilities.verified = true. We replay the full function body
--    from migration 20260716000000 with a single added field in the
--    ownership UPDATE (verified = true). All other guards (H2/H3/H4)
--    + the M2 snapshot are preserved verbatim.
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

    -- H2: never approve a claim that has no claimant.
    IF NEW.claimant_user_id IS NULL THEN
      RAISE EXCEPTION
        'Cannot approve claim %: claimant_user_id is NULL. Approval '
        'would orphan facility %.', NEW.id, NEW.facility_id
        USING ERRCODE = 'check_violation';
    END IF;

    -- H3: require verification when verification_status was set.
    IF NEW.verification_status IS NOT NULL
       AND NEW.verification_status != 'verified' THEN
      RAISE EXCEPTION
        'Cannot approve claim %: verification_status is "%" (expected '
        '"verified" or NULL).', NEW.id, NEW.verification_status
        USING ERRCODE = 'check_violation';
    END IF;

    -- M2: snapshot pre-approval facility row.
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

    -- a) Transfer ownership + flip verified=true. The badge is now
    --    earned: an operator has identity-verified through the claim
    --    pipeline and admin has approved.
    UPDATE public.facilities
    SET user_id = NEW.claimant_user_id,
        claimed_at = COALESCE(claimed_at, now()),
        verified = true,
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

    -- d) Auto-reject competing pending claims
    UPDATE public.facility_claim_requests
    SET status = 'rejected',
        rejection_reason = 'Another claim was approved for this facility',
        reviewed_by = NEW.reviewed_by,
        reviewed_at = now()
    WHERE facility_id = NEW.facility_id
      AND id != NEW.id
      AND status IN ('pending', 'under_review');

    -- H4: queue admin notifications for auto-rejected competing claims.
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
  'Approval-time side-effects for facility_claim_requests v3: H2/H3 '
  'guards + M2 snapshot + H4 notifications (see migration 20260716). '
  'v3 (migration 20260720) adds: sets facilities.verified = true at '
  'ownership-transfer time so the Verified pill is gated on a '
  'completed, admin-approved claim — not on raw SAMHSA import state.';

-- 3. Defensive guard: refuse verified=true on a row that isn't either
--    claimed (user_id + claimed_at) or an admin-approved provider /
--    self-listed / manual / admin-created row. This stops a runaway
--    bulk import or a manual SQL slip from re-introducing the bug.
--    Admin UI flows (claim approval, provider approval, manual toggle
--    on a claimed row) all pass.
CREATE OR REPLACE FUNCTION public.enforce_facility_verified_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- We only gate transitions to verified=true. Setting verified=false
  -- is always allowed. Leaving verified unchanged is allowed.
  IF NEW.verified IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.verified = true THEN
    -- Already verified; this UPDATE isn't flipping the flag on. Let
    -- through (e.g., admin editing description on a claimed row).
    RETURN NEW;
  END IF;

  -- Acceptable verified=true conditions:
  --   (a) The row is claimed (a real operator owns it).
  --   (b) The row was admin-approved and originated from a provider
  --       sign-up / self-listing / manual entry / admin-created entry.
  --       SAMHSA-imported rows must clear (a) — being verified by an
  --       admin toggle alone is not enough; they need an actual claim.
  IF NEW.user_id IS NOT NULL AND NEW.claimed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved'
     AND NEW.data_source IN ('provider', 'self_listed', 'manual', 'admin_created') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Cannot set facilities.verified=true on facility %: row is not '
    'claimed (user_id=%, claimed_at=%) and is not an admin-approved '
    'provider/self-listed/manual entry (status=%, data_source=%). '
    'Claim approval or admin approval of a provider-listed facility '
    'is required first.',
    NEW.id, NEW.user_id, NEW.claimed_at, NEW.status, NEW.data_source
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS enforce_facility_verified_gate_trg ON public.facilities;
CREATE TRIGGER enforce_facility_verified_gate_trg
  BEFORE INSERT OR UPDATE OF verified, status, data_source, user_id, claimed_at
  ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_facility_verified_gate();

COMMENT ON FUNCTION public.enforce_facility_verified_gate() IS
  'Refuses any INSERT/UPDATE that would set facilities.verified=true '
  'on a row that is neither (a) claimed (user_id + claimed_at) nor '
  '(b) an admin-approved provider/self-listed/manual entry. Defends '
  'against bulk imports or service-role scripts re-introducing the '
  '"unclaimed SAMHSA shows Verified badge" bug fixed in migration '
  '20260720. Admin UI toggling of verified on a claimed row passes; '
  'claim-approval trigger passes; SAMHSA import (verified=false) '
  'passes.';

COMMIT;
