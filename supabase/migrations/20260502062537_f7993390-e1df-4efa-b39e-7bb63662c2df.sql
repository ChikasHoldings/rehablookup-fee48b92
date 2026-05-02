-- Auto-assign a random active advisor to new concierge inquiries
CREATE OR REPLACE FUNCTION public.auto_assign_advisor_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_advisor_id UUID;
BEGIN
  -- Only assign if not already set
  IF NEW.assigned_advisor_id IS NULL THEN
    SELECT user_id
      INTO v_advisor_id
      FROM public.admin_user_profiles
     WHERE admin_role = 'advisor'
       AND status = 'active'
     ORDER BY random()
     LIMIT 1;

    IF v_advisor_id IS NOT NULL THEN
      NEW.assigned_advisor_id := v_advisor_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_advisor_on_insert ON public.concierge_inquiries;
CREATE TRIGGER trg_auto_assign_advisor_on_insert
BEFORE INSERT ON public.concierge_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_advisor_on_insert();

-- Backfill any existing inquiries without an advisor
UPDATE public.concierge_inquiries ci
   SET assigned_advisor_id = sub.user_id
  FROM (
    SELECT user_id
      FROM public.admin_user_profiles
     WHERE admin_role = 'advisor'
       AND status = 'active'
     ORDER BY random()
     LIMIT 1
  ) sub
 WHERE ci.assigned_advisor_id IS NULL;