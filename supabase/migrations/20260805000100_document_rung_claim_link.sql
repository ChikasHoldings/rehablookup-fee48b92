-- Activate the document rung of the ownership ladder.
--
-- The verification engine's document_signal_bridge_trg (from
-- 20260805000000) wires facility_credential_documents.verified flips
-- into record_ownership_signal(...,'document', 80.0). The bridge was
-- written with a conditional DO block that only created the trigger
-- if the table already had a claim_request_id column — at the time it
-- didn't, so the trigger stayed inert.
--
-- This migration adds the column + ensures the trigger lands.

BEGIN;

ALTER TABLE public.facility_credential_documents
  ADD COLUMN IF NOT EXISTS claim_request_id uuid REFERENCES public.facility_claim_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS facility_credential_documents_claim_idx
  ON public.facility_credential_documents (claim_request_id)
  WHERE claim_request_id IS NOT NULL;

-- The document table uses a `status` enum rather than a `verified`
-- boolean. The conditional bridge in 20260805000000 checked for a
-- `verified` column which doesn't exist on this table, so the trigger
-- was never installed. Re-wire here against the actual status column.
CREATE OR REPLACE FUNCTION public.document_signal_bridge_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id uuid;
BEGIN
  -- Fire only on status flips to 'verified' (admin marked the document
  -- legitimate). Other status values ('pending','rejected') are no-ops.
  IF NOT (COALESCE(NEW.status,'') = 'verified'
          AND COALESCE(OLD.status,'') <> 'verified') THEN
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
      'rule','document_admin_verified',
      'detail','Credential document admin-verified on claim'
    )),
    jsonb_build_object('document_id', NEW.id, 'document_type', NEW.document_type)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS document_signal_bridge ON public.facility_credential_documents;
CREATE TRIGGER document_signal_bridge
  AFTER UPDATE OF status ON public.facility_credential_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.document_signal_bridge_trg();

COMMIT;
