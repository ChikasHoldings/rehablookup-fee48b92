-- H1: Orphan leads cleanup + facility_id integrity hardening (corrected)
-- The leads_facility_id_fkey already exists with ON DELETE CASCADE.
-- We replace it with ON DELETE SET NULL + an auto-close trigger so lead
-- history survives facility deletion (instead of being silently destroyed).

-- 1) Close the orphan leads (2 rows with NULL facility_id)
UPDATE public.leads
SET status = 'closed'
WHERE facility_id IS NULL
  AND status <> 'closed';

-- 2) Notify admins of the historical orphans
INSERT INTO public.admin_notifications (type, title, message, metadata)
SELECT
  'orphaned_lead_closed',
  'Orphaned lead auto-closed',
  'Lead ' || id::text || ' had no facility_id and was auto-closed during data integrity hardening.',
  jsonb_build_object(
    'lead_id', id,
    'created_at', created_at,
    'reason', 'orphaned_facility'
  )
FROM public.leads
WHERE facility_id IS NULL;

-- 3) Replace the existing CASCADE FK with SET NULL so leads survive facility deletion
ALTER TABLE public.leads DROP CONSTRAINT leads_facility_id_fkey;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_facility_id_fkey
  FOREIGN KEY (facility_id)
  REFERENCES public.facilities(id)
  ON DELETE SET NULL;

-- 4) Auto-close trigger: when facility_id is nulled out (via FK SET NULL on facility delete)
CREATE OR REPLACE FUNCTION public.handle_lead_facility_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.facility_id IS NOT NULL AND NEW.facility_id IS NULL THEN
    NEW.status := 'closed';
    INSERT INTO public.admin_notifications (type, title, message, metadata)
    VALUES (
      'orphaned_lead_closed',
      'Lead auto-closed: facility deleted',
      'Lead ' || NEW.id::text || ' was auto-closed because its facility was deleted.',
      jsonb_build_object(
        'lead_id', NEW.id,
        'previous_facility_id', OLD.facility_id,
        'reason', 'facility_deleted'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_lead_facility_deleted ON public.leads;
CREATE TRIGGER trg_handle_lead_facility_deleted
  BEFORE UPDATE OF facility_id ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_lead_facility_deleted();

-- 5) Block new leads from being inserted with a NULL facility_id going forward
CREATE OR REPLACE FUNCTION public.require_facility_id_on_lead_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.facility_id IS NULL THEN
    RAISE EXCEPTION 'leads.facility_id is required on insert (lead origination policy)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_require_facility_id_on_lead_insert ON public.leads;
CREATE TRIGGER trg_require_facility_id_on_lead_insert
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.require_facility_id_on_lead_insert();