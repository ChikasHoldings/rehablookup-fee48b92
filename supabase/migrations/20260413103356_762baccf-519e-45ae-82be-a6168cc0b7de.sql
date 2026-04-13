-- 1. Validate lead status transitions
CREATE OR REPLACE FUNCTION public.validate_lead_status_transition()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_allowed text[];
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'new' THEN
      v_allowed := ARRAY['contacted', 'unlocked', 'responding', 'closed', 'expired'];
    WHEN 'contacted' THEN
      v_allowed := ARRAY['responding', 'unlocked', 'closed', 'expired'];
    WHEN 'unlocked' THEN
      v_allowed := ARRAY['contacted', 'responding', 'closed'];
    WHEN 'responding' THEN
      v_allowed := ARRAY['closed'];
    WHEN 'closed' THEN
      v_allowed := ARRAY[]::text[];
    WHEN 'expired' THEN
      v_allowed := ARRAY['closed'];
    ELSE
      -- Unknown status, allow (forward compat)
      RETURN NEW;
  END CASE;

  IF NOT (NEW.status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid lead status transition: % → %. Allowed: %', OLD.status, NEW.status, array_to_string(v_allowed, ', ');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_lead_status ON public.leads;
CREATE TRIGGER trg_validate_lead_status
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lead_status_transition();

-- 2. Add ip_hash column to marketing_leads for rate limiting
ALTER TABLE public.marketing_leads ADD COLUMN IF NOT EXISTS ip_hash text;
CREATE INDEX IF NOT EXISTS idx_marketing_leads_ip_hash ON public.marketing_leads(ip_hash) WHERE ip_hash IS NOT NULL;

-- 3. Unique constraint on lead_unlocks to prevent duplicate unlocks at DB level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_unlocks_lead_facility_unique'
  ) THEN
    ALTER TABLE public.lead_unlocks ADD CONSTRAINT lead_unlocks_lead_facility_unique UNIQUE (lead_id, facility_id);
  END IF;
END$$;

-- 4. Prevent facility_id reassignment on leads after creation
CREATE OR REPLACE FUNCTION public.prevent_lead_facility_reassignment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Only enforce if facility_id is being changed (not nulled out for redistribution)
  IF OLD.facility_id IS NOT NULL AND NEW.facility_id IS NOT NULL AND OLD.facility_id != NEW.facility_id THEN
    RAISE EXCEPTION 'Cannot reassign a lead to a different facility. Lead % is assigned to facility %.', OLD.id, OLD.facility_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_lead_facility_reassignment ON public.leads;
CREATE TRIGGER trg_prevent_lead_facility_reassignment
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_lead_facility_reassignment();