-- Bridge the existing OTP / claim infrastructure into the new
-- two-axis verification engine landed in 20260803000000.
--
-- The existing functions (initiate-claim-sms-verification,
-- confirm-claim-verification-code, submit-facility-claim, etc.)
-- already write to:
--   * facility_claim_requests          — claim row, verification_status FSM
--   * phone_verification_codes         — SMS OTP for facility on-file phone
--   * email_verification_codes         — domain email OTP
--   * facility_credential_documents    — document-upload rung
--
-- Rather than ship parallel infrastructure, three triggers wire the
-- existing tables into the engine:
--
--   1. claim INSERT  → start_claim_verification(NEW.id)
--                      (legitimacy axis scores automatically at submit)
--   2. phone_verification_codes UPDATE (verified false→true)
--                    → record_ownership_signal(...,'sms_otp', 85)
--   3. email_verification_codes UPDATE (verified false→true)
--                    → record_ownership_signal(...,'domain_email', 80)
--   4. facility_credential_documents UPDATE (verified false→true)
--                    → record_ownership_signal(...,'document', 80)
--   5. claim UPDATE (verification_status → 'verified')
--                    → finalize_claim_decision(attempt_id)
--
-- HARD RULE per spec: OTP only on the authoritative on-file number.
-- The existing initiate-claim-sms-verification function pulls the
-- facility's stored phone from facilities.phone — we honor that
-- contract by NOT inspecting claimant-supplied data here.

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 1) Helper: find the active (non-cancelled, non-decided) attempt for a claim
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._active_attempt_for_claim(p_claim_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT id
  FROM public.verification_attempts
  WHERE claim_id = p_claim_id
    AND status IN ('scoring','ownership_in_progress')
  ORDER BY started_at DESC
  LIMIT 1;
$$;


-- ────────────────────────────────────────────────────────────────────
-- 2) Claim INSERT trigger — auto-start verification
-- ────────────────────────────────────────────────────────────────────
-- Runs synchronously inside the submit-facility-claim transaction.
-- Wraps in BEGIN/EXCEPTION so a scoring failure can NEVER block claim
-- submission — the engine writes its own signal noting the failure,
-- and the claim moves forward to manual review.
CREATE OR REPLACE FUNCTION public.claim_start_verification_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.start_claim_verification(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    -- Engine never blocks claim submission. Surface the failure as an
    -- admin notification instead so an operator notices the gap.
    INSERT INTO public.admin_notifications (type, title, message, metadata)
    VALUES (
      'verification_engine_error',
      'Verification engine failed at claim submit',
      format('Claim %s — start_claim_verification raised: %s', NEW.id, SQLERRM),
      jsonb_build_object('claim_id', NEW.id, 'error', SQLERRM, 'sqlstate', SQLSTATE)
    );
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS claim_start_verification ON public.facility_claim_requests;
CREATE TRIGGER claim_start_verification
  AFTER INSERT ON public.facility_claim_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.claim_start_verification_trg();


-- ────────────────────────────────────────────────────────────────────
-- 3) phone_verification_codes UPDATE trigger — record SMS OTP signal
-- ────────────────────────────────────────────────────────────────────
-- Fires only when `verified` flips false → true. Scores 85 (above the
-- 80 ownership_min_threshold) so a successful SMS OTP on the
-- authoritative phone is enough to unblock auto-approve once the
-- legitimacy axis cleared.
CREATE OR REPLACE FUNCTION public.phone_otp_bridge_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id uuid;
BEGIN
  IF NOT (OLD.verified = false AND NEW.verified = true) THEN
    RETURN NEW;
  END IF;
  IF NEW.claim_request_id IS NULL THEN
    RETURN NEW;
  END IF;
  v_attempt_id := public._active_attempt_for_claim(NEW.claim_request_id);
  IF v_attempt_id IS NULL THEN
    -- No active attempt — likely the engine hasn't been wired yet for
    -- this older claim; admin can manually start one if needed.
    RETURN NEW;
  END IF;
  PERFORM public.record_ownership_signal(
    v_attempt_id, 'sms_otp', true, 85.0,
    jsonb_build_array(jsonb_build_object(
      'rule','sms_otp_cleared',
      'detail','OTP cleared on authoritative facility phone (on file)'
    )),
    jsonb_build_object('phone_verification_code_id', NEW.id, 'phone', NEW.phone)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS phone_otp_bridge ON public.phone_verification_codes;
CREATE TRIGGER phone_otp_bridge
  AFTER UPDATE OF verified ON public.phone_verification_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.phone_otp_bridge_trg();


-- ────────────────────────────────────────────────────────────────────
-- 4) email_verification_codes UPDATE trigger — record domain email signal
-- ────────────────────────────────────────────────────────────────────
-- Domain email scores slightly lower (80) than phone OTP. It's still at
-- the ownership_min_threshold so a clean domain-email pass unblocks
-- auto-approve when legitimacy is high enough.
CREATE OR REPLACE FUNCTION public.email_otp_bridge_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id uuid;
BEGIN
  IF NOT (OLD.verified = false AND NEW.verified = true) THEN
    RETURN NEW;
  END IF;
  IF NEW.claim_request_id IS NULL THEN
    RETURN NEW;
  END IF;
  v_attempt_id := public._active_attempt_for_claim(NEW.claim_request_id);
  IF v_attempt_id IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM public.record_ownership_signal(
    v_attempt_id, 'domain_email', true, 80.0,
    jsonb_build_array(jsonb_build_object(
      'rule','domain_email_cleared',
      'detail','OTP cleared on facility domain email'
    )),
    jsonb_build_object('email_verification_code_id', NEW.id, 'email', NEW.email)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_otp_bridge ON public.email_verification_codes;
CREATE TRIGGER email_otp_bridge
  AFTER UPDATE OF verified ON public.email_verification_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.email_otp_bridge_trg();


-- ────────────────────────────────────────────────────────────────────
-- 5) facility_credential_documents UPDATE — record document signal
-- ────────────────────────────────────────────────────────────────────
-- A verified credential document (admin-reviewed) is the document rung
-- of the ownership ladder. Scored at 80 — at the threshold — because a
-- document alone is the weakest of the strong rungs (lower than a live
-- OTP); the engine still requires legitimacy axis to clear independently.
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='facility_credential_documents'
  ) THEN
    -- Check the table has the columns we need before wiring the trigger
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='facility_credential_documents'
        AND column_name IN ('verified','claim_request_id')
      GROUP BY 1 HAVING count(*) = 2
    ) THEN
      EXECUTE $body$
        CREATE OR REPLACE FUNCTION public.document_signal_bridge_trg()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $tfn$
        DECLARE
          v_attempt_id uuid;
        BEGIN
          IF NOT (COALESCE(OLD.verified,false) = false AND COALESCE(NEW.verified,false) = true) THEN
            RETURN NEW;
          END IF;
          IF NEW.claim_request_id IS NULL THEN
            RETURN NEW;
          END IF;
          v_attempt_id := public._active_attempt_for_claim(NEW.claim_request_id);
          IF v_attempt_id IS NULL THEN
            RETURN NEW;
          END IF;
          PERFORM public.record_ownership_signal(
            v_attempt_id, 'document', true, 80.0,
            jsonb_build_array(jsonb_build_object(
              'rule','document_verified',
              'detail','Admin-verified credential document on claim'
            )),
            jsonb_build_object('document_id', NEW.id)
          );
          RETURN NEW;
        END;
        $tfn$;
      $body$;
      EXECUTE 'DROP TRIGGER IF EXISTS document_signal_bridge ON public.facility_credential_documents';
      EXECUTE 'CREATE TRIGGER document_signal_bridge
        AFTER UPDATE OF verified ON public.facility_credential_documents
        FOR EACH ROW
        EXECUTE FUNCTION public.document_signal_bridge_trg()';
    END IF;
  END IF;
END$do$;


-- ────────────────────────────────────────────────────────────────────
-- 6) Claim verification_status → 'verified' trigger — finalize attempt
-- ────────────────────────────────────────────────────────────────────
-- Existing confirm-claim-verification-code flips
-- facility_claim_requests.verification_status='verified' as the final
-- step. We hook that to call finalize_claim_decision so the engine
-- combines both axes and decides auto-approve vs manual review. If the
-- engine returns 'auto_approved' the claim's status is already flipped
-- to 'approved' inside finalize_claim_decision (which then triggers
-- handle_claim_request_approval for the rest of the pipeline).
CREATE OR REPLACE FUNCTION public.claim_finalize_verification_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id uuid;
BEGIN
  IF NOT (NEW.verification_status = 'verified'
          AND COALESCE(OLD.verification_status,'') <> 'verified') THEN
    RETURN NEW;
  END IF;
  v_attempt_id := public._active_attempt_for_claim(NEW.id);
  IF v_attempt_id IS NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM public.finalize_claim_decision(v_attempt_id);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.admin_notifications (type, title, message, metadata)
    VALUES (
      'verification_engine_error',
      'finalize_claim_decision failed',
      format('Claim %s attempt %s — finalize raised: %s', NEW.id, v_attempt_id, SQLERRM),
      jsonb_build_object('claim_id', NEW.id, 'attempt_id', v_attempt_id, 'error', SQLERRM, 'sqlstate', SQLSTATE)
    );
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS claim_finalize_verification ON public.facility_claim_requests;
CREATE TRIGGER claim_finalize_verification
  AFTER UPDATE OF verification_status ON public.facility_claim_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.claim_finalize_verification_trg();


COMMIT;
